#!/usr/bin/env bun

/**
 * Interactive font adjustment tool - row-based structure
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import * as readline from "readline";

const LEGEND_GROUPS = [
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "`1234567890~!@#$%^&*()_+",
  ",./<>?;':\"[]{}",
];

interface Row {
  chars: string;
  top: number;
  bottom: number;
  offsets: number[];
}

interface FontMetadata {
  name: string;
  rows: Row[];
}

function visualizeCharacter(
  lines: string[],
  row: Row,
  charIndex: number,
  char: string
): void {
  const left = row.offsets[charIndex];
  const right = row.offsets[charIndex + 1] - 1;
  const width = right - left + 1;

  const contextLeft = Math.max(0, left - 3);
  const contextRight = right + 3;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Character: '${char}' [${char.charCodeAt(0)}]`);
  console.log(`Position: rows ${row.top}-${row.bottom}, cols ${left} to ${right} (width: ${width})`);
  console.log(`${"=".repeat(60)}`);

  for (let r = row.top; r <= row.bottom && r < lines.length; r++) {
    const line = lines[r] || "";
    const segment = line.slice(contextLeft, contextRight + 1);
    console.log(`|${segment}|`);
  }

  // Show boundary markers (only if width is positive)
  if (width > 0) {
    const pre = " ".repeat(left - contextLeft + 1); // +1 for the | border
    console.log(`${pre}${"^".repeat(width)}`);
  } else {
    console.log("  ⚠️  ERROR: Character boundaries are invalid (right < left)");
  }

  console.log(`${"=".repeat(60)}`);
}

async function readKey(): Promise<{ key: string; name?: string; shift?: boolean }> {
  return new Promise((resolve) => {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const onKeypress = (str: string, key: any) => {
      process.stdin.removeListener('keypress', onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }

      if (key.ctrl && key.name === 'c') {
        process.exit(0);
      }

      resolve({ key: str || '', name: key.name, shift: key.shift });
    };

    process.stdin.once('keypress', onKeypress);
  });
}

async function adjustCharacter(
  lines: string[],
  metadata: FontMetadata,
  rowIndex: number,
  charIndex: number
): Promise<{ action: 'next' | 'prev' }> {
  const row = metadata.rows[rowIndex];
  const char = row.chars[charIndex];

  while (true) {
    console.clear();
    visualizeCharacter(lines, row, charIndex, char);

    console.log("\nPress:");
    console.log("  l = left (move start left)    r = right (move start right)");
    console.log("  w = wider (move end right)    n = narrower (move end left)");
    console.log("  ↑ = top up    Shift+↑ = top down    ↓ = bottom down    Shift+↓ = bottom up");
    console.log("  [Enter] = next    [Left Arrow] = previous");
    console.log("");

    const { key, name, shift } = await readKey();

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
      // left: move THIS character's start left (decrease offsets[charIndex])
      // Also prevents previous character from getting too wide (if charIndex > 0)
      row.offsets[charIndex] = row.offsets[charIndex] - 1;
    } else if (key === "r") {
      // right: move THIS character's start right (increase offsets[charIndex])
      // But not past the character's end
      if (row.offsets[charIndex] < row.offsets[charIndex + 1] - 1) {
        row.offsets[charIndex] = row.offsets[charIndex] + 1;
      }
    } else if (key === "w") {
      // wider: move NEXT character's start right (increase offsets[charIndex + 1])
      row.offsets[charIndex + 1] = row.offsets[charIndex + 1] + 1;
    } else if (key === "n") {
      // narrower: move NEXT character's start left (decrease offsets[charIndex + 1])
      // But not before the current character's start + 1 (must leave at least 1 column)
      if (row.offsets[charIndex + 1] > row.offsets[charIndex] + 1) {
        row.offsets[charIndex + 1] = row.offsets[charIndex + 1] - 1;
      }
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

  const fontName = args[0].replace(".json", "").replace(".txt", "");
  const jsonPath = `src/fonts/${fontName}.json`;
  const txtPath = `src/fonts/${fontName}.txt`;

  if (!existsSync(jsonPath)) {
    console.error(`❌ JSON file not found: ${jsonPath}`);
    process.exit(1);
  }

  if (!existsSync(txtPath)) {
    console.error(`❌ Font file not found: ${txtPath}`);
    process.exit(1);
  }

  const metadata: FontMetadata = JSON.parse(readFileSync(jsonPath, "utf-8"));
  const lines = readFileSync(txtPath, "utf-8").split("\n");

  console.log(`\n🎨 Adjusting font: ${fontName}\n`);
  console.log(`Loaded ${metadata.rows.length} rows\n`);

  const startChar = args[1] || "";

  // Find starting position
  let currentRowIndex = 0;
  let currentCharIndex = 0;

  if (startChar) {
    outer: for (let ri = 0; ri < metadata.rows.length; ri++) {
      const row = metadata.rows[ri];
      for (let ci = 0; ci < row.chars.length; ci++) {
        if (row.chars[ci] === startChar) {
          currentRowIndex = ri;
          currentCharIndex = ci;
          break outer;
        }
      }
    }
  }

  while (currentRowIndex < metadata.rows.length) {
    const row = metadata.rows[currentRowIndex];

    while (currentCharIndex >= 0 && currentCharIndex < row.chars.length) {
      const result = await adjustCharacter(lines, metadata, currentRowIndex, currentCharIndex);

      // Save after each character
      writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));

      if (result.action === 'next') {
        currentCharIndex++;
      } else if (result.action === 'prev') {
        currentCharIndex--;
        if (currentCharIndex < 0) {
          // Go to previous row
          currentRowIndex--;
          if (currentRowIndex >= 0) {
            currentCharIndex = metadata.rows[currentRowIndex].chars.length - 1;
          } else {
            currentRowIndex = 0;
            currentCharIndex = 0;
          }
        }
      }
    }

    // Move to next row
    currentRowIndex++;
    currentCharIndex = 0;
  }

  console.log(`\n✅ All adjustments saved to: ${jsonPath}`);
}

main().catch(console.error);
