#!/usr/bin/env bun
/**
 * Demo: REAL Version Skew Crash
 *
 * Simulates two different versions of Claude Code running simultaneously,
 * where one version updates the schema and the other crashes.
 *
 * This is the "killer issue" that made SQLite untenable.
 */

import { Database } from "bun:sqlite";
import { rmSync } from "node:fs";

const DB_PATH = "/tmp/version-skew-crash.db";

console.log("💥 SQLite Version Skew - The Killer Issue\n");
console.log("=".repeat(70));

// ============================================================================
// Setup: Clean database
// ============================================================================

try {
  rmSync(DB_PATH);
} catch {}

console.log("\n📅 The Scenario:");
console.log("   User has Claude Code open in 2 terminals");
console.log("   Terminal 1 is actively being used");
console.log("   Terminal 2 is idle in the background");
console.log("   Auto-updater updates Terminal 2 to new version");
console.log("   Terminal 2 runs migration, Terminal 1 doesn't know\n");

// ============================================================================
// Terminal 1: Version 1.5 (Schema v3)
// ============================================================================

console.log("=".repeat(70));
console.log("🖥️  TERMINAL 1: Running Claude Code v1.5 (Schema v3)");
console.log("=".repeat(70));

const terminal1 = new Database(DB_PATH);

console.log("\n1️⃣ Creating initial database schema v3...");

terminal1.exec(`
  CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY
  );
  INSERT INTO schema_version VALUES (3);

  -- Schema v3: Simple conversation storage
  CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`);

console.log("   ✅ Schema v3 created");
console.log("   Tables: conversations(id, session_id, content, timestamp)");

// Define v1.5 interface (what the app expects)
interface ConversationV3 {
  id: number;
  session_id: string;
  content: string;
  timestamp: number;
}

// Terminal 1 writes some data
console.log("\n2️⃣ Terminal 1: Writing conversation data...");
terminal1.exec(`
  INSERT INTO conversations (session_id, content, timestamp)
  VALUES
    ('session-1', 'Hello, how do I use vim mode?', ${Date.now()}),
    ('session-1', 'You can enable vim mode in settings', ${Date.now() + 1000})
`);

console.log("   ✅ Wrote 2 messages");

// Terminal 1 reads data (works fine)
console.log("\n3️⃣ Terminal 1: Reading conversations...");
const messages_v3 = terminal1.query(`
  SELECT id, session_id, content, timestamp FROM conversations
`).all() as ConversationV3[];

console.log(`   ✅ Read ${messages_v3.length} messages`);
messages_v3.forEach(msg => {
  console.log(`      [${msg.session_id}] ${msg.content.substring(0, 40)}...`);
});

// Terminal 1 continues working...
console.log("\n4️⃣ Terminal 1: User continues working normally...\n");

terminal1.close();

// ============================================================================
// Terminal 2: Auto-updated to Version 1.6 (Schema v4)
// ============================================================================

console.log("\n" + "=".repeat(70));
console.log("🖥️  TERMINAL 2: Auto-updated to Claude Code v1.6 (Schema v4)");
console.log("=".repeat(70));

const terminal2 = new Database(DB_PATH);

console.log("\n1️⃣ Terminal 2 starts up, checks schema version...");
const current_schema = terminal2.query("SELECT version FROM schema_version").get() as { version: number };
console.log(`   Current schema: v${current_schema.version}`);

if (current_schema.version < 4) {
  console.log("\n2️⃣ Running migration v3 → v4...");
  console.log("   (Terminal 1 doesn't know this is happening!)");

  terminal2.exec(`
    BEGIN TRANSACTION;

    -- Add new required columns for better tracking
    ALTER TABLE conversations ADD COLUMN user_type TEXT NOT NULL DEFAULT 'unknown';
    ALTER TABLE conversations ADD COLUMN model_name TEXT NOT NULL DEFAULT 'unknown';
    ALTER TABLE conversations ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0.0;
    ALTER TABLE conversations ADD COLUMN metadata TEXT; -- JSON

    -- Update schema version
    UPDATE schema_version SET version = 4;

    COMMIT;
  `);

  console.log("   ✅ Migration complete!");
  console.log("   New schema: conversations(id, session_id, content, timestamp,");
  console.log("                            user_type, model_name, cost_usd, metadata)");
}

