#!/usr/bin/env bun
/**
 * Demo: SQLite Multiprocess Weird Behaviors
 *
 * Shows the surprising and problematic behaviors when using SQLite
 * with multiple processes, which led to its removal from Claude Code.
 *
 * Three demonstrations:
 * 1. Database-level locking (reads blocked by writes)
 * 2. Version skew causing crashes
 * 3. The coordination irony
 */

import { Database } from "bun:sqlite";
import { rmSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

const DB_PATH = "/tmp/multiprocess-demo.db";
const DEMO_PATH = "/tmp/multiprocess-demo-helper.ts";

console.log("🔀 SQLite Multiprocess Weird Behaviors Demo\n");
console.log("=".repeat(70));

// ============================================================================
// DEMO 1: Database-Level Locking (The Unexpected Behavior)
// ============================================================================

console.log("\n📝 DEMO 1: Database-Level Locking");
console.log("-".repeat(70));

console.log("\n💭 Common assumption:");
console.log("   'SQLite has table/row locking like other databases'");
console.log("\n❌ Reality:");
console.log("   'SQLite locks the ENTIRE DATABASE for writes'");

// Clean up
try {
  rmSync(DB_PATH);
} catch {}

const db1 = new Database(DB_PATH);
db1.exec("PRAGMA foreign_keys = ON");

// Create a simple schema
db1.exec(`
  CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);

// Insert some data
const insert = db1.prepare("INSERT INTO messages (content, timestamp) VALUES (?, ?)");
for (let i = 1; i <= 5; i++) {
  insert.run(`Message ${i}`, Date.now());
}

console.log("\n✅ Created database with 5 messages");

// Start a write transaction
console.log("\n🔒 Process 1: Starting EXCLUSIVE transaction (simulating a write)...");
db1.exec("BEGIN EXCLUSIVE");
console.log("   Transaction started (database is now LOCKED)");

// Try to read from another connection
console.log("\n📖 Process 2: Trying to read messages...");
try {
  const db2 = new Database(DB_PATH);
  db2.exec("PRAGMA busy_timeout = 1000"); // Wait 1 second max

  const messages = db2.query("SELECT COUNT(*) as count FROM messages").get();
  console.log(`   ✅ Read succeeded: ${(messages as any).count} messages`);
  db2.close();
} catch (error) {
  console.log(`   ❌ Read FAILED: ${error}`);
  console.log("   Even though we're just reading!");
}

// Rollback the transaction
db1.exec("ROLLBACK");
console.log("\n🔓 Process 1: Transaction rolled back (database unlocked)");

// Now try reading again
console.log("\n📖 Process 2: Trying to read again...");
const db2_retry = new Database(DB_PATH);
const messages = db2_retry.query("SELECT COUNT(*) as count FROM messages").get();
console.log(`   ✅ Read succeeded: ${(messages as any).count} messages`);
db2_retry.close();

console.log("\n📊 Key insight:");
console.log("   • SQLite uses database-level locking, not row/table locking");
console.log("   • EXCLUSIVE lock blocks ALL operations, even reads");
console.log("   • Most developers expect row/table-level locking");
console.log("   • This causes surprising failures in production");

db1.close();

// ============================================================================
// DEMO 2: Version Skew (The Killer Issue)
// ============================================================================

console.log("\n\n📝 DEMO 2: Version Skew");
console.log("-".repeat(70));

console.log("\n🎯 Scenario: Auto-updater updates one terminal, not others");

// Clean up and create v1 schema
try {
  rmSync(DB_PATH);
} catch {}

const db_v1 = new Database(DB_PATH);

console.log("\n1️⃣ Terminal 1: Creates database with schema v1");
db_v1.exec(`
  CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
  INSERT INTO schema_version VALUES (1);

  CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL
  );
`);

db_v1.exec("INSERT INTO conversations (content) VALUES ('Hello from v1')");
console.log("   ✅ Schema v1: conversations(id, content)");
console.log("   ✅ Inserted: 'Hello from v1'");

db_v1.close();

// Simulate Terminal 2 getting auto-updated
console.log("\n2️⃣ Terminal 2: Auto-updated to new version, runs migration");
const db_v2 = new Database(DB_PATH);

// Check current schema version
const current_version = db_v2.query("SELECT version FROM schema_version").get() as { version: number };
console.log(`   Current schema version: ${current_version.version}`);

if (current_version.version === 1) {
  console.log("   🔄 Running migration to v2...");

  // Migration adds new required fields
  db_v2.exec(`
    BEGIN TRANSACTION;

    -- Add new fields to conversations
    ALTER TABLE conversations ADD COLUMN session_id TEXT NOT NULL DEFAULT 'unknown';
    ALTER TABLE conversations ADD COLUMN metadata TEXT;

    -- Update version
    UPDATE schema_version SET version = 2;

    COMMIT;
  `);

  console.log("   ✅ Migrated to schema v2: conversations(id, content, session_id, metadata)");
}

// Terminal 2 writes with new schema
db_v2.exec(`
  INSERT INTO conversations (content, session_id, metadata)
  VALUES ('Hello from v2', 'session-123', '{"user": "alice"}')
`);
console.log("   ✅ Inserted: 'Hello from v2' with session_id and metadata");

db_v2.close();

// Terminal 1 (still running v1) tries to read
console.log("\n3️⃣ Terminal 1: Still running v1, tries to read conversations");
console.log("   (App code expects old schema: id, content)");

const db_v1_again = new Database(DB_PATH);

try {
  // v1 code expects only 2 columns
  const conversations = db_v1_again.query(`
    SELECT id, content FROM conversations
  `).all();

  console.log(`   ✅ Read ${conversations.length} conversations`);
  console.log("\n   🤔 Wait, that worked?");
  console.log("   SQLite is lenient - SELECT specific columns works!");
  console.log("   But SELECT * would return unexpected columns...");

  // Try SELECT *
  console.log("\n   Trying SELECT * (what ORM might do):");
  const all_cols = db_v1_again.query("SELECT * FROM conversations").all();
  console.log(`   ✅ Got ${all_cols.length} rows with ${Object.keys(all_cols[0] as object).length} columns`);
  console.log("   Columns:", Object.keys(all_cols[0] as object).join(", "));

  console.log("\n   💥 Problem: App crashes when it sees unexpected columns!");
  console.log("   • TypeScript types don't match");
  console.log("   • ORM validation fails");
  console.log("   • Code assumes 2 columns, gets 4");

} catch (error) {
  console.log(`   ❌ Read failed: ${error}`);
}

db_v1_again.close();

console.log("\n📊 The version skew problem:");
console.log("   • Auto-updater updates one process, not others");
console.log("   • Each version expects different schema");
console.log("   • Newer version writes data old version can't handle");
console.log("   • Old version crashes or behaves incorrectly");
console.log("   • No coordination between processes");

// ============================================================================
// DEMO 3: The Coordination Irony
// ============================================================================

console.log("\n\n📝 DEMO 3: The Coordination Irony");
console.log("-".repeat(70));

console.log("\n💭 Original intent:");
console.log("   'Use SQLite to coordinate multiple processes safely'");
console.log("   • Transactions for consistency");
console.log("   • Locking for coordination");
console.log("   • ACID guarantees");

console.log("\n💥 What actually happened:");
console.log("   'SQLite became the SOURCE of multiprocess problems'");

console.log("\n🔍 Let's demonstrate a coordination failure:");

// Clean up
try {
  rmSync(DB_PATH);
} catch {}

const db_coord = new Database(DB_PATH);
db_coord.exec(`
  CREATE TABLE active_sessions (
    session_id TEXT PRIMARY KEY,
    process_id INTEGER NOT NULL,
    last_active INTEGER NOT NULL
  )
`);

// Process 1 registers
const process1_id = process.pid;
db_coord.exec(`
  INSERT INTO active_sessions (session_id, process_id, last_active)
  VALUES ('session-1', ${process1_id}, ${Date.now()})
`);

console.log(`\n   Process ${process1_id}: Registered session-1`);

// Check if anyone else is active
const active = db_coord.query("SELECT COUNT(*) as count FROM active_sessions").get() as { count: number };
console.log(`   Active sessions: ${active.count}`);

console.log("\n   ❌ But this doesn't actually help with coordination!");
console.log("\n   Problems:");
console.log("   1. Stale data: Process crashed, didn't clean up entry");
console.log("   2. Race conditions: Two processes check simultaneously");
console.log("   3. No real-time signaling: Can't notify other processes");
console.log("   4. Version skew: Processes have different schema expectations");

db_coord.close();

console.log("\n🤦 What Claude Code's team actually used for coordination:");
console.log("   'better-lockfile' - a simple file-based lock");
console.log("\n   From Slack:");
console.log("   'When I asked Lev to use the database for multiprocess,");
console.log("    he pointed out tricky gotchas and used better-lockfile instead'");

console.log("\n💡 The irony:");
console.log("   SQLite was supposed to SOLVE multiprocess coordination");
console.log("   Instead, it BECAME the multiprocess problem");

// ============================================================================
// DEMO 4: What Actually Happens in Production
// ============================================================================

console.log("\n\n📝 DEMO 4: What Actually Happened in Claude Code");
console.log("-".repeat(70));

console.log("\n📅 Timeline of multiprocess issues:");

const issues = [
  {
    day: "Day 1",
    issue: "Launch with database storage",
    impact: "🟢 Working"
  },
  {
    day: "Day 1 (hours later)",
    issue: "Emergency revert - file path issues",
    impact: "🔴 Database broken"
  },
  {
    day: "Day 1 (evening)",
    issue: "Re-merged after fix",
    impact: "🟢 Working again"
  },
  {
    day: "Day 7",
    issue: "Users report install failures (native deps)",
    impact: "🟡 Some users can't use app"
  },
  {
    day: "Day 9",
    issue: "Made database 'gracefully optional'",
    impact: "🟡 Core features disabled if DB fails"
  },
  {
    day: "Day 10",
    issue: "Added Doctor warnings for DB issues",
    impact: "🟡 Acknowledging the problem"
  },
  {
    day: "Day 15",
    issue: "Removed SQLite entirely",
    impact: "🟢 Back to simple JSONL files"
  }
];

issues.forEach(({ day, issue, impact }) => {
  console.log(`\n   ${day}:`);
  console.log(`   ${issue}`);
  console.log(`   → ${impact}`);
});

console.log("\n\n📊 The multiprocess problems that emerged:");
console.log("   1. ❌ Database-level locking blocks concurrent operations");
console.log("   2. ❌ Version skew from auto-updates");
console.log("   3. ❌ Native dependency install failures");
console.log("   4. ❌ Migration complexity and data loss");
console.log("   5. ❌ No actual coordination benefits");

console.log("\n✅ What replaced it (277 lines of JSONL):");
console.log("   • Each session = separate file");
console.log("   • No shared state between processes");
console.log("   • No schema to migrate");
console.log("   • No locking issues");
console.log("   • No version skew");
console.log("   • Works everywhere (no native deps)");

// ============================================================================
// CONCLUSION
// ============================================================================

console.log("\n\n" + "=".repeat(70));
console.log("📚 Key Lessons");
console.log("=".repeat(70));

console.log("\n1. ⚠️  SQLite's locking behavior surprises developers");
console.log("   Database-level locks block ALL operations, not just writes");

console.log("\n2. 🚨 Version skew is a real problem with auto-updates");
console.log("   Multiple processes with different schema expectations");

console.log("\n3. 💡 Intended solution became the problem");
console.log("   Database for coordination → Database IS the problem");

console.log("\n4. 🎯 Context matters:");
console.log("   • Financial app: Database is right (consistency > availability)");
console.log("   • AI CLI tool: Simple files are right (availability > consistency)");

console.log("\n5. 🔍 Second-order effects are hard to predict:");
console.log("   • First-order: Database → better data management");
console.log("   • Second-order: Version skew → crashes → removed in 15 days");

console.log("\n💭 From the presentation:");
console.log('   "The biggest multiprocess problems we\'ve had stem from');
console.log('    the database itself."');

console.log("\n🎓 The takeaway:");
console.log("   AI made implementation fast (database in hours)");
console.log("   But couldn't predict second-order effects (version skew)");
console.log("   Judgment to recognize wrong direction: 15 days to removal");
console.log();

// Clean up
try {
  rmSync(DB_PATH);
} catch {}
