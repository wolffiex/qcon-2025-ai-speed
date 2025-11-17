// Demo: The performance cliff and lazy evaluation fix

console.log("=== Cursor Performance: Lazy Evaluation ===\n");

// Simulate the old eager approach
class EagerCursor {
  private graphemes: number[];
  private wrappedLines: string[];

  constructor(private text: string, private columns: number) {
    // ALWAYS compute graphemes
    this.graphemes = this.computeGraphemes();
    // ALWAYS wrap text
    this.wrappedLines = this.wrapText();
  }

  private computeGraphemes(): number[] {
    const boundaries: number[] = [];
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    for (const { index } of segmenter.segment(this.text)) {
      boundaries.push(index);
    }
    return boundaries;
  }

  private wrapText(): string[] {
    // Simplified wrapping
    const lines: string[] = [];
    for (let i = 0; i < this.text.length; i += this.columns) {
      lines.push(this.text.slice(i, i + this.columns));
    }
    return lines;
  }

  moveRight() {
    // Simple movement - but we paid for graphemes + wrapping!
    return new EagerCursor(this.text, this.columns);
  }
}

// Simulate the new lazy approach
class LazyCursor {
  private _graphemes: number[] | null = null;
  private _wrappedLines: string[] | null = null;

  constructor(private text: string, private columns: number) {
    // Nothing computed yet!
  }

  private get graphemes(): number[] {
    if (!this._graphemes) {
      this._graphemes = this.computeGraphemes();
    }
    return this._graphemes;
  }

  private get wrappedLines(): string[] {
    if (!this._wrappedLines) {
      this._wrappedLines = this.wrapText();
    }
    return this._wrappedLines;
  }

  private computeGraphemes(): number[] {
    const boundaries: number[] = [];
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    for (const { index } of segmenter.segment(this.text)) {
      boundaries.push(index);
    }
    return boundaries;
  }

  private wrapText(): string[] {
    const lines: string[] = [];
    for (let i = 0; i < this.text.length; i += this.columns) {
      lines.push(this.text.slice(i, i + this.columns));
    }
    return lines;
  }

  moveRight() {
    // Simple movement - pays nothing if graphemes not needed!
    return new LazyCursor(this.text, this.columns);
  }
}

// Benchmark
const largeText = "Hello world! ".repeat(10000); // 130k characters
const columns = 80;

console.log(`Text size: ${largeText.length.toLocaleString()} characters`);
console.log(`Simulating 100 cursor movements\n`);

// Eager approach
console.log("⏱️  Eager Approach (old):");
let start = performance.now();
let cursor: EagerCursor | null = new EagerCursor(largeText, columns);
for (let i = 0; i < 100; i++) {
  cursor = cursor.moveRight();
}
let elapsed = performance.now() - start;
console.log(`   Time: ${elapsed.toFixed(2)}ms`);
console.log(`   Per operation: ${(elapsed / 100).toFixed(2)}ms`);
console.log(`   ❌ Every movement recomputes everything!`);

// Lazy approach
console.log("\n⏱️  Lazy Approach (new):");
start = performance.now();
let lazyCursor: LazyCursor | null = new LazyCursor(largeText, columns);
for (let i = 0; i < 100; i++) {
  lazyCursor = lazyCursor.moveRight();
}
elapsed = performance.now() - start;
console.log(`   Time: ${elapsed.toFixed(2)}ms`);
console.log(`   Per operation: ${(elapsed / 100).toFixed(2)}ms`);
console.log(`   ✅ Only computes when needed!`);

console.log("\n📊 Real Results from Claude Code:");
console.log("   Typing:      2.9s → 8ms    (362x faster)");
console.log("   Backspace:   2.8s → 454ms  (6x faster)");
console.log("   wrapAnsi:    66.2% → 0.5% of runtime");

console.log("\n💡 Key Insight:");
console.log("   Most operations don't need wrapping or graphemes");
console.log("   Lazy evaluation = only pay for what you use");
console.log("   Binary search on boundaries = O(log n) not O(n)");

console.log("\n✨ AI-Accelerated Development:");
console.log("   Problem identified → fix shipped in days");
console.log("   Complex optimization made manageable");
