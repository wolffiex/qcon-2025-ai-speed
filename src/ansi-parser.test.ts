import { test, expect } from "bun:test";
import { AnsiParser } from "./ansi-parser";

test("basic text output", () => {
  const parser = new AnsiParser(5, 20);
  parser.write("Hello World");
  const text = parser.get_text();

  console.log("=== Basic Text Test ===");
  console.log("Output:", JSON.stringify(text.split("\n")[0]));
  expect(text.split("\n")[0]).toContain("Hello World");
});

test("newline handling", () => {
  const parser = new AnsiParser(5, 20);
  parser.write("Line 1\nLine 2");
  const text = parser.get_text();

  console.log("\n=== Newline Test ===");
  console.log("Line 0:", JSON.stringify(text.split("\n")[0]));
  console.log("Line 1:", JSON.stringify(text.split("\n")[1]));

  expect(text.split("\n")[0]).toContain("Line 1");
  expect(text.split("\n")[1]).toContain("Line 2");
});

test("carriage return handling", () => {
  const parser = new AnsiParser(5, 20);
  parser.write("Hello\rWorld");
  const text = parser.get_text();

  console.log("\n=== Carriage Return Test ===");
  console.log("Output:", JSON.stringify(text.split("\n")[0]));
  // Should overwrite - "World" should be at start of line
  expect(text.split("\n")[0]).toContain("World");
});

test("simple cursor movement", () => {
  const parser = new AnsiParser(5, 20);
  parser.write("Hello");
  parser.write("\x1b[1;1H"); // Move to position 1,1
  parser.write("X");
  const text = parser.get_text();

  console.log("\n=== Cursor Movement Test ===");
  console.log("Output:", JSON.stringify(text.split("\n")[0]));
  // X should overwrite the H
  expect(text.split("\n")[0].charAt(0)).toBe("X");
});

test("foreground color - basic ANSI", () => {
  const parser = new AnsiParser(5, 20);
  parser.write("\x1b[31mRed Text\x1b[0m");
  const buffer = parser.get_buffer();

  console.log("\n=== Foreground Color Test ===");
  console.log("First cell:", buffer[0][0]);
  console.log("Color:", buffer[0][0].fg);

  // Check that the R has a foreground color set
  expect(buffer[0][0].fg).toBeDefined();
  expect(buffer[0][0].char).toBe("R");
});

test("foreground color - 256 color", () => {
  const parser = new AnsiParser(5, 20);
  parser.write("\x1b[38;5;196mBright Red\x1b[0m");
  const buffer = parser.get_buffer();

  console.log("\n=== 256 Color Test ===");
  console.log("First cell:", buffer[0][0]);
  console.log("Color:", buffer[0][0].fg);

  expect(buffer[0][0].fg).toBeDefined();
  expect(buffer[0][0].char).toBe("B");
});

test("foreground color - RGB", () => {
  const parser = new AnsiParser(5, 20);
  parser.write("\x1b[38;2;255;0;0mRGB Red\x1b[0m");
  const buffer = parser.get_buffer();

  console.log("\n=== RGB Color Test ===");
  console.log("First cell:", buffer[0][0]);
  console.log("Color:", buffer[0][0].fg);

  expect(buffer[0][0].fg).toBe("rgb(255,0,0)");
  expect(buffer[0][0].char).toBe("R");
});

test("ANSI reconstruction - simple text", () => {
  const parser = new AnsiParser(3, 20);
  parser.write("Plain text");
  const ansi_text = parser.get_ansi_text();

  console.log("\n=== ANSI Reconstruction - Plain ===");
  console.log("Output:", JSON.stringify(ansi_text.split("\n")[0]));

  expect(ansi_text).toContain("Plain text");
});

test("ANSI reconstruction - with color", () => {
  const parser = new AnsiParser(3, 20);
  parser.write("\x1b[38;2;255;0;0mRed\x1b[0m");
  const ansi_text = parser.get_ansi_text();

  console.log("\n=== ANSI Reconstruction - Color ===");
  console.log("Output:", JSON.stringify(ansi_text.split("\n")[0]));
  console.log("Contains RGB code:", ansi_text.includes("38;2;255;0;0"));

  // Should contain the RGB escape sequence
  expect(ansi_text).toContain("38;2;255;0;0");
  expect(ansi_text).toContain("Red");
});

test("ANSI reconstruction - visual test", () => {
  const parser = new AnsiParser(5, 40);

  // Write some colorful text
  parser.write("\x1b[31mRed \x1b[32mGreen \x1b[34mBlue\x1b[0m\n");
  parser.write("\x1b[38;2;255;165;0mOrange \x1b[38;2;128;0;128mPurple\x1b[0m\n");
  parser.write("\x1b[1mBold \x1b[3mItalic \x1b[4mUnderline\x1b[0m");

  const ansi_text = parser.get_ansi_text();

  console.log("\n=== ANSI Reconstruction - Visual ===");
  console.log("This should show colors if your terminal supports it:");
  console.log(ansi_text);
  console.log("===\n");

  expect(ansi_text.length).toBeGreaterThan(0);
});

test("real asciinema sequence", () => {
  const parser = new AnsiParser(24, 80);

  // Simulate a real asciinema output with prompt
  parser.write("\x1b[1m\x1b[7m%\x1b[27m\x1b[1m\x1b[0m");
  parser.write("                                                                          \r \r");
  parser.write("\r\x1b[0m\x1b[27m\x1b[24m\x1b[J");
  parser.write("\x1b[38;5;109m\x1b[48;5;238mwolffiex@owl\x1b[39m\x1b[49m");
  parser.write("\x1b[38;5;238m\x1b[48;5;236m");
  parser.write("\x1b[38;5;73m\x1b[48;5;236m/code/test\x1b[49m\x1b[38;5;236m\x1b[39m\x1b[49m");
  parser.write("$ ");

  const ansi_text = parser.get_ansi_text();

  console.log("\n=== Real Asciinema Sequence ===");
  console.log("Output (should show colored prompt):");
  console.log(ansi_text.split("\n")[0]);
  console.log("===\n");

  expect(ansi_text).toContain("wolffiex@owl");
  expect(ansi_text).toContain("$");
});
