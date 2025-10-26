#!/usr/bin/env bun

/**
 * Interactive font adjustment tool - row-based structure
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import * as readline from "readline";
import { Font, FontMetadata, Row } from "../src/fonts";

const LEGEND_GROUPS = [
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "`1234567890~!@#$%^&*()_+",
  ",./<>?;':\"[]{}",
];

function visualize_character(
  lines: string[],
  row: Row,
  char_index: number,
  char: string
): void {
  const left = row.offsets[char_index];
  const right = row.offsets[char_index + 1] - 1;
  const width = right - left + 1;

  const context_left = Math.max(0, left - 3);
  const context_right = right + 3;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Character: '${char}' [${char.charCodeAt(0)}]`);
  console.log(`Position: rows ${row.top}-${row.bottom}, cols ${left} to ${right} (width: ${width})`);
  console.log(`${"=".repeat(60)}`);

  for (let r = row.top; r <= row.bottom && r < lines.length; r++) {
    const line = lines[r] || "";
    const segment = line.slice(context_left, context_right + 1);
    console.log(`|${segment}|`);
  }

  // Show boundary markers (only if width is positive)
  if (width > 0) {
    const pre = " ".repeat(left - context_left + 1); // +1 for the | border
    console.log(`${pre}${"^".repeat(width)}`);
  } else {
    console.log("  ⚠️  ERROR: Character boundaries are invalid (right < left)");
  }

  console.log(`${"=".repeat(60)}`);
}

async function read_key(): Promise<{ key: string; name?: string; shift?: boolean }> {
  return new Promise((resolve) => {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const on_keypress = (str: string, key: any) => {
      process.stdin.removeListener('keypress', on_keypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }

      if (key.ctrl && key.name === 'c') {
        process.exit(0);
      }

      resolve({ key: str || '', name: key.name, shift: key.shift });
    };

    process.stdin.once('keypress', on_keypress);
  });
}

async function adjust_character(
  lines: string[],
  metadata: FontMetadata,
  row_index: number,
  char_index: number
): Promise<{ action: 'next' | 'prev' }> {
  const row = metadata.rows[row_index];
  const char = row.chars[char_index];

  while (true) {
    console.clear();
    visualize_character(lines, row, char_index, char);

    console.log("\nPress:");
    console.log("  l = left (move start left)    r = right (move start right)");
    console.log("  w = wider (move end right)    n = narrower (move end left)");
    console.log("  ↑ = top up    Shift+↑ = top down    ↓ = bottom down    Shift+↓ = bottom up");
    console.log("  o = insert new offset (width 3)");
    console.log("  [Enter]/[→] = next    [←] = previous");
    console.log("");

    const { key, name, shift } = await read_key();

    // Handle special keys first
    if (name === 'left') {
      return { action: 'prev' };
    } else if (name === 'right' || key === "\r" || key === "\n") {
      return { action: 'next' };
    } else if (name === 'up' && !shift) {
      // up arrow: move top boundary up (decrease row.top)
      row.top = row.top - 1;
    } else if (name === 'up' && shift) {
      // shift+up arrow: move top boundary down (increase row.top)
      if (row.top < row.bottom) {
        row.top = row.top + 1;
      }
    } else if (name === 'down' && !shift) {
      // down arrow: move bottom boundary down (increase row.bottom)
      row.bottom = row.bottom + 1;
    } else if (name === 'down' && shift) {
      // shift+down arrow: move bottom boundary up (decrease row.bottom)
      if (row.bottom > row.top) {
        row.bottom = row.bottom - 1;
      }
    } else if (key === "l") {
      // left: move THIS character's start left (decrease offsets[char_index])
      // Also prevents previous character from getting too wide (if char_index > 0)
      row.offsets[char_index] = row.offsets[char_index] - 1;
    } else if (key === "r") {
      // right: move THIS character's start right (increase offsets[char_index])
      // But not past the character's end
      if (row.offsets[char_index] < row.offsets[char_index + 1] - 1) {
        row.offsets[char_index] = row.offsets[char_index] + 1;
      }
    } else if (key === "w") {
      // wider: move NEXT character's start right (increase offsets[char_index + 1])
      row.offsets[char_index + 1] = row.offsets[char_index + 1] + 1;
    } else if (key === "n") {
      // narrower: move NEXT character's start left (decrease offsets[char_index + 1])
      // But not before the current character's start + 1 (must leave at least 1 column)
      if (row.offsets[char_index + 1] > row.offsets[char_index] + 1) {
        row.offsets[char_index + 1] = row.offsets[char_index + 1] - 1;
      }
    } else if (key === "o") {
      // o: insert new offset after current character (width 3)
      const new_offset = row.offsets[char_index + 1] + 3;
      row.offsets.splice(char_index + 2, 0, new_offset);
      // Also insert a placeholder character in the string
      row.chars = row.chars.slice(0, char_index + 1) + "?" + row.chars.slice(char_index + 1);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: bun scripts/font_adjust_new.ts <font-name> [start-char]");
    console.log("Example: bun scripts/font_adjust_new.ts mini A");
    process.exit(1);
  }

  const font_name = args[0].replace(".json", "").replace(".txt", "");
  const json_path = `src/fonts/${font_name}.json`;
  const txt_path = `src/fonts/${font_name}.txt`;

  if (!existsSync(json_path)) {
    console.error(`❌ JSON file not found: ${json_path}`);
    process.exit(1);
  }

  if (!existsSync(txt_path)) {
    console.error(`❌ Font file not found: ${txt_path}`);
    process.exit(1);
  }

  let metadata: FontMetadata;
  try {
    metadata = JSON.parse(readFileSync(json_path, "utf-8"));
    if (!metadata.rows) {
      metadata = { name: font_name, rows: [] };
    }
  } catch {
    // Create empty metadata if file doesn't exist or is invalid
    metadata = { name: font_name, rows: [] };
  }

  const lines = readFileSync(txt_path, "utf-8").split("\n");

  if (metadata.rows.length === 0) {
    console.error(`\n❌ No rows found in ${json_path}`);
    console.error(`\nPlease add rows to the JSON file first. Example:`);
    console.error(`{`);
    console.error(`  "name": "${font_name}",`);
    console.error(`  "rows": [`);
    console.error(`    {`);
    console.error(`      "chars": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",`);
    console.error(`      "top": 0,`);
    console.error(`      "bottom": 3,`);
    console.error(`      "offsets": [0, 8, 16, 24, ...]`);
    console.error(`    }`);
    console.error(`  ]`);
    console.error(`}\n`);
    process.exit(1);
  }

  console.log(`\n🎨 Adjusting font: ${font_name}\n`);
  console.log(`Loaded ${metadata.rows.length} rows\n`);

  const start_char = args[1] || "";

  // Find starting position
  let current_row_index = 0;
  let current_char_index = 0;

  if (start_char) {
    outer: for (let ri = 0; ri < metadata.rows.length; ri++) {
      const row = metadata.rows[ri];
      for (let ci = 0; ci < row.chars.length; ci++) {
        if (row.chars[ci] === start_char) {
          current_row_index = ri;
          current_char_index = ci;
          break outer;
        }
      }
    }
  }

  while (current_row_index < metadata.rows.length) {
    const row = metadata.rows[current_row_index];

    while (current_char_index >= 0 && current_char_index < row.chars.length) {
      const result = await adjust_character(lines, metadata, current_row_index, current_char_index);

      // Save after each character
      writeFileSync(json_path, JSON.stringify(metadata, null, 2));

      if (result.action === 'next') {
        current_char_index++;
      } else if (result.action === 'prev') {
        current_char_index--;
        if (current_char_index < 0) {
          // Go to previous row
          current_row_index--;
          if (current_row_index >= 0) {
            current_char_index = metadata.rows[current_row_index].chars.length - 1;
          } else {
            current_row_index = 0;
            current_char_index = 0;
          }
        }
      }
    }

    // Move to next row
    current_row_index++;
    current_char_index = 0;
  }

  console.log(`\n✅ All adjustments saved to: ${json_path}`);
}

main().catch(console.error);
