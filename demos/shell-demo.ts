// Demo: Shell execution evolution

console.log("=== Shell Execution Evolution ===\n");

// Act 1: Interactive shell (the old way)
console.log("❌ Act 1: Interactive Shell Approach\n");
console.log("Problems:");
console.log("  • Sequential execution only");
console.log("  • Hard to capture output");
console.log("  • State management nightmares");
console.log("  • Can't run commands in parallel\n");

const oldApproach = `
// Send commands to stdin
shell.stdin.write('ls\\n');
shell.stdin.write('pwd\\n');
// How do we know when each finishes? 🤔
`;
console.log(oldApproach);

// Act 2: spawn for parallelism (the better way)
console.log("\n✓ Act 2: Spawn Approach\n");

const { spawn } = await import("child_process");
const { promisify } = await import("util");
const exec = promisify((await import("child_process")).exec);

// Run multiple commands in parallel
console.log("Running 3 commands in parallel...\n");

const commands = [
  { name: "List files", cmd: "ls -l demos" },
  { name: "Show date", cmd: "date" },
  { name: "Current dir", cmd: "pwd" }
];

const results = await Promise.all(
  commands.map(async ({ name, cmd }) => {
    const start = Date.now();
    const { stdout } = await exec(cmd);
    const duration = Date.now() - start;
    return { name, output: stdout.trim(), duration };
  })
);

results.forEach(({ name, output, duration }) => {
  console.log(`[${name}] (${duration}ms)`);
  console.log(output.split('\n')[0] + '...'); // First line only
  console.log();
});

console.log("✨ Benefits:");
console.log("  • True parallelism");
console.log("  • Clean output capture");
console.log("  • No shared state");
console.log("  • Each command isolated\n");

// Act 3: State management
console.log("Act 3: Snapshotting for State Management\n");
console.log("Concept: Save terminal state before commands");
console.log("  • Snapshot current working directory");
console.log("  • Snapshot environment variables");
console.log("  • Restore on navigation");
console.log("  • Enable true interactivity");

console.log("\n💡 Key insight:");
console.log("Not just about running commands,");
console.log("but managing state over time.");
