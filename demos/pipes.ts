// Demo: Node.js shell execution problems

import { spawn } from 'child_process';

console.log("=== Node.js Shell Problems ===\n");

// Problem 1: shell:true spawns a fresh shell each time
console.log("1️⃣  shell:true spawns a fresh shell (slow, no user env):\n");

// Time spawning with shell:true
const iterations = 50;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  const child = spawn('true', [], { shell: true });
  await new Promise(resolve => child.on('close', resolve));
}
const shell_time = performance.now() - start;

// Compare to direct spawn
const start2 = performance.now();
for (let i = 0; i < iterations; i++) {
  const child = spawn('true', []);
  await new Promise(resolve => child.on('close', resolve));
}
const direct_time = performance.now() - start2;

console.log(`   ${iterations} iterations:`);
console.log(`   Direct spawn: ${direct_time.toFixed(0)}ms`);
console.log(`   shell:true:   ${shell_time.toFixed(0)}ms (${(shell_time/direct_time).toFixed(1)}x slower)`);
console.log(`   ❌ Each command pays shell startup cost\n`);

// Problem 2: Can't create pipes and connect them later
console.log("2️⃣  Can't create pipes and connect later:\n");

console.log(`   // In C/shell, you can create a pipe first:`);
console.log(`   // int fds[2]; pipe(fds);`);
console.log(`   // Then pass fds[0] or fds[1] to any process later\n`);

console.log(`   // In Node, stdio is locked at spawn time.`);
console.log(`   // You can't create a pipe, then decide what to connect.\n`);

// Demonstrate the issue - we want to read output and maybe pipe it somewhere
const producer = spawn('echo', ['streaming data...']);

// Option A: Read it ourselves
// producer.stdout.on('data', (chunk) => { /* process in Node */ });

// Option B: Pipe to another process
// producer.stdout.pipe(consumer.stdin);

// But what if we need BOTH? Or decide later?
// Have to buffer everything:
const output_chunks: Buffer[] = [];
producer.stdout.on('data', (chunk) => output_chunks.push(chunk));
await new Promise(resolve => producer.on('close', resolve));

// Now we can use it, but we've lost streaming
const consumer = spawn('cat');
consumer.stdin.write(Buffer.concat(output_chunks));
consumer.stdin.end();

let consumer_out = '';
consumer.stdout.on('data', (data) => consumer_out += data);
await new Promise(resolve => consumer.on('close', resolve));
console.log(`   To both read and forward output: must buffer first`);
console.log(`   Result: "${consumer_out.trim()}"`);
console.log(`   ❌ Loses streaming benefit, data sits in memory\n`);

console.log("📊 Summary:");
console.log("   These limitations pushed Claude Code toward transient shells");
console.log("   with snapshots - spawn fresh processes, but replay user env.\n");

for await (const _ of console) { break; }
