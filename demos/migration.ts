import { Database } from "bun:sqlite";
try { require("fs").unlinkSync("/tmp/m.db"); } catch {}
const db = new Database("/tmp/m.db");
const sql = (s: string) => { console.log(`  > ${s}`); db.run(s); };
const n = (t: string) => db.query(`SELECT COUNT(*) as n FROM ${t}`).get().n;

console.log("=== SQLite Migration Demo ===\n");
console.log("Creating schema with foreign key:\n");
sql("CREATE TABLE convos (id PRIMARY KEY, title)");
sql("CREATE TABLE msgs (id PRIMARY KEY, cid REFERENCES convos(id), txt)");
sql("INSERT INTO convos VALUES (1, 'My Chat')");
sql("INSERT INTO msgs (cid, txt) VALUES (1, 'Hello')");
sql("INSERT INTO msgs (cid, txt) VALUES (1, 'World')");

console.log(`\nInitial state: ${n("convos")} convo, ${n("msgs")} messages\n`);

console.log("--- Running migration to add 'created_at' column ---\n");
console.log("SQLite can't ALTER TABLE ADD COLUMN with constraints,");
console.log("so we: create new table → copy data → drop old → rename\n");

sql("CREATE TABLE convos_new (id PRIMARY KEY, title, created_at)");
console.log("  > INSERT INTO convos_new SELECT ... ");
console.log("    (imagine a bug or crash here - copy doesn't complete)\n");
sql("DROP TABLE convos");
sql("ALTER TABLE convos_new RENAME TO convos");

console.log(`\nFinal state: ${n("convos")} convos, ${n("msgs")} messages`);
console.log("\n⚠️  2 messages reference cid=1, but that row is gone!");
console.log("   SQLite raised no error. Data silently corrupted.\n");

for await (const _ of console) { break; }
