import { test, expect } from "bun:test";

/**
 * Calculate horizontal position for centering multiline text
 * Each line should be centered based on its own length
 */
function center_multiline_text(lines: string[], screen_width: number): number[] {
  return lines.map(line => {
    const line_length = line.length;
    return Math.floor((screen_width - line_length) / 2);
  });
}

test("center_multiline_text - single line", () => {
  const lines = ["HELLO"];
  const screen_width = 80;
  const positions = center_multiline_text(lines, screen_width);

  // "HELLO" is 5 chars, (80 - 5) / 2 = 37.5, floor = 37
  expect(positions).toEqual([37]);
});

test("center_multiline_text - multiple lines of same length", () => {
  const lines = ["HELLO", "WORLD"];
  const screen_width = 80;
  const positions = center_multiline_text(lines, screen_width);

  // Both 5 chars, should have same position
  expect(positions).toEqual([37, 37]);
});

test("center_multiline_text - multiple lines of different lengths", () => {
  const lines = [
    "SHORT",  // 5 chars
    "MEDIUM LINE",  // 11 chars
    "A MUCH LONGER LINE OF TEXT"  // 26 chars
  ];
  const screen_width = 80;
  const positions = center_multiline_text(lines, screen_width);

  // SHORT: (80 - 5) / 2 = 37.5, floor = 37
  // MEDIUM LINE: (80 - 11) / 2 = 34.5, floor = 34
  // LONG: (80 - 26) / 2 = 27
  expect(positions).toEqual([37, 34, 27]);
});

test("center_multiline_text - ASCII art with varying widths", () => {
  const lines = [
    " █████╗ ",  // 8 chars
    "██╔══██╗",  // 8 chars
    "███████║",  // 8 chars
  ];
  const screen_width = 80;
  const positions = center_multiline_text(lines, screen_width);

  // All 8 chars: (80 - 8) / 2 = 36
  expect(positions).toEqual([36, 36, 36]);
});

test("center_multiline_text - handle very long lines", () => {
  const lines = ["A".repeat(100)];
  const screen_width = 80;
  const positions = center_multiline_text(lines, screen_width);

  // Line is longer than screen, result will be negative
  // (80 - 100) / 2 = -10
  expect(positions).toEqual([-10]);
});
