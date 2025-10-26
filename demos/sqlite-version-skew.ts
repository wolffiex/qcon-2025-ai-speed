// Demo: The Multiprocess Version Skew Problem

console.log("=== SQLite Multiprocess Irony ===\n");

console.log("🎯 Original Intent:\n");
console.log("  Database makes multiprocess SAFER:");
console.log("  • Transactions for consistency");
console.log("  • Locking for coordination");
console.log("  • ACID guarantees\n");

console.log("💡 The Vision:\n");
console.log("  Tool calls evolve → migrate schema");
console.log("  Example: BashTool changes structure");
console.log("  Database handles migration gracefully\n");

console.log("📅 The Scenario:\n");
console.log("  User has Claude Code running in multiple terminals");
console.log("  Auto-updater updates one instance");
console.log("  Now two versions running simultaneously\n");

console.log("🖥️  Terminal 1 (v1.5, schema v3):");
const schemaV3 = `
  CREATE TABLE tool_calls (
    id INTEGER PRIMARY KEY,
    tool_name TEXT,
    parameters TEXT  -- Simple TEXT field
  );
`;
console.log(schemaV3);

console.log("🖥️  Terminal 2 (v1.6, schema v4) - Auto-updated:");
const schemaV4 = `
  CREATE TABLE tool_calls (
    id INTEGER PRIMARY KEY,
    tool_name TEXT,
    parameters TEXT,
    metadata JSON,      -- NEW FIELD
    version INTEGER     -- NEW FIELD
  );
`;
console.log(schemaV4);

console.log("💥 What Happens:\n");

const timeline = [
  {
    time: "T+0",
    actor: "Terminal 2 (v1.6)",
    action: "Runs migration, adds new columns",
    result: "✓ Schema now v4"
  },
  {
    time: "T+1",
    actor: "Terminal 2 (v1.6)",
    action: "Writes tool call with new fields",
    result: "✓ Works fine (knows about new fields)"
  },
  {
    time: "T+2",
    actor: "Terminal 1 (v1.5)",
    action: "Tries to read tool calls",
    result: "💀 CRASHES - unexpected columns!"
  },
  {
    time: "T+3",
    actor: "Terminal 1 (v1.5)",
    action: "User tries to continue work",
    result: "❌ Database unavailable"
  }
];

timeline.forEach(({ time, actor, action, result }) => {
  console.log(`  ${time}:`);
  console.log(`    ${actor}`);
  console.log(`    ${action}`);
  console.log(`    → ${result}\n`);
});

console.log("🔄 The Version Skew Problem:\n");
console.log("  • Auto-updater runs in background");
console.log("  • Updates one terminal, not others");
console.log("  • Each version expects different schema");
console.log("  • No coordination between processes");
console.log("  • Database becomes corruption risk\n");

console.log("🤔 What About Tool Call Migrations?\n");

const toolCallExample = {
  tool: "BashTool",
  parameters: {
    command: "ls -la",
    timeout: 30000,
    // How do you schematize THIS?
    // Tools are dynamic, parameters vary wildly
    // Model can send anything in parameters
  }
};

console.log(JSON.stringify(toolCallExample, null, 2));

console.log("\n  The deeper problem:");
console.log("  • Tool calls are too dynamic for rigid schema");
console.log("  • Each tool has different parameter structure");
console.log("  • Model can send unexpected fields");
console.log("  • Hard to write migrations for dynamic data\n");

console.log("  We never even got to implement migrations!");
console.log("  Too hard to schematize in the first place.\n");

console.log("😬 From Slack (@lev's observation):\n");
console.log('  "When I saw the multiprocess issue, I asked Lev to');
console.log('   consider using the db. He pointed out tricky gotchas');
console.log('   with SQLite and went with better-lockfile instead."\n');

console.log("  Even colleagues avoided it for multiprocess needs!\n");

console.log("🎯 The Irony:\n");
console.log("  Intended: Database solves multiprocess coordination");
console.log("  Reality:  Database IS the multiprocess problem\n");

console.log("  From Slack:");
console.log('  "The biggest multiprocess problems we\'ve had stem');
console.log('   from the database itself."\n');

console.log("💡 What Actually Worked: Simple Files\n");

const simpleApproach = {
  storage: "JSONL files per session",
  schema: "None - just serialize what model sends",
  migration: "Not needed - data is already JSON",
  multiprocess: "Each session has own file (no shared state)",
  version_skew: "Not a problem - no schema to conflict"
};

Object.entries(simpleApproach).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

console.log("\n🤔 How Could We Have Known?\n");

const questions = [
  "Can we actually schematize tool calls? (Try it first)",
  "What happens with version skew? (Think through scenario)",
  "Do we need migrations? (Talk to users about tool evolution)",
  "What are second-order effects? (Red team the decision)"
];

questions.forEach((q, i) => {
  console.log(`  ${i + 1}. ${q}`);
});

console.log("\n📚 The Lesson:");
console.log("  • First-order: Database → migrations → schema evolution");
console.log("  • Second-order: Version skew → crashes → danger");
console.log("  • Gap: Intent (migrations) vs Reality (never got there)");
console.log("\n  AI implements fast → ship before seeing second-order effects");
