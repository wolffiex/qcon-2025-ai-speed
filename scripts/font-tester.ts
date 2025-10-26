#!/usr/bin/env bun

/**
 * Font tester that prints each row of a font character by character
 * This helps compare rendered output with the original font.txt to verify correctness
 */

import { Font } from "../src/fonts";

/**
 * Test a single font by printing each row character by character
 */
function test_font(font_name: string) {
  const font = new Font(font_name);
  const metadata = font.get_metadata();
  const font_lines = font.get_lines();

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Font: ${font_name}`);
  console.log(`${"=".repeat(80)}\n`);

  // Process each row
  for (let row_idx = 0; row_idx < metadata.rows.length; row_idx++) {
    const row = metadata.rows[row_idx];

    console.log(`\nRow ${row_idx + 1}: "${row.chars}"`);
    console.log(`Lines ${row.top}-${row.bottom}`);
    console.log(`${"─".repeat(80)}`);

    // Print each character in the row
    for (let char_idx = 0; char_idx < row.chars.length; char_idx++) {
      const char = row.chars[char_idx];
      const left = row.offsets[char_idx];
      const right = row.offsets[char_idx + 1] - 1;

      console.log(`\nChar '${char}' (columns ${left}-${right}):`);

      // Use the shared character slicing logic from Font class
      const char_lines = font.get_char_slice(row, char_idx);
      char_lines.forEach((char_line, idx) => {
        const line_num = row.top + idx;
        console.log(`  Line ${line_num.toString().padStart(2)}: |${char_line}|`);
      });
    }

    console.log("");
  }

  // Print full font file for reference
  console.log(`\n${"=".repeat(80)}`);
  console.log("Full font.txt for reference:");
  console.log(`${"=".repeat(80)}\n`);

  font_lines.forEach((line, idx) => {
    console.log(`${idx.toString().padStart(3)}: ${line}`);
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: bun scripts/font-tester.ts <font-name>");
    console.log("\nExample: bun scripts/font-tester.ts ansishadow");
    process.exit(1);
  }

  const font_name = args[0];

  try {
    test_font(font_name);
  } catch (error) {
    console.error(`Error testing font '${font_name}':`, error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
