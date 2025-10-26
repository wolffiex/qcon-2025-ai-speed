// Demo: Sequential vs Parallel Shell Execution

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

console.log("=== Shell Execution: Sequential vs Parallel ===\n");

// Simulate PersistentShell (sequential, queued)
class PersistentShell {
  private queue: Array<() => Promise<void>> = [];
  private isExecuting = false;

  async exec(command: string): Promise<string> {
    return new Promise((resolve) => {
      this.queue.push(async () => {
        const start = Date.now();
        const { stdout } = await exec(command);
        const duration = Date.now() - start;
        console.log(`  [Sequential] ${command.slice(0, 30)}... (${duration}ms)`);
        resolve(stdout);
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isExecuting || this.queue.length === 0) return;

    this.isExecuting = true;
    const task = this.queue.shift()!;
    await task();
    this.isExecuting = false;

    this.processQueue();
  }
}

// Modern Shell (parallel, spawn each)
async function parallelExec(command: string): Promise<string> {
  const start = Date.now();
  const { stdout } = await exec(command);
  const duration = Date.now() - start;
  console.log(`  [Parallel] ${command.slice(0, 30)}... (${duration}ms)`);
  return stdout;
}

// Test commands (each takes ~1 second)
const commands = [
  'sleep 1 && echo "Command 1 done"',
  'sleep 1 && echo "Command 2 done"',
  'sleep 1 && echo "Command 3 done"',
];

// Sequential execution
console.log("🐌 Sequential Execution (PersistentShell):\n");
const persistentShell = new PersistentShell();
const seqStart = Date.now();

for (const cmd of commands) {
  await persistentShell.exec(cmd);
}

const seqDuration = Date.now() - seqStart;
console.log(`\n  Total time: ${seqDuration}ms (~3 seconds)\n`);

// Parallel execution
console.log("⚡ Parallel Execution (Modern Shell):\n");
const parStart = Date.now();

await Promise.all(commands.map(cmd => parallelExec(cmd)));

const parDuration = Date.now() - parStart;
console.log(`\n  Total time: ${parDuration}ms (~1 second)\n`);

console.log("📊 Results:");
console.log(`  Sequential: ${seqDuration}ms`);
console.log(`  Parallel:   ${parDuration}ms`);
console.log(`  Speedup:    ${(seqDuration / parDuration).toFixed(1)}x\n`);

console.log("💡 Why This Matters:");
console.log("  AI agents want to: 'Run tests WHILE building'");
console.log("  PersistentShell: Must wait for each command");
console.log("  Modern Shell: Commands run concurrently");
console.log("\n  This requirement only became clear through usage!");
