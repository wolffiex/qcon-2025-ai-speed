import { StyledText, RGBA } from "@opentui/core";
import type { TerminalCell } from "./ansi-parser";
import type { TextChunk } from "@opentui/core/text-buffer";

/**
 * Bridge between ANSI parser and OpenTUI rendering.
 *
 * OpenTUI doesn't interpret ANSI escape codes in TextRenderable - it requires
 * pre-parsed TextChunks with RGBA objects (not color strings) and an attributes
 * bitmask for styling. This module performs that conversion.
 */

function color_to_rgba(color: string): RGBA | undefined {
  // Check if it's RGB format
  const rgb_match = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (rgb_match) {
    const r = parseInt(rgb_match[1]);
    const g = parseInt(rgb_match[2]);
    const b = parseInt(rgb_match[3]);
    return RGBA.fromInts(r, g, b, 255);
  }

  // Check if it's hex format
  const hex_match = color.match(/#([0-9a-fA-F]{6})/);
  if (hex_match) {
    return RGBA.fromHex(color);
  }

  return undefined;
}

/**
 * Convert a buffer of terminal cells (from ANSI parser) to OpenTUI's StyledText
 */
export function terminal_buffer_to_styled_text(buffer: TerminalCell[][]): StyledText {
  const chunks: TextChunk[] = [];

  for (const row of buffer) {
    let current_text = "";
    let current_fg: RGBA | undefined = undefined;
    let current_bg: RGBA | undefined = undefined;
    let current_bold = false;
    let current_italic = false;
    let current_underline = false;

    for (const cell of row) {
      // Convert colors to RGBA
      const cell_fg = cell.fg ? color_to_rgba(cell.fg) : undefined;
      const cell_bg = cell.bg ? color_to_rgba(cell.bg) : undefined;
      const cell_bold = cell.bold || false;
      const cell_italic = cell.italic || false;
      const cell_underline = cell.underline || false;

      // Check if style changed
      const style_changed =
        cell_fg !== current_fg ||
        cell_bg !== current_bg ||
        cell_bold !== current_bold ||
        cell_italic !== current_italic ||
        cell_underline !== current_underline;

      if (style_changed && current_text) {
        // Flush previous chunk
        chunks.push(
          make_chunk(current_text, current_fg, current_bg, current_bold, current_italic, current_underline)
        );
        current_text = "";
      }

      current_text += cell.char;
      current_fg = cell_fg;
      current_bg = cell_bg;
      current_bold = cell_bold;
      current_italic = cell_italic;
      current_underline = cell_underline;
    }

    // Flush remaining text from this row
    if (current_text) {
      chunks.push(
        make_chunk(current_text, current_fg, current_bg, current_bold, current_italic, current_underline)
      );
    }

    // Add newline chunk
    chunks.push({ __isChunk: true as const, text: "\n" });
  }

  return new StyledText(chunks);
}

function make_chunk(
  text: string,
  fg: RGBA | undefined,
  bg: RGBA | undefined,
  bold: boolean,
  italic: boolean,
  underline: boolean
): TextChunk {
  const chunk: TextChunk = { __isChunk: true as const, text };

  if (fg) chunk.fg = fg;
  if (bg) chunk.bg = bg;

  // OpenTUI uses a bitmask for text attributes (not individual booleans)
  let attributes = 0;
  if (bold) attributes |= 1;
  if (italic) attributes |= 2;
  if (underline) attributes |= 4;

  if (attributes > 0) {
    chunk.attributes = attributes;
  }

  return chunk;
}
