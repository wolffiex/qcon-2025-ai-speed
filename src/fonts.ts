/**
 * ASCII Art Font Rendering Library
 *
 * Loads and renders text using ASCII art fonts.
 * Font metadata is stored in JSON files alongside the font .txt files.
 */

import { readFileSync } from "fs";
import { join } from "path";

export interface Row {
  chars: string;
  top: number;
  bottom: number;
  offsets: number[];
}

export interface FontMetadata {
  name: string;
  rows: Row[];
}

export interface CharMetadata {
  char: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export class Font {
  private metadata: FontMetadata;
  private font_lines: string[];
  private char_cache: Map<string, CharMetadata>;

  constructor(font_name: string) {
    const base_path = join("src/fonts", font_name);

    // Load metadata
    const metadata_path = `${base_path}.json`;
    this.metadata = JSON.parse(readFileSync(metadata_path, "utf-8"));

    // Load font file
    const font_path = `${base_path}.txt`;
    this.font_lines = readFileSync(font_path, "utf-8").split("\n");

    // Build character cache
    this.char_cache = new Map();
    for (const row of this.metadata.rows) {
      for (let i = 0; i < row.chars.length; i++) {
        const char = row.chars[i];
        this.char_cache.set(char, {
          char,
          top: row.top,
          bottom: row.bottom,
          left: row.offsets[i],
          right: row.offsets[i + 1] - 1,
        });
      }
    }
  }

  /**
   * Get the raw metadata for this font
   */
  get_metadata(): FontMetadata {
    return this.metadata;
  }

  /**
   * Get the raw font lines
   */
  get_lines(): string[] {
    return this.font_lines;
  }

  /**
   * Get a specific row by index
   */
  get_row(row_index: number): Row | undefined {
    return this.metadata.rows[row_index];
  }

  /**
   * Get character slice from font file using row and character index
   * This is the canonical way to extract a character from the font
   */
  get_char_slice(row: Row, char_index: number): string[] {
    const left = row.offsets[char_index];
    const right = row.offsets[char_index + 1] - 1;

    const result: string[] = [];
    for (let line_num = row.top; line_num <= row.bottom && line_num < this.font_lines.length; line_num++) {
      const line = this.font_lines[line_num] || "";
      result.push(line.slice(left, right + 1));
    }

    return result;
  }

  /**
   * Get the height of this font in lines
   */
  get height(): number {
    if (this.metadata.rows.length === 0) return 0;
    return this.metadata.rows[0].bottom - this.metadata.rows[0].top + 1;
  }

  /**
   * Get the character metadata for a specific character
   */
  get_char(char: string): CharMetadata | undefined {
    return this.char_cache.get(char);
  }

  /**
   * Render a single character and return as array of strings (one per line)
   */
  render_char(char: string): string[] {
    const meta = this.get_char(char);
    if (!meta) {
      // Return empty space for unknown characters
      return new Array(this.height).fill("");
    }

    const result: string[] = [];
    for (let row = meta.top; row <= meta.bottom && row < this.font_lines.length; row++) {
      const line = this.font_lines[row] || "";
      result.push(line.slice(meta.left, meta.right + 1));
    }

    return result;
  }

  /**
   * Render text string and return as array of strings (one per line)
   * Each line represents one horizontal slice of all the characters
   */
  render(text: string, spacing: number = 1): string[] {
    if (!text) {
      return new Array(this.height).fill("");
    }

    // Initialize result array with empty strings for each line
    const result: string[] = new Array(this.height).fill("");

    // Process each character
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const char_lines = this.render_char(char);

      // Add character to each line
      for (let line_idx = 0; line_idx < this.height; line_idx++) {
        const char_line = char_lines[line_idx] || "";
        result[line_idx] += char_line;

        // Add spacing between characters (except after last char)
        if (i < text.length - 1) {
          result[line_idx] += " ".repeat(spacing);
        }
      }
    }

    return result;
  }

  /**
   * Render text and return as a single string with newlines
   */
  render_to_string(text: string, spacing: number = 1): string {
    return this.render(text, spacing).join("\n");
  }

  /**
   * Get list of available characters in this font
   */
  get_available_chars(): string[] {
    return Array.from(this.char_cache.keys());
  }

  /**
   * Check if a character is available in this font
   */
  has_char(char: string): boolean {
    return this.char_cache.has(char);
  }
}

/**
 * List all available fonts
 */
export function list_fonts(): string[] {
  const { readdirSync } = require("fs");
  const files = readdirSync("src/fonts");
  return files
    .filter((f: string) => f.endsWith(".json"))
    .map((f: string) => f.replace(".json", ""));
}

/**
 * Main function to test font rendering
 */
export async function main() {
  console.log("🎨 ASCII Font Rendering Test\n");

  // List available fonts
  const fonts = list_fonts();
  console.log("📚 Available fonts:");
  fonts.forEach(f => console.log(`  - ${f}`));
  console.log();

  // Test each font if JSON exists
  for (const font_name of fonts) {
    try {
      console.log(`${"=".repeat(60)}`);
      console.log(`Testing font: ${font_name}`);
      console.log(`${"=".repeat(60)}`);

      const font = new Font(font_name);

      console.log(`Height: ${font.height} lines`);
      console.log(`Available chars: ${font.get_available_chars().length}`);
      console.log();

      // Render sample text
      const sample_text = "HELLO";
      console.log(`Rendering: "${sample_text}"\n`);
      console.log(font.render_to_string(sample_text));
      console.log("\n");

      // Show individual character breakdown
      console.log("Individual characters:");
      for (const char of sample_text) {
        console.log(`\n'${char}':`);
        const lines = font.render_char(char);
        lines.forEach(line => console.log(`  |${line}|`));
      }

      console.log("\n");
    } catch (error) {
      console.log(`⚠️  Could not load font '${font_name}': ${error}`);
      console.log();
    }
  }
}

// Run main if executed directly
if (import.meta.main) {
  main();
}
