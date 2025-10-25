// Demo: State management and snapshotting

console.log("=== State Management Demo ===\n");

// Simple state snapshot system
interface Snapshot {
  cwd: string;
  env: Record<string, string>;
  timestamp: number;
}

class StateManager {
  private snapshots: Map<string, Snapshot> = new Map();

  capture(id: string): Snapshot {
    const snapshot = {
      cwd: process.cwd(),
      env: { ...process.env } as Record<string, string>,
      timestamp: Date.now()
    };
    this.snapshots.set(id, snapshot);
    console.log(`📸 Captured snapshot: ${id}`);
    console.log(`   CWD: ${snapshot.cwd}`);
    return snapshot;
  }

  restore(id: string): boolean {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) {
      console.log(`❌ Snapshot ${id} not found`);
      return false;
    }

    // Restore state
    process.chdir(snapshot.cwd);
    // In real impl, would restore relevant env vars

    const age = Date.now() - snapshot.timestamp;
    console.log(`♻️  Restored snapshot: ${id} (${age}ms old)`);
    console.log(`   CWD: ${snapshot.cwd}`);
    return true;
  }

  list() {
    console.log(`\n📋 Snapshots (${this.snapshots.size}):`);
    for (const [id, snap] of this.snapshots) {
      const age = Date.now() - snap.timestamp;
      console.log(`   ${id}: ${snap.cwd} (${age}ms ago)`);
    }
  }
}

// Demo usage
const manager = new StateManager();

// Initial state
console.log("Initial state:");
console.log(`CWD: ${process.cwd()}\n`);

// Capture snapshot before navigation
manager.capture("home");

// Simulate changing state
const originalCwd = process.cwd();
process.chdir("/tmp");
console.log(`\n📁 Changed to: ${process.cwd()}\n`);

// Capture another snapshot
manager.capture("tmp");

// List all snapshots
manager.list();

// Restore back to original
console.log();
manager.restore("home");

console.log(`\n✓ Verified: ${process.cwd() === originalCwd ? 'Back to original!' : 'Something went wrong'}`);

console.log("\n💡 Why this matters:");
console.log("  • Terminal presentations need state");
console.log("  • Navigation between slides");
console.log("  • Demo commands change environment");
console.log("  • Must restore cleanly");
console.log("  • Enables true interactivity");

// Restore to original for cleanup
process.chdir(originalCwd);
