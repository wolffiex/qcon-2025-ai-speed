// Demo: Virtual cursor abstraction

console.log("=== Cursor Virtualization Demo ===\n");

// Virtual cursor that abstracts terminal operations
class VirtualCursor {
  private x = 0;
  private y = 0;
  private buffer: string[] = [];

  moveTo(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.buffer.push(`\x1b[${y};${x}H`); // ANSI escape: move cursor
    return this;
  }

  write(text: string) {
    this.buffer.push(text);
    this.x += text.length;
    return this;
  }

  clearLine() {
    this.buffer.push('\x1b[2K'); // ANSI escape: clear line
    return this;
  }

  setColor(color: 'red' | 'green' | 'blue' | 'reset') {
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      blue: '\x1b[34m',
      reset: '\x1b[0m'
    };
    this.buffer.push(colors[color]);
    return this;
  }

  flush() {
    const output = this.buffer.join('');
    this.buffer = [];
    return output;
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }
}

// Demo usage
const cursor = new VirtualCursor();

console.log("Building a UI with virtual cursor:\n");

// Build some UI without touching the real terminal yet
cursor
  .moveTo(1, 1)
  .setColor('blue')
  .write('┌─────────────────────────┐')
  .moveTo(1, 2)
  .write('│  Virtual Cursor Demo    │')
  .moveTo(1, 3)
  .write('└─────────────────────────┘')
  .setColor('reset')
  .moveTo(3, 5)
  .setColor('green')
  .write('✓ Abstracted terminal ops')
  .setColor('reset')
  .moveTo(3, 6)
  .write('✓ Testable without real terminal')
  .moveTo(3, 7)
  .write('✓ Can buffer and optimize');

// Now flush all operations at once
const output = cursor.flush();
process.stdout.write(output);

console.log("\n\n💡 Key benefits:");
console.log("  • Decouple rendering logic from terminal I/O");
console.log("  • Test without real terminal");
console.log("  • Buffer operations for efficiency");
console.log("  • Track virtual position independently");

const pos = cursor.getPosition();
console.log(`\nCurrent virtual position: (${pos.x}, ${pos.y})`);
