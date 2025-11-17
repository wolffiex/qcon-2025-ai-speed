// Demo: SQLite's surprising locking behavior
// Two transactions touch DIFFERENT rows but still conflict!

import { Database } from "bun:sqlite";
import { unlinkSync } from "fs";

const db_path = "/tmp/locking-demo.db";

// Clean up any existing db
try { unlinkSync(db_path); } catch {}

console.log("=== SQLite: Different Rows, Same Lock ===\n");

// Create database with two accounts
const setup = new Database(db_path);
setup.run("CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT, balance INTEGER)");
setup.run("INSERT INTO accounts VALUES (1, 'Alice', 100), (2, 'Bob', 100)");
setup.close();

// Open two connections (simulating two Claude Code instances)
const conn_a = new Database(db_path);
const conn_b = new Database(db_path);

// Set a short timeout so we see the failure quickly
conn_a.run("PRAGMA busy_timeout = 100");
conn_b.run("PRAGMA busy_timeout = 100");

// Both start transactions (default DEFERRED mode)
console.log("A: BEGIN");
conn_a.run("BEGIN");

console.log("B: BEGIN");
conn_b.run("BEGIN");

// Both read their respective rows - each gets a SHARED lock
const alice = conn_a.query("SELECT * FROM accounts WHERE id = 1").get() as any;
console.log(`A: SELECT Alice → balance=${alice.balance} (acquires SHARED lock)`);

const bob = conn_b.query("SELECT * FROM accounts WHERE id = 2").get() as any;
console.log(`B: SELECT Bob → balance=${bob.balance} (acquires SHARED lock)`);

console.log("\nNow both try to write (need to upgrade SHARED → RESERVED):\n");

// A tries to update Alice - needs to upgrade to RESERVED lock
// This succeeds because A can upgrade while B only has SHARED
console.log("A: UPDATE Alice SET balance=150");
conn_a.run("UPDATE accounts SET balance = 150 WHERE id = 1");
console.log("   ✓ Success (upgraded to RESERVED lock)\n");

// B tries to update Bob - but can't upgrade because A has RESERVED
// In PostgreSQL this would work fine (different rows!)
console.log("B: UPDATE Bob SET balance=150");
try {
  conn_b.run("UPDATE accounts SET balance = 150 WHERE id = 2");
  console.log("   ✓ Success");
} catch (e: any) {
  console.log("   ❌ SQLITE_BUSY: database is locked");
  console.log("   (Can't upgrade SHARED→RESERVED while A holds RESERVED)");
}

// B must rollback first - it's still holding SHARED lock!
console.log("B: ROLLBACK (transaction failed, must retry)");
conn_b.run("ROLLBACK");

// Now A can commit (needs EXCLUSIVE, which requires no SHARED locks)
console.log("\nA: COMMIT");
conn_a.run("COMMIT");
console.log("   ✓ Success");

console.log("─".repeat(50));
console.log("\n📊 Final state:");
const final = new Database(db_path);
for (const row of final.query("SELECT * FROM accounts").all() as any[]) {
  const status = row.id === 1 ? "✓ updated" : "✗ unchanged";
  console.log(`   ${row.name}: $${row.balance} ${status}`);
}
final.close();

conn_a.close();
conn_b.close();

for await (const _ of console) { break; }
