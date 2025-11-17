// Demo: Shell Sandboxing for Security

console.log("=== Shell Sandboxing: Security Layer ===\n");

console.log("📦 The Requirement (August 2025):\n");
console.log("  Users: 'I don't want Claude accessing the internet without asking'\n");

console.log("🔒 What We Built (3,293 lines of code):\n");

const sandboxFiles = [
  { file: "sandbox-manager.ts", lines: 990, purpose: "Orchestrates sandbox policies" },
  { file: "macos-sandbox-utils.ts", lines: 648, purpose: "macOS sandbox-exec integration" },
  { file: "linux-sandbox-utils.ts", lines: 458, purpose: "Linux LD_PRELOAD integration" },
  { file: "socks-proxy.ts", lines: 133, purpose: "SOCKS proxy for connections" },
  { file: "http-proxy.ts", lines: 165, purpose: "HTTP proxy for requests" },
  { file: "sandbox-schemas.ts", lines: 387, purpose: "Policy schemas" },
  { file: "Others", lines: 512, purpose: "Utils, violation store, etc." }
];

sandboxFiles.forEach(({ file, lines, purpose }) => {
  console.log(`  ${file.padEnd(30)} ${lines.toString().padStart(4)} lines - ${purpose}`);
});

console.log(`\n  Total: 3,293 lines\n`);

console.log("🛡️  Security Features:\n");

console.log("Network Sandboxing:");
console.log("  • Intercept all network connections");
console.log("  • Allow/deny specific hosts");
console.log("  • Prompt user for unknown hosts");
console.log("  • Works with HTTP_PROXY env vars\n");

console.log("Filesystem Sandboxing:");
console.log("  • Control read/write permissions");
console.log("  • Protect sensitive directories");
console.log("  • Allow workspace access\n");

console.log("📝 Example Policy:\n");

const policy = {
  network: {
    mode: "ask",
    allowedHosts: [
      "api.anthropic.com",
      "github.com",
      "npm.registry.com"
    ],
    deniedHosts: [
      "evil.com"
    ]
  },
  filesystem: {
    allowedPaths: [
      "/Users/me/project",
      "/tmp"
    ],
    deniedPaths: [
      "/Users/me/.ssh",
      "/etc/passwd"
    ]
  }
};

console.log(JSON.stringify(policy, null, 2));

console.log("\n🔧 How It Works:\n");

console.log("Without sandbox:");
console.log("  $ curl https://unknown-site.com");
console.log("  ✓ Request goes through (no protection)\n");

console.log("With sandbox:");
console.log("  $ curl https://unknown-site.com");
console.log("  🚨 Sandbox intercepts");
console.log("  📝 Prompts user: 'Allow access to unknown-site.com?'");
console.log("  ✅ User approves → request allowed");
console.log("  ❌ User denies → connection blocked\n");

console.log("🏗️  Platform-Specific Implementation:\n");

console.log("macOS:");
console.log("  • Uses sandbox-exec (built into macOS)");
console.log("  • SOCKS proxy via HTTP_PROXY");
console.log("  • Wraps spawn: sandbox-exec -p profile.sb command\n");

console.log("Linux:");
console.log("  • Uses LD_PRELOAD");
console.log("  • Intercepts libc network calls");
console.log("  • Routes through SOCKS proxy\n");

console.log("💭 Couldn't Predict Upfront:\n");
console.log("  • Which security features matter most");
console.log("  • How different platforms implement sandboxing");
console.log("  • That this would require 3,293 lines");
console.log("  • Network vs filesystem priority\n");

console.log("📈 Growth Over Time:\n");
console.log("  March:  346 lines (basic shell execution)");
console.log("  April:  809 lines (+ snapshots)");
console.log("  August: 4,109 lines (+ sandboxing)\n");
console.log("  = 11.8x growth from requirements emergence\n");

console.log("🎯 The Pattern:");
console.log("  Start simple → Users reveal needs → Iterate quickly");
console.log("  AI makes iteration cheap → Requirements discovered through building");
