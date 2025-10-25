// Demo: SQLite's surprising locking behavior

console.log("=== SQLite Locking Issues ===\n");

// Simulate the locking problem
class SQLiteMock {
  private writeLock = false;

  async write(query: string) {
    console.log(`[Writer] Acquiring write lock...`);
    this.writeLock = true;
    console.log(`[Writer] Executing: ${query}`);

    // Simulate slow write
    await new Promise(resolve => setTimeout(resolve, 2000));

    this.writeLock = false;
    console.log(`[Writer] Write complete, lock released`);
  }

  async read(query: string) {
    if (this.writeLock) {
      console.log(`[Reader] ❌ SQLITE_BUSY: database is locked`);
      throw new Error("SQLITE_BUSY: database is locked");
    }
    console.log(`[Reader] ✓ Executing: ${query}`);
    return [{ id: 1, content: "data" }];
  }
}

const db = new SQLiteMock();

console.log("Scenario: One process writing, another tries to read\n");

// Start a write operation
const writeOp = db.write("INSERT INTO messages (content) VALUES ('Hello')");

// Try to read while write is in progress
setTimeout(async () => {
  try {
    await db.read("SELECT * FROM messages");
  } catch (e) {
    console.log(`[Reader] Error caught: ${e}`);
  }
}, 500);

await writeOp;

console.log("\n💡 Expected: Row-level or table-level locking");
console.log("💡 Reality: Database-level locking throws on conflict");
console.log("\nFor Claude Code: Availability > Consistency");
console.log("Crashing on read is unacceptable!");
