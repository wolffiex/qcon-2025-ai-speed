// Demo: The simpler alternative that replaced SQLite

console.log("=== Simple Storage Solution ===\n");

// Simple file-based storage with Bun
class SimpleStorage {
  constructor(private filepath: string) {}

  async save(data: any) {
    const json = JSON.stringify(data, null, 2);
    await Bun.write(this.filepath, json);
    console.log(`✓ Saved to ${this.filepath}`);
  }

  async load() {
    try {
      const file = Bun.file(this.filepath);
      if (await file.exists()) {
        return await file.json();
      }
      return null;
    } catch (e) {
      console.log(`⚠️  Load failed, returning null (availability > consistency)`);
      return null;
    }
  }
}

// Demo usage
const storage = new SimpleStorage("/tmp/claude-code-demo.json");

const conversationData = {
  id: "conv-123",
  messages: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" }
  ],
  updatedAt: new Date().toISOString()
};

console.log("Saving conversation data...");
await storage.save(conversationData);

console.log("\nLoading conversation data...");
const loaded = await storage.load();
console.log(`✓ Loaded ${loaded.messages.length} messages`);

console.log("\n✨ Benefits:");
console.log("  • No native dependencies");
console.log("  • No locking issues");
console.log("  • Fails gracefully (returns null)");
console.log("  • Simple migrations (just JSON)");
console.log("  • Built-in Bun support");

console.log("\n💡 Trade-off:");
console.log("  Lost: ACID guarantees, complex queries");
console.log("  Gained: Simplicity, availability, no native deps");
console.log("  Result: Right choice for Claude Code");
