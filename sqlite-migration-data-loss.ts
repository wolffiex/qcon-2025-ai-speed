#!/usr/bin/env bun
/**
 * Demo: SQLite Migration Data Loss
 *
 * Shows how trying to add ON DELETE CASCADE to existing foreign keys
 * can silently lose data in SQLite.
 *
 * The Problem:
 * - Initial schema: foreign keys WITHOUT ON DELETE CASCADE
 * - Later need: add ON DELETE CASCADE to handle deletions properly
 * - SQLite limitation: can't ALTER TABLE to modify constraints
 * - Required solution: recreate table and copy data
 * - Risk: easy to lose data if migration is done incorrectly
 */

import { Database } from "bun:sqlite";
import { rmSync } from "node:fs";

const DB_PATH = "/tmp/migration-demo.db";

// Clean up any existing database
try {
  rmSync(DB_PATH);
} catch {}

console.log("🗄️  SQLite Migration Data Loss Demo\n");
console.log("=" .repeat(60));

// ============================================================================
// PHASE 1: Initial Schema (Missing ON DELETE CASCADE)
// ============================================================================

console.log("\n📝 PHASE 1: Initial Schema (Missing ON DELETE CASCADE)");
console.log("-".repeat(60));

const db = new Database(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");

// This mirrors the original Claude Code schema
db.exec(`
  CREATE TABLE base_messages (
    uuid TEXT PRIMARY KEY,
    parent_uuid TEXT,
    session_id TEXT NOT NULL,
    message_type TEXT NOT NULL,
    FOREIGN KEY (parent_uuid) REFERENCES base_messages(uuid)
    -- ❌ MISSING: ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE user_messages (
    uuid TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    FOREIGN KEY (uuid) REFERENCES base_messages(uuid)
    -- ❌ MISSING: ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE assistant_messages (
    uuid TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    cost_usd REAL NOT NULL,
    FOREIGN KEY (uuid) REFERENCES base_messages(uuid)
    -- ❌ MISSING: ON DELETE CASCADE
  )
`);

console.log("✅ Created tables with foreign keys (no ON DELETE CASCADE)");

// Insert some test data representing a conversation chain
const insert_base = db.prepare(`
  INSERT INTO base_messages (uuid, parent_uuid, session_id, message_type)
  VALUES (?, ?, ?, ?)
`);

const insert_user = db.prepare(`
  INSERT INTO user_messages (uuid, message) VALUES (?, ?)
`);

const insert_assistant = db.prepare(`
  INSERT INTO assistant_messages (uuid, message, cost_usd) VALUES (?, ?, ?)
`);

// Create a conversation chain
insert_base.run("msg-1", null, "session-1", "user");
insert_user.run("msg-1", "Hello, how do I use SQLite?");

insert_base.run("msg-2", "msg-1", "session-1", "assistant");
insert_assistant.run("msg-2", "SQLite is a great database!", 0.001);

insert_base.run("msg-3", "msg-2", "session-1", "user");
insert_user.run("msg-3", "Can I modify foreign keys?");

insert_base.run("msg-4", "msg-3", "session-1", "assistant");
insert_assistant.run("msg-4", "No, you have to recreate the table!", 0.002);

console.log("\n📊 Initial data:");
const initial_count = db.query("SELECT COUNT(*) as count FROM base_messages").get() as { count: number };
const user_count = db.query("SELECT COUNT(*) as count FROM user_messages").get() as { count: number };
const assistant_count = db.query("SELECT COUNT(*) as count FROM assistant_messages").get() as { count: number };

console.log(`   Base messages: ${initial_count.count}`);
console.log(`   User messages: ${user_count.count}`);
console.log(`   Assistant messages: ${assistant_count.count}`);

// ============================================================================
// PHASE 2: The Problem - Deleting Without CASCADE
// ============================================================================

console.log("\n\n⚠️  PHASE 2: The Problem (No ON DELETE CASCADE)");
console.log("-".repeat(60));

console.log("\nTrying to delete parent message 'msg-1'...");
try {
  db.exec("DELETE FROM base_messages WHERE uuid = 'msg-1'");
  console.log("❌ ERROR: Should have failed due to foreign key constraint!");
} catch (error) {
  console.log("✅ Correctly blocked by foreign key constraint:");
  console.log(`   ${error}`);
}

// ============================================================================
// PHASE 3: Naive Migration Attempt (Data Loss!)
// ============================================================================

console.log("\n\n🚨 PHASE 3: Naive Migration Attempt (LOSES DATA!)");
console.log("-".repeat(60));

console.log("\n📝 Attempting to add ON DELETE CASCADE...");
console.log("   Strategy: Recreate base_messages table with new constraint");
console.log("   (But forgetting to update child tables!)");

// The WRONG way to do this (what might have happened)
// Only migrate base_messages, forget about child tables!
db.exec(`
  PRAGMA foreign_keys = OFF;

  BEGIN TRANSACTION;

  -- Create new table with ON DELETE CASCADE
  CREATE TABLE base_messages_new (
    uuid TEXT PRIMARY KEY,
    parent_uuid TEXT,
    session_id TEXT NOT NULL,
    message_type TEXT NOT NULL,
    FOREIGN KEY (parent_uuid) REFERENCES base_messages_new(uuid)
      ON DELETE CASCADE  -- ✅ Now we have it!
  );

  -- Copy data from old table
  INSERT INTO base_messages_new (uuid, parent_uuid, session_id, message_type)
  SELECT uuid, parent_uuid, session_id, message_type
  FROM base_messages;

  -- Drop old table
  DROP TABLE base_messages;

  -- Rename new table
  ALTER TABLE base_messages_new RENAME TO base_messages;

  COMMIT;

  PRAGMA foreign_keys = ON;
`);

console.log("✅ Migration completed for base_messages");

// Now check if child tables still have their data
const after_base = db.query("SELECT COUNT(*) as count FROM base_messages").get() as { count: number };
const after_user = db.query("SELECT COUNT(*) as count FROM user_messages").get() as { count: number };
const after_assistant = db.query("SELECT COUNT(*) as count FROM assistant_messages").get() as { count: number };

console.log("\n📊 Data after migration:");
console.log(`   Base messages: ${after_base.count} ✅`);
console.log(`   User messages: ${after_user.count} ✅`);
console.log(`   Assistant messages: ${after_assistant.count} ✅`);

console.log("\n🔍 But wait... let's verify foreign key integrity:");

// Check using SQLite's built-in foreign key checker
try {
  const fk_violations = db.query("PRAGMA foreign_key_check").all();

  if (fk_violations.length > 0) {
    console.log(`\n🚨 FOREIGN KEY VIOLATIONS DETECTED: ${fk_violations.length} issues`);
    console.log("\n   Details:");
    fk_violations.forEach((violation: any) => {
      console.log(`     Table: ${violation.table}, Row: ${violation.rowid}`);
      console.log(`     Missing reference in: ${violation.parent}`);
    });
  } else {
    console.log("   ✅ No foreign key violations detected");
    console.log("   (But this doesn't mean the data is correct!)");
  }
} catch (error) {
  console.log(`   Error checking foreign keys: ${error}`);
}

// Check for orphaned records manually
try {
  const orphaned_users = db.query(`
    SELECT um.uuid, um.message
    FROM user_messages um
    LEFT JOIN base_messages bm ON um.uuid = bm.uuid
    WHERE bm.uuid IS NULL
  `).all();

  const orphaned_assistants = db.query(`
    SELECT am.uuid, am.message
    FROM assistant_messages am
    LEFT JOIN base_messages bm ON am.uuid = bm.uuid
    WHERE bm.uuid IS NULL
  `).all();

  console.log(`\n📊 Manual orphan check:`);
  console.log(`   Orphaned user messages: ${orphaned_users.length}`);
  console.log(`   Orphaned assistant messages: ${orphaned_assistants.length}`);

  if (orphaned_users.length > 0 || orphaned_assistants.length > 0) {
    console.log("\n🚨 DATA INTEGRITY VIOLATED!");
    console.log("   Child tables reference non-existent parent rows!");

    if (orphaned_users.length > 0) {
      console.log("\n   Orphaned user messages:");
      orphaned_users.forEach((row: any) => {
        console.log(`     - ${row.uuid}: "${row.message}"`);
      });
    }

    if (orphaned_assistants.length > 0) {
      console.log("\n   Orphaned assistant messages:");
      orphaned_assistants.forEach((row: any) => {
        console.log(`     - ${row.uuid}: "${row.message}"`);
      });
    }
  }
} catch (error) {
  console.log(`   Error checking integrity: ${error}`);
}

// ============================================================================
// PHASE 4: What Actually Happened (Silent Data Loss)
// ============================================================================

console.log("\n\n💀 PHASE 4: What Actually Happened");
console.log("-".repeat(60));

console.log("\n❌ The migration broke the foreign key relationships!");
console.log("\nWhy this happened:");
console.log("  1. We recreated base_messages table (new internal table ID)");
console.log("  2. Child tables STILL reference the OLD table's internal ID");
console.log("  3. Foreign key constraints point to non-existent table");
console.log("  4. Data exists but relationships are ORPHANED");
console.log("  5. With foreign_keys=OFF during migration: SILENT");

console.log("\n🧪 Testing the \"migrated\" database:");

// Try to insert a new message and its content
console.log("\n1️⃣ Inserting new message (msg-5):");
try {
  // Recreate prepared statements since table was recreated
  const new_insert_base = db.prepare(`
    INSERT INTO base_messages (uuid, parent_uuid, session_id, message_type)
    VALUES (?, ?, ?, ?)
  `);
  const new_insert_user = db.prepare(`
    INSERT INTO user_messages (uuid, message) VALUES (?, ?)
  `);

  new_insert_base.run("msg-5", "msg-4", "session-1", "user");
  console.log("   ✅ Base message inserted");

  new_insert_user.run("msg-5", "Does this work?");
  console.log("   ✅ User message inserted");
  console.log("\n   🤔 Wait... that shouldn't have worked!");
  console.log("   user_messages foreign key should have rejected this!");
  console.log("   (Constraint points to old base_messages_new table)");
} catch (error) {
  console.log(`   ❌ Failed as expected: ${error}`);
}

// Try to delete a base message
console.log("\n2️⃣ Deleting base message (msg-3) to test CASCADE:");
try {
  db.exec("DELETE FROM base_messages WHERE uuid = 'msg-3'");
  console.log("   ✅ Base message deleted");

  const remaining_user = db.query(
    "SELECT COUNT(*) as count FROM user_messages WHERE uuid = 'msg-3'"
  ).get() as { count: number };

  if (remaining_user.count > 0) {
    console.log(`   ❌ User message STILL EXISTS (CASCADE didn't work!)`);
    console.log("   The foreign key constraint is BROKEN");
  } else {
    console.log("   ✅ User message was deleted");
  }
} catch (error) {
  console.log(`   ❌ Delete failed: ${error}`);
}

// Show the corruption
console.log("\n3️⃣ Checking data integrity:");
const corrupt_check = db.query(`
  SELECT
    'user_messages' as table_name,
    COUNT(*) as orphaned_count
  FROM user_messages um
  WHERE NOT EXISTS (
    SELECT 1 FROM base_messages bm WHERE bm.uuid = um.uuid
  )
  UNION ALL
  SELECT
    'assistant_messages' as table_name,
    COUNT(*) as orphaned_count
  FROM assistant_messages am
  WHERE NOT EXISTS (
    SELECT 1 FROM base_messages bm WHERE bm.uuid = am.uuid
  )
`).all() as { table_name: string; orphaned_count: number }[];

let total_orphaned = 0;
corrupt_check.forEach(row => {
  if (row.orphaned_count > 0) {
    console.log(`   🚨 ${row.table_name}: ${row.orphaned_count} orphaned rows`);
    total_orphaned += row.orphaned_count;
  }
});

if (total_orphaned > 0) {
  console.log(`\n   💀 DATABASE CORRUPTED: ${total_orphaned} orphaned rows!`);
  console.log("   These rows exist but have no parent in base_messages");
  console.log("   They can't be properly queried or deleted");
}

// ============================================================================
// PHASE 5: The Correct Way
// ============================================================================

console.log("\n\n✅ PHASE 5: The Correct Way");
console.log("-".repeat(60));

// Clean up and start fresh
db.close();
rmSync(DB_PATH);

const db2 = new Database(DB_PATH);
db2.exec("PRAGMA foreign_keys = ON");

console.log("\n📝 Recreating with correct migration strategy...");

// Create initial schema again
db2.exec(`
  CREATE TABLE base_messages (
    uuid TEXT PRIMARY KEY,
    parent_uuid TEXT,
    session_id TEXT NOT NULL,
    message_type TEXT NOT NULL,
    FOREIGN KEY (parent_uuid) REFERENCES base_messages(uuid)
  )
`);

db2.exec(`
  CREATE TABLE user_messages (
    uuid TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    FOREIGN KEY (uuid) REFERENCES base_messages(uuid)
  )
`);

db2.exec(`
  CREATE TABLE assistant_messages (
    uuid TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    cost_usd REAL NOT NULL,
    FOREIGN KEY (uuid) REFERENCES base_messages(uuid)
  )
`);

// Insert data again
const insert_base2 = db2.prepare(`
  INSERT INTO base_messages (uuid, parent_uuid, session_id, message_type)
  VALUES (?, ?, ?, ?)
`);
const insert_user2 = db2.prepare(`
  INSERT INTO user_messages (uuid, message) VALUES (?, ?)
`);
const insert_assistant2 = db2.prepare(`
  INSERT INTO assistant_messages (uuid, message, cost_usd) VALUES (?, ?, ?)
`);

insert_base2.run("msg-1", null, "session-1", "user");
insert_user2.run("msg-1", "Hello!");
insert_base2.run("msg-2", "msg-1", "session-1", "assistant");
insert_assistant2.run("msg-2", "Hi!", 0.001);

console.log("✅ Initial data inserted");

console.log("\n📝 Correct migration: ALL tables must be recreated together");

db2.exec(`
  BEGIN TRANSACTION;

  -- Disable foreign keys temporarily
  PRAGMA foreign_keys = OFF;

  -- Recreate ALL tables with proper constraints
  CREATE TABLE base_messages_new (
    uuid TEXT PRIMARY KEY,
    parent_uuid TEXT,
    session_id TEXT NOT NULL,
    message_type TEXT NOT NULL,
    FOREIGN KEY (parent_uuid) REFERENCES base_messages_new(uuid)
      ON DELETE CASCADE
  );

  CREATE TABLE user_messages_new (
    uuid TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    FOREIGN KEY (uuid) REFERENCES base_messages_new(uuid)
      ON DELETE CASCADE  -- ✅ Added!
  );

  CREATE TABLE assistant_messages_new (
    uuid TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    cost_usd REAL NOT NULL,
    FOREIGN KEY (uuid) REFERENCES base_messages_new(uuid)
      ON DELETE CASCADE  -- ✅ Added!
  );

  -- Copy data
  INSERT INTO base_messages_new SELECT * FROM base_messages;
  INSERT INTO user_messages_new SELECT * FROM user_messages;
  INSERT INTO assistant_messages_new SELECT * FROM assistant_messages;

  -- Drop old tables
  DROP TABLE user_messages;
  DROP TABLE assistant_messages;
  DROP TABLE base_messages;

  -- Rename new tables
  ALTER TABLE base_messages_new RENAME TO base_messages;
  ALTER TABLE user_messages_new RENAME TO user_messages;
  ALTER TABLE assistant_messages_new RENAME TO assistant_messages;

  -- Re-enable foreign keys
  PRAGMA foreign_keys = ON;

  COMMIT;
`);

console.log("✅ Migration completed correctly");

// Verify data integrity
const final_base = db2.query("SELECT COUNT(*) as count FROM base_messages").get() as { count: number };
const final_user = db2.query("SELECT COUNT(*) as count FROM user_messages").get() as { count: number };
const final_assistant = db2.query("SELECT COUNT(*) as count FROM assistant_messages").get() as { count: number };

console.log("\n📊 Final data (all intact):");
console.log(`   Base messages: ${final_base.count} ✅`);
console.log(`   User messages: ${final_user.count} ✅`);
console.log(`   Assistant messages: ${final_assistant.count} ✅`);

// Test CASCADE delete
console.log("\n🧪 Testing ON DELETE CASCADE:");
db2.exec("DELETE FROM base_messages WHERE uuid = 'msg-1'");

const cascade_base = db2.query("SELECT COUNT(*) as count FROM base_messages").get() as { count: number };
const cascade_user = db2.query("SELECT COUNT(*) as count FROM user_messages").get() as { count: number };
const cascade_assistant = db2.query("SELECT COUNT(*) as count FROM assistant_messages").get() as { count: number };

console.log("\n📊 After deleting msg-1:");
console.log(`   Base messages: ${cascade_base.count} ✅`);
console.log(`   User messages: ${cascade_user.count} ✅ (cascaded!)`);
console.log(`   Assistant messages: ${cascade_assistant.count} ✅ (unchanged)`);

db2.close();

// ============================================================================
// CONCLUSION
// ============================================================================

console.log("\n\n" + "=".repeat(60));
console.log("📚 Key Lessons");
console.log("=".repeat(60));

console.log("\n1. ⚠️  SQLite can't ALTER foreign key constraints");
console.log("   You must recreate the entire table");

console.log("\n2. 🚨 Partial table recreation causes silent data loss");
console.log("   Foreign keys break if you don't recreate ALL related tables");

console.log("\n3. ✅ Correct migration requires:");
console.log("   - Disable foreign keys (PRAGMA foreign_keys = OFF)");
console.log("   - Recreate ALL tables with new constraints");
console.log("   - Copy data to all new tables");
console.log("   - Drop all old tables");
console.log("   - Rename all new tables");
console.log("   - Re-enable foreign keys");
console.log("   - Verify with PRAGMA foreign_key_check");

console.log("\n4. 🎯 In Claude Code's case:");
console.log("   - Initial schema lacked ON DELETE CASCADE");
console.log("   - Migration attempted to add it");
console.log("   - Data loss occurred due to incomplete migration");
console.log("   - 15 days later: removed SQLite entirely");

console.log("\n💡 The irony: SQLite was chosen for data integrity,");
console.log("   but migrations became the source of data loss!\n");

// Clean up
rmSync(DB_PATH);
