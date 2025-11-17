// Demo: Virtual cursor for rich text input

console.log("=== Virtual Cursor: The Motivation ===\n");

console.log("🎯 The Problem:\n");
console.log("  Need rich text input features:");
console.log("  • /commands for git operations");
console.log("  • @mentions to reference files");
console.log("  • Full keystroke control for inception\n");

console.log("❌ Using Libraries (readline, blessed, ink):\n");
console.log("  • Black box input handling");
console.log("  • Can't intercept / or @ before they're processed");
console.log("  • Can't implement inception UI");
console.log("  • Limited control over rendering\n");

console.log("✅ Solution: Virtual Cursor in JavaScript\n");

// Simple Cursor class demonstration
class Cursor {
  private content = "";
  private position = 0;

  insert(text: string): Cursor {
    this.content =
      this.content.slice(0, this.position) +
      text +
      this.content.slice(this.position);
    this.position += text.length;
    return this;
  }

  left(): Cursor {
    if (this.position > 0) this.position--;
    return this;
  }

  right(): Cursor {
    if (this.position < this.content.length) this.position++;
    return this;
  }

  deleteWordBefore(): Cursor {
    const before = this.content.slice(0, this.position);
    const match = before.match(/\S+\s*$/);
    if (match) {
      const deleteCount = match[0].length;
      this.content =
        before.slice(0, -deleteCount) +
        this.content.slice(this.position);
      this.position -= deleteCount;
    }
    return this;
  }

  toString(): string {
    return this.content;
  }

  getPosition(): number {
    return this.position;
  }
}

// Demo: Building rich input
console.log("Demo: Typing with / and @ interception\n");

const cursor = new Cursor();

// Simulate typing
cursor.insert("Let's run ");

console.log(`User types: "/"`);
cursor.insert("/");
console.log(`→ Intercept! Show command menu`);
console.log(`  /commit   - Create a commit`);
console.log(`  /search   - Search codebase`);
console.log(`  /help     - Get help\n`);

cursor.insert("commit ");

console.log(`User types: "@"`);
cursor.insert("@");
console.log(`→ Intercept! Show file picker`);
console.log(`  @src/cursor.ts`);
console.log(`  @src/shell.ts`);
console.log(`  @demos/cursor-demo.ts\n`);

cursor.insert("src/cursor.ts");

console.log(`Final input: "${cursor.toString()}"\n`);

console.log("🎨 What Virtual Cursor Enables:\n");
console.log("  ✓ Intercept / keystroke → show command menu");
console.log("  ✓ Intercept @ keystroke → show file picker");
console.log("  ✓ Render inception UI overlay");
console.log("  ✓ Handle Ctrl+A, Ctrl+E, Ctrl+W, etc.");
console.log("  ✓ Full control over every character\n");

console.log("📦 Implementation Benefits:\n");
console.log("  • 333 lines of pure JavaScript");
console.log("  • No black box dependencies");
console.log("  • Fully testable (204 lines of tests)");
console.log("  • Simplified useTextInput by 416 lines\n");

console.log("💡 The Insight:\n");
console.log("  Before AI: Use libraries (building is too slow)");
console.log("  With AI: Build what you need (fast enough now)");
console.log("\n  For Claude Code: Full control was essential.");
