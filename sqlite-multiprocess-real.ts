#!/usr/bin/env bun
/**
 * Demo: REAL SQLite Multiprocess Contention
 *
 * Actually spawns multiple processes to show real-world locking issues
 * and performance degradation with SQLite under concurrent load.
 *
 * This simulates what Claude Code experienced with multiple terminals open.
 */

import { Database } from "bun:sqlite";
import { rmSync } from "node:fs";
import { spawn } from "bun";

const DB_PATH = "/tmp/multiprocess-real.db";

// ============================================================================
// Worker Process (spawned multiple times)
// ============================================================================

async function worker(worker_id: number, num_operations: number, use_wal: boolean) {
  const db = new Database(DB_PATH);

  if (use_wal) {
    db.exec("PRAGMA journal_mode = WAL");
  }

  db.exec("PRAGMA busy_timeout = 5000"); // Wait up to 5 seconds for lock

  const stats = {
    successful_reads: 0,
    successful_writes: 0,
    failed_operations: 0,
    total_wait_time: 0
  };

  for (let i = 0; i < num_operations; i++) {
    const is_write = Math.random() < 0.5; // 50% writes, 50% reads

    const start = Date.now();

    try {
      if (is_write) {
        // Write operation
        db.exec(`
          INSERT INTO messages (worker_id, content, timestamp)
          VALUES (${worker_id}, 'Message ${i} from worker ${worker_id}', ${Date.now()})
        `);
        stats.successful_writes++;
      } else {
        // Read operation
        const result = db.query("SELECT COUNT(*) as count FROM messages").get();
        stats.successful_reads++;
      }
    } catch (error: any) {
      stats.failed_operations++;
      if (error.message?.includes("locked")) {
        // Even with busy_timeout, we got locked out
      }
    }

    const wait_time = Date.now() - start;
    stats.total_wait_time += wait_time;

    // Small delay between operations
    await Bun.sleep(10);
  }

  db.close();

  return stats;
}

// ============================================================================
// Main Demo
// ============================================================================

if (process.argv.includes("--worker")) {
  // Worker mode
  const worker_id = parseInt(process.argv[3]);
  const num_operations = parseInt(process.argv[4]);
  const use_wal = process.argv[5] === "true";

  const stats = await worker(worker_id, num_operations, use_wal);
  console.log(JSON.stringify(stats));
  process.exit(0);
}

// Coordinator mode
console.log("🏃 SQLite REAL Multiprocess Contention Demo\n");
console.log("=".repeat(70));