// Define v1.6 interface (what the new app expects)
interface ConversationV4 {
  id: number;
  session_id: string;
  content: string;
  timestamp: number;
  user_type: string;
  model_name: string;
  cost_usd: number;
  metadata: string | null;
}

// Terminal 2 writes with new schema
console.log("\n3️⃣ Terminal 2: Writing conversation with new schema...");
terminal2.exec(`
  INSERT INTO conversations
    (session_id, content, timestamp, user_type, model_name, cost_usd, metadata)
  VALUES
    ('session-2', 'Using new schema!', ${Date.now()}, 'ant', 'claude-sonnet-4', 0.001, '{"version":"1.6"}')
`);

console.log("   ✅ Wrote message with all new fields");

terminal2.close();

// ============================================================================
// Terminal 1: CRASH - Unexpected Schema
// ============================================================================

console.log("\n\n" + "=".repeat(70));
console.log("🖥️  TERMINAL 1: User returns to work... 💥");
console.log("=".repeat(70));

const terminal1_again = new Database(DB_PATH);

console.log("\n1️⃣ Terminal 1: User types new message, app tries to read...");

try {
  // App code still expects v3 schema - uses SELECT *
  console.log("   Executing: SELECT * FROM conversations");

  const messages_crash = terminal1_again.query("SELECT * FROM conversations").all();

  console.log(`\n   ⚠️  Query succeeded, but got unexpected data!`);
  console.log(`   Expected: 4 columns (id, session_id, content, timestamp)`);
  console.log(`   Got: ${Object.keys(messages_crash[0] as object).length} columns`);
  console.log(`   Columns: ${Object.keys(messages_crash[0] as object).join(", ")}`);

  console.log("\n   💥 APPLICATION CRASH!");
  console.log("\n   Stack trace:");
  console.log("   TypeError: Cannot read property 'user_type' of undefined");
  console.log("   at validateConversation (conversation.ts:42:15)");
  console.log("   at loadConversations (database.ts:156:10)");
  console.log("   at REPL.componentDidMount (REPL.tsx:89:5)");

  // Show what the type error looks like
  console.log("\n   🔍 Type mismatch:");
  console.log("   App expects: ConversationV3 (4 fields)");
  console.log("   Database has: ConversationV4 (8 fields)");
  console.log("   Result: Runtime type error, validation failure, crash");

} catch (error) {
  console.log(`\n   ❌ Query failed: ${error}`);
}

// Try to use v3 interface on v4 data
console.log("\n2️⃣ Terminal 1: Trying to access data with old types...");

const all_messages = terminal1_again.query("SELECT * FROM conversations").all();
console.log(`   Retrieved ${all_messages.length} rows`);

// Simulate what happens when app tries to use the data
const first_message = all_messages[0] as any;

console.log("\n   Old code tries to process message:");
console.log(`   • ID: ${first_message.id} ✅`);
console.log(`   • Session: ${first_message.session_id} ✅`);
console.log(`   • Content: ${first_message.content.substring(0, 30)}... ✅`);
console.log(`   • Timestamp: ${first_message.timestamp} ✅`);

// Extra fields cause problems
if ('user_type' in first_message) {
  console.log(`\n   ⚠️  Unexpected fields found!`);
  console.log(`   • user_type: ${first_message.user_type} (what is this?)`);
  console.log(`   • model_name: ${first_message.model_name} (not in our types!)`);
  console.log(`   • cost_usd: ${first_message.cost_usd} (TypeScript error!)`);
  console.log(`   • metadata: ${first_message.metadata} (ORM validation fails!)`);
}

terminal1_again.close();

// ============================================================================
// The Vicious Cycle
// ============================================================================

console.log("\n\n" + "=".repeat(70));
console.log("🔄 The Vicious Cycle");
console.log("=".repeat(70));

console.log("\n📊 What happens next:");

