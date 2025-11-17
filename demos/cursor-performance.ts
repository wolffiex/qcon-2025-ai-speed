// Demo: The performance cliff and lazy evaluation fix

console.log("=== Cursor Performance: Lazy Evaluation ===\n");

// Shared computation functions
function compute_graphemes(text: string): number[] {
  const boundaries: number[] = [];
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const { index } of segmenter.segment(text)) {
    boundaries.push(index);
  }
  return boundaries;
}

function wrap_text(text: string, columns: number): string[] {
  // Simulate expensive width calculation (CJK = double width, etc.)
  const lines: string[] = [];
  let current_line = "";
  let current_width = 0;

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const { segment } of segmenter.segment(text)) {
    // Estimate display width (CJK chars are ~2 columns)
    const char_width = segment.charCodeAt(0) > 0x2E7F ? 2 : 1;

    if (current_width + char_width > columns) {
      lines.push(current_line);
      current_line = segment;
      current_width = char_width;
    } else {
      current_line += segment;
      current_width += char_width;
    }
  }
  if (current_line) lines.push(current_line);
  return lines;
}

// Simulate the old eager approach
class EagerCursor {
  private graphemes: number[];
  private wrapped_lines: string[];

  constructor(private text: string, private columns: number, private pos: number = 0) {
    // ALWAYS compute graphemes and wrap text
    this.graphemes = compute_graphemes(text);
    this.wrapped_lines = wrap_text(text, columns);
  }

  move_right(): [EagerCursor, boolean] {
    const new_pos = this.pos + 1;
    const crossed_line = Math.floor(new_pos / this.columns) !== Math.floor(this.pos / this.columns);
    return [new EagerCursor(this.text, this.columns, new_pos), crossed_line];
  }

  render() {
    // Access computed values for rendering
    return this.wrapped_lines.length + this.graphemes.length;
  }
}

// Simulate the new lazy approach
class LazyCursor {
  private _graphemes: number[] | null = null;
  private _wrapped_lines: string[] | null = null;

  constructor(private text: string, private columns: number, private pos: number = 0) {
    // Nothing computed yet!
  }

  move_right(): [LazyCursor, boolean] {
    const new_pos = this.pos + 1;
    const crossed_line = Math.floor(new_pos / this.columns) !== Math.floor(this.pos / this.columns);
    return [new LazyCursor(this.text, this.columns, new_pos), crossed_line];
  }

  render() {
    // Only compute when we actually need to render
    if (!this._graphemes) this._graphemes = compute_graphemes(this.text);
    if (!this._wrapped_lines) this._wrapped_lines = wrap_text(this.text, this.columns);
    return this._wrapped_lines.length + this._graphemes.length;
  }
}

// Benchmark helper
function benchmark(
  name: string,
  create: () => EagerCursor | LazyCursor,
  message: string
) {
  console.log(`⏱️  ${name}:`);
  const start = performance.now();
  let cursor = create();
  for (let i = 0; i < 100; i++) {
    const [new_cursor, crossed_line] = cursor.move_right();
    cursor = new_cursor;
    // Render when cursor crosses to a new line (need to update display)
    if (crossed_line) cursor.render();
  }
  const elapsed = performance.now() - start;
  console.log(`   Time: ${elapsed.toFixed(2)}ms`);
  console.log(`   Per operation: ${(elapsed / 100).toFixed(2)}ms`);
  console.log(`   ${message}`);
}

// Run benchmarks
const large_text = "Hello world! ".repeat(10000); // 130k characters
const columns = 80;

console.log(`Text size: ${large_text.length.toLocaleString()} characters`);
console.log(`Simulating 100 cursor movements\n`);

benchmark(
  "Eager Approach (old)",
  () => new EagerCursor(large_text, columns),
  "❌ Every movement recomputes everything!"
);

console.log();

benchmark(
  "Lazy Approach (new)",
  () => new LazyCursor(large_text, columns),
  "✅ Only computes when needed!"
);

for await (const _ of console) { break; }