async function run_benchmark(name: string, num_workers: number, ops_per_worker: number, use_wal: boolean) {
  console.log(`\n📊 ${name}`);
  console.log("-".repeat(70));

  // Clean up and create database
  try {
    rmSync(DB_PATH);
    rmSync(`${DB_PATH}-shm`);
    rmSync(`${DB_PATH}-wal`);
  } catch {}

  const db = new Database(DB_PATH);

  if (use_wal) {
    db.exec("PRAGMA journal_mode = WAL");
    console.log("✅ Enabled WAL mode");
  } else {
    console.log("📝 Using default rollback journal mode");
  }

  db.exec(`
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);

  db.close();

  console.log(`\n🚀 Spawning ${num_workers} worker processes...`);
  console.log(`   Each will perform ${ops_per_worker} operations (50% read, 50% write)`);

  const start_time = Date.now();

  // Spawn worker processes
  const workers = [];
  for (let i = 0; i < num_workers; i++) {
    const proc = spawn({
      cmd: ["bun", "sqlite-multiprocess-real.ts", "--worker", i.toString(), ops_per_worker.toString(), use_wal.toString()],
      stdout: "pipe",
      stderr: "pipe"
    });

    workers.push({
      id: i,
      proc,
      stdout: "",
      stderr: ""
    });
  }

  // Collect output
  const results = await Promise.all(workers.map(async ({ proc, id }) => {
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    try {
      return JSON.parse(stdout);
    } catch {
      console.error(`Worker ${id} failed:`, stderr);
      return null;
    }
  }));

  const duration = Date.now() - start_time;

  // Aggregate statistics
  const totals = results.reduce((acc, stats) => {
    if (!stats) return acc;

    return {
      successful_reads: acc.successful_reads + stats.successful_reads,
      successful_writes: acc.successful_writes + stats.successful_writes,
      failed_operations: acc.failed_operations + stats.failed_operations,
      total_wait_time: acc.total_wait_time + stats.total_wait_time
    };
  }, {
    successful_reads: 0,
    successful_writes: 0,
    failed_operations: 0,
    total_wait_time: 0
  });

  const total_ops = totals.successful_reads + totals.successful_writes + totals.failed_operations;
  const success_rate = ((totals.successful_reads + totals.successful_writes) / total_ops * 100).toFixed(1);
  const avg_wait_time = (totals.total_wait_time / total_ops).toFixed(1);

  console.log(`\n⏱️  Completed in ${(duration / 1000).toFixed(2)}s`);
  console.log(`\n📈 Results:`);
  console.log(`   Total operations: ${total_ops}`);
  console.log(`   ✅ Successful reads: ${totals.successful_reads}`);
  console.log(`   ✅ Successful writes: ${totals.successful_writes}`);
  console.log(`   ❌ Failed operations: ${totals.failed_operations}`);
  console.log(`   📊 Success rate: ${success_rate}%`);
  console.log(`   ⏰ Average wait time: ${avg_wait_time}ms`);

  // Check final database state
  const final_db = new Database(DB_PATH);
  const final_count = final_db.query("SELECT COUNT(*) as count FROM messages").get() as { count: number };
  console.log(`   💾 Final row count: ${final_count.count}`);
  console.log(`   📝 Expected: ${totals.successful_writes}`);

  if (final_count.count !== totals.successful_writes) {
    console.log(`   ⚠️  MISMATCH: Some writes were lost!`);
  }

  final_db.close();

  return {
    duration,
    success_rate: parseFloat(success_rate),
    avg_wait_time: parseFloat(avg_wait_time),
    failed_operations: totals.failed_operations
  };
}

// Run benchmarks
console.log("\n🎯 Testing SQLite behavior under concurrent load");
console.log("\nThis simulates multiple Claude Code terminals trying to log messages\n");

const scenarios = [
  { name: "2 Workers, No WAL", workers: 2, ops: 50, wal: false },
  { name: "2 Workers, With WAL", workers: 2, ops: 50, wal: true },
  { name: "5 Workers, No WAL", workers: 5, ops: 50, wal: false },
  { name: "5 Workers, With WAL", workers: 5, ops: 50, wal: true },
  { name: "10 Workers, No WAL", workers: 10, ops: 30, wal: false },
  { name: "10 Workers, With WAL", workers: 10, ops: 30, wal: true },
];

const benchmark_results = [];

for (const scenario of scenarios) {
  const result = await run_benchmark(
    scenario.name,
    scenario.workers,
    scenario.ops,
    scenario.wal
  );

  benchmark_results.push({
    ...scenario,
    ...result
  });

  await Bun.sleep(1000); // Pause between scenarios
}

// Summary comparison
console.log("\n\n" + "=".repeat(70));
console.log("📊 Summary Comparison");
console.log("=".repeat(70));

console.log("\n| Scenario | Success Rate | Avg Wait | Failed Ops |");
console.log("|----------|--------------|----------|------------|");

benchmark_results.forEach(r => {
  const name = r.name.length > 30 ? r.name.substring(0, 27) + "..." : r.name;
  console.log(`| ${name.padEnd(30)} | ${r.success_rate.toString().padEnd(6)}% | ${r.avg_wait_time.toString().padEnd(5)}ms | ${r.failed_operations.toString().padEnd(10)} |`);
});

console.log("\n\n📚 Key Observations:");
console.log("\n1. ⚠️  Without WAL mode:");
console.log("   • Writes block ALL readers");
console.log("   • Database-level locking causes contention");
console.log("   • Higher failure rate with more workers");

console.log("\n2. ✅ With WAL mode:");
console.log("   • Readers and writers can work concurrently");
console.log("   • Much better performance under load");
console.log("   • Lower average wait times");

console.log("\n3. 🤔 But Claude Code still had problems:");
console.log("   • WAL mode creates extra files (.wal, .shm)");
console.log("   • Checkpointing can still cause brief locks");
console.log("   • Version skew still happens (schema migrations)");
console.log("   • Native dependencies still fail to install");

console.log("\n4. 💡 The real issue:");
console.log("   • Not just locking - combination of problems");
console.log("   • Migrations + multiprocess + auto-updates = disasters");
console.log("   • Even with optimizations, complexity was too high");

console.log("\n🎓 Conclusion:");
console.log("   SQLite CAN work for multiprocess (with WAL, busy_timeout, etc.)");
console.log("   But the COMBINATION of:");
console.log("   • Migrations");
console.log("   • Version skew from auto-updates");
console.log("   • Native dependencies");
console.log("   • Unexpected locking behavior");
console.log("   Made it the wrong choice for Claude Code");

console.log("\n✨ Simple JSONL files won because:");
console.log("   • No locking");
console.log("   • No schema");
console.log("   • No native dependencies");
console.log("   • No version skew");
console.log("   • Append-only = naturally concurrent\n");

// Clean up
try {
  rmSync(DB_PATH);
  rmSync(`${DB_PATH}-shm`);
  rmSync(`${DB_PATH}-wal`);
} catch {}