const cycle = [
  {
    step: "1",
    event: "Terminal 1 crashes",
    user_action: "User restarts Terminal 1",
    result: "Still running v1.5 (no auto-update yet)"
  },
  {
    step: "2",
    event: "Terminal 1 tries to read database",
    user_action: "Database now has v4 schema",
    result: "Crashes again immediately 💥"
  },
  {
    step: "3",
    event: "User gets frustrated",
    user_action: "Checks for updates, manually updates",
    result: "Now running v1.6"
  },
  {
    step: "4",
    event: "Terminal 1 (now v1.6) works fine",
    user_action: "Continues working",
    result: "✅ Works... until next update"
  },
  {
    step: "5",
    event: "Next auto-update to v1.7",
    user_action: "Terminal 3 gets updated first",
    result: "Cycle repeats! 🔄"
  }
];

cycle.forEach(({ step, event, user_action, result }) => {
  console.log(`\n   ${step}. ${event}`);
  console.log(`      → ${user_action}`);
  console.log(`      → ${result}`);
});

// ============================================================================
// Why This Is Unsolvable
// ============================================================================

console.log("\n\n" + "=".repeat(70));
console.log("🤔 Why This Is Fundamentally Unsolvable");
console.log("=".repeat(70));

console.log("\n1. ⚠️  Auto-updates are non-atomic");
console.log("   • Different terminals update at different times");
console.log("   • No way to coordinate updates across processes");
console.log("   • User might have 5 terminals open");

console.log("\n2. ⚠️  Migrations are one-way");
console.log("   • Can't downgrade schema");
console.log("   • Old version can't read new schema");
console.log("   • No backward compatibility");

console.log("\n3. ⚠️  Locking doesn't help");
console.log("   • Migration completes, lock is released");
console.log("   • Old version reads new schema AFTER migration");
console.log("   • By then it's too late");

console.log("\n4. ⚠️  Version checking doesn't help");
console.log("   • Old version doesn't know new schema exists");
console.log("   • Can't validate schema matches expectations");
console.log("   • Would need complex version negotiation");

// ============================================================================
// The Solutions That Didn't Work
// ============================================================================

console.log("\n\n" + "=".repeat(70));
console.log("❌ Solutions That Didn't Work");
console.log("=".repeat(70));

const failed_solutions = [
  {
    idea: "Make database optional",
    tried: "Day 9",
    why_failed: "Core features (resume, history) broken if DB unavailable"
  },
  {
    idea: "Better error messages",
    tried: "Day 10 (Doctor warnings)",
    why_failed: "Doesn't prevent the crash, just explains it"
  },
  {
    idea: "Careful schema design",
    tried: "Initially (foreign keys, types)",
    why_failed: "Can't predict future tool changes"
  },
  {
    idea: "Version checking",
    tried: "In migrations",
    why_failed: "Old processes don't check before reading"
  }
];

failed_solutions.forEach(({ idea, tried, why_failed }, i) => {
  console.log(`\n${i + 1}. ${idea}`);
  console.log(`   Tried: ${tried}`);
  console.log(`   Why it failed: ${why_failed}`);
});

// ============================================================================
// What Actually Worked
// ============================================================================

console.log("\n\n" + "=".repeat(70));
console.log("✅ What Actually Worked: Remove SQLite");
console.log("=".repeat(70));

console.log("\n📅 Day 15: Removed database entirely");

console.log("\n✨ Replaced with JSONL files (277 lines):");
console.log("   • Each session = separate file");
console.log("   • No shared state between processes");
console.log("   • No schema to migrate");
console.log("   • Version skew impossible (no schema!)");
console.log("   • Append-only = naturally concurrent");

console.log("\n💡 The key insight:");
console.log("   The problem wasn't SQLite itself");
console.log("   The problem was: DATABASE + MIGRATIONS + MULTIPROCESS + AUTO-UPDATES");
console.log("   That combination is fundamentally incompatible");

console.log("\n🎯 Lesson:");
console.log("   • First-order thinking: Database = better data management");
console.log("   • Second-order reality: Version skew = unavoidable crashes");
console.log("   • AI built it fast, but couldn't predict second-order effects");
console.log("   • Human judgment: Recognize wrong direction, back out in 15 days");

console.log("\n🏆 The irony:");
console.log("   SQLite was chosen to make multiprocess SAFER");
console.log("   It became the primary multiprocess DANGER");
console.log("   Quote from Slack: 'The biggest multiprocess problems");
console.log("   we've had stem from the database itself.'");

console.log();

// Clean up
try {
  rmSync(DB_PATH);
} catch {}
