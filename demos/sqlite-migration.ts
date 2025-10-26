// Demo: The Foreign Key Migration Disaster

console.log("=== SQLite Migration Nightmare ===\n");

console.log("📅 April 24, 2025: Initial Schema\n");

const originalSchema = `
CREATE TABLE base_messages (
  uuid TEXT PRIMARY KEY,
  parent_uuid TEXT,
  session_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  type TEXT NOT NULL,

  -- THE MISTAKE: Missing ON DELETE CASCADE
  FOREIGN KEY (parent_uuid) REFERENCES base_messages(uuid)
);

CREATE TABLE user_messages (
  uuid TEXT PRIMARY KEY REFERENCES base_messages(uuid),
  message TEXT NOT NULL
);

CREATE TABLE assistant_messages (
  uuid TEXT PRIMARY KEY REFERENCES base_messages(uuid),
  cost_usd REAL NOT NULL,
  message TEXT NOT NULL
);
`;

console.log(originalSchema);

console.log("\n❌ The Problem Discovered:\n");
console.log("  When deleting a parent message:");
console.log("  • Children aren't automatically deleted");
console.log("  • Foreign key constraints violated");
console.log("  • Orphaned records in database\n");

console.log("💡 The Fix Needed:\n");

const fixedSchema = `
  -- Need to add ON DELETE CASCADE
  FOREIGN KEY (parent_uuid)
    REFERENCES base_messages(uuid)
    ON DELETE CASCADE  -- ← This!
`;

console.log(fixedSchema);

console.log("\n🔧 The Migration Attempt:\n");

const migrationCode = `
-- SQLite doesn't support ALTER CONSTRAINT
-- Have to recreate the entire table!

-- Step 1: Create new table with correct constraints
CREATE TABLE base_messages_new (
  uuid TEXT PRIMARY KEY,
  parent_uuid TEXT,
  ...
  FOREIGN KEY (parent_uuid)
    REFERENCES base_messages_new(uuid)
    ON DELETE CASCADE  -- Fixed!
);

-- Step 2: Copy data from old table
INSERT INTO base_messages_new SELECT * FROM base_messages;

-- Step 3: Drop old table
DROP TABLE base_messages;

-- Step 4: Rename new table
ALTER TABLE base_messages_new RENAME TO base_messages;

-- Step 5: Recreate all child tables (user_messages, assistant_messages)
-- They reference base_messages, so they break when we drop it!
`;

console.log(migrationCode);

console.log("\n💥 What Went Wrong:\n");
console.log("  • Data loss occurred (exact reason unclear)");
console.log("  • Foreign key references broke during migration");
console.log("  • Child tables had to be recreated");
console.log("  • Complex DAG structure of messages made it fragile\n");

console.log("📝 From the Slack Post:\n");
console.log('  "When I originally specified the foreign key constraints');
console.log('   on the table inheritance for messages, I forgot to set');
console.log('   ON DELETE CASCADE. I tried to write a migration to do');
console.log('   this, but it resulted in data loss for reasons I still');
console.log('   don\'t totally understand."\n');

console.log("⚠️  The Meta-Problem:\n");
console.log("  With AI speed, you:");
console.log("  • Ship the initial schema quickly");
console.log("  • Miss the ON DELETE CASCADE");
console.log("  • Discover it in production");
console.log("  • Try to fix it with migration");
console.log("  • Cause data loss");
console.log("\n  Fast iteration → fast mistakes → hard recovery\n");

console.log("🎯 What SQLite Requires:\n");
console.log("  ✓ Careful upfront schema design");
console.log("  ✓ Hard to change constraints later");
console.log("  ✓ Complex migrations for simple changes");
console.log("  ✓ Testing migrations on production-like data");
console.log("\n  ← All the things AI velocity encourages you to skip!\n");

console.log("💡 What Actually Worked: Simple JSONL Files");
console.log("  • No schema to get wrong");
console.log("  • No migrations needed");
console.log("  • Easy to fix: just edit the JSON");
console.log("  • Fast iteration without consequences");
