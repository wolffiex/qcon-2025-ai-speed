#!/usr/bin/env bun

/**
 * Font tester that displays each character individually for visual inspection
 * This allows you to verify that each character looks correct
 */

import { Font } from "../src/fonts";

/**
 * Test a single font by showing each character individually
 */
function test_font(font_name: string) {
  const font = new Font(font_name);
  const metadata = font.get_metadata();

  console.log(`Font: ${font_name}\n`);
  console.log("=" .repeat(80));

  // Process each row
  for (let row_idx = 0; row_idx < metadata.rows.length; row_idx++) {
    const row = metadata.rows[row_idx];

    console.log(`\nRow ${row_idx + 1}: "${row.chars}"`);
    console.log("-".repeat(80));

    // Show each character in this row
    for (let char_idx = 0; char_idx < row.chars.length; char_idx++) {
      const char = row.chars[char_idx];
      const char_slice = font.get_char_slice(row, char_idx);

      // Display character label
      const display_char = char === ' ' ? '(space)' : char;
      console.log(`\n'${display_char}':`);

      // Display each line of the character
      char_slice.forEach(line => {
        console.log(`  |${line}|`);
      });
    }

    console.log("");
  }
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
