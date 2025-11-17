// Demo: Sequential vs Parallel Shell Execution

import { promisify } from 'util';
import { exec as exec_callback } from 'child_process';

const exec = promisify(exec_callback);

console.log("=== Shell Execution: Sequential vs Parallel ===\n");

// Timed command execution with logging
async function timed_exec(command: string, label: string): Promise<string> {
  const start = Date.now();
  const { stdout } = await exec(command);
  console.log(`  [${label}] ${command.slice(0, 40)} (${Date.now() - start}ms)`);
  return stdout;
}

// Simulate PersistentShell (sequential, queued)
class PersistentShell {
  private queue: Array<() => Promise<void>> = [];
  private is_executing = false;

  async exec(command: string): Promise<string> {
    return new Promise((resolve) => {
      this.queue.push(async () => {
        resolve(await timed_exec(command, "Sequential"));
      });
      this.process_queue();
    });
  }

  private async process_queue() {
    if (this.is_executing || this.queue.length === 0) return;
    this.is_executing = true;
    await this.queue.shift()!();
    this.is_executing = false;
    this.process_queue();
  }
}

// TransientShell (parallel, fresh process each time)
class TransientShell {
  async exec(command: string): Promise<string> {
    return timed_exec(command, "Parallel");
  }
}

// Test commands (each takes ~1 second)
const commands = [
  'sleep 1 && echo "Command 1 done"',
  'sleep 1 && echo "Command 2 done"',
  'sleep 1 && echo "Command 3 done"',
];

// Benchmark helper
async function benchmark(name: string, run: () => Promise<void>): Promise<number> {
  console.log(`${name}:\n`);
  const start = Date.now();
  await run();
  const duration = Date.now() - start;
  console.log(`\n  Total time: ${duration}ms\n`);
  return duration;
}

// Run benchmarks
const seq_duration = await benchmark("🐌 Sequential Execution (PersistentShell)", async () => {
  const shell = new PersistentShell();
  for (const cmd of commands) {
    await shell.exec(cmd);
  }
});

const par_duration = await benchmark("⚡ Parallel Execution (TransientShell)", async () => {
  const shell = new TransientShell();
  await Promise.all(commands.map(cmd => shell.exec(cmd)));
});

console.log("📊 Results:");
console.log(`  Sequential: ${seq_duration}ms`);
console.log(`  Parallel:   ${par_duration}ms`);
console.log(`  Speedup:    ${(seq_duration / par_duration).toFixed(1)}x\n`);

for await (const _ of console) { break; }
