import { Database } from "bun:sqlite";
try { require("fs").unlinkSync("/tmp/skew.db"); } catch {}
const sql = (db: Database, s: string) => { console.log(`  > ${s}`); db.run(s); };

console.log("=== Version Skew Demo ===\n");

console.log("Terminal 1 (v1.5): Creates database\n");
const v1 = new Database("/tmp/skew.db");
sql(v1, "CREATE TABLE convos (id INTEGER PRIMARY KEY, title TEXT)");
sql(v1, "INSERT INTO convos (title) VALUES ('Project')");
sql(v1, "INSERT INTO convos (title) VALUES ('Bug report')");

console.log("\nTerminal 2 (v1.6): Auto-updates, adds soft-delete\n");
const v2 = new Database("/tmp/skew.db");
sql(v2, "ALTER TABLE convos ADD COLUMN deleted_at TEXT");

console.log("\n  User soft-deletes 'Bug report' in v1.6:\n");
sql(v2, "UPDATE convos SET deleted_at = datetime('now') WHERE id = 2");

const visible = v2.query("SELECT title FROM convos WHERE deleted_at IS NULL").all();
console.log(`\n  v1.6 shows: ${visible.map((c: any) => c.title).join(', ')}\n`);

console.log("Terminal 1 (v1.5): User edits 'Bug report'\n");
sql(v1, "INSERT OR REPLACE INTO convos (id, title) VALUES (2, 'Bug (edited)')");

console.log("\nv1.6 checks data:");
for (const c of v2.query("SELECT * FROM convos").all() as any[]) {
  console.log(`  id=${c.id}, title="${c.title}", deleted_at=${c.deleted_at}`);
}

console.log("\n⚠️  v1.5's REPLACE wiped deleted_at - delete action undone!\n");

v1.close(); v2.close();
for await (const _ of console) { break; }
