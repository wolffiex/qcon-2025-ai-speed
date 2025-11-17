/**
 * ANSI escape sequence parser for terminal emulation.
 *
 * Maintains a 2D buffer of cells with characters and styling. Colors are stored
 * as strings (rgb() or #hex) for later conversion to OpenTUI's RGBA format.
 */

export interface TerminalCell {
  char: string;
  fg?: string;  // Color as "rgb(r,g,b)" or "#rrggbb"
  bg?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface CursorState {
  x: number;
  y: number;
  fg?: string;
  bg?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export class AnsiParser {
  private cursor: CursorState = { x: 0, y: 0 };
  private buffer: TerminalCell[][] = [];
  private rows: number;
  private cols: number;
  private saved_cursor: CursorState | null = null;

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.clear();
  }

  clear() {
    this.buffer = Array(this.rows)
      .fill(null)
      .map(() =>
        Array(this.cols)
          .fill(null)
          .map(() => ({ char: " " }))
      );
    this.cursor = { x: 0, y: 0 };
  }

  write(data: string) {
    let i = 0;
    while (i < data.length) {
      const char = data[i];

      // Handle escape sequences
      if (char === "\x1b" || char === "\u001b") {
        const seq_result = this.parse_escape_sequence(data.slice(i));
        if (seq_result) {
          i += seq_result.length;
          continue;
        }
      }

      // Handle special characters
      if (char === "\r") {
        this.cursor.x = 0;
      } else if (char === "\n") {
        this.cursor.y++;
        if (this.cursor.y >= this.rows) {
          // Scroll up
          this.scroll_up();
          this.cursor.y = this.rows - 1;
        }
      } else if (char === "\b") {
        this.cursor.x = Math.max(0, this.cursor.x - 1);
      } else if (char === "\t") {
        this.cursor.x = Math.min(this.cols - 1, ((this.cursor.x + 8) >> 3) << 3);
      } else {
        // Regular character
        this.write_char(char);
      }

      i++;
    }
  }

  private write_char(char: string) {
    if (this.cursor.y >= this.rows) {
      this.scroll_up();
      this.cursor.y = this.rows - 1;
    }

    if (this.cursor.x >= this.cols) {
      this.cursor.x = 0;
      this.cursor.y++;
      if (this.cursor.y >= this.rows) {
        this.scroll_up();
        this.cursor.y = this.rows - 1;
      }
    }

    this.buffer[this.cursor.y][this.cursor.x] = {
      char,
      fg: this.cursor.fg,
      bg: this.cursor.bg,
      bold: this.cursor.bold,
      italic: this.cursor.italic,
      underline: this.cursor.underline,
    };

    this.cursor.x++;
  }

  private scroll_up() {
    this.buffer.shift();
    this.buffer.push(
      Array(this.cols)
        .fill(null)
        .map(() => ({ char: " " }))
    );
  }

  private parse_escape_sequence(text: string): { length: number } | null {
    // CSI sequences: ESC [ params letter
    const csi_match = text.match(/^\x1b\[([0-9;?]*)([A-Za-z])/);
    if (csi_match) {
      const params = csi_match[1].split(";").map((p) => parseInt(p) || 0);
      const command = csi_match[2];
      this.handle_csi(params, command);
      return { length: csi_match[0].length };
    }

    // OSC sequences: ESC ] params BEL or ESC ] params ESC \
    const osc_match = text.match(/^\x1b\]([^\x07\x1b]*?)(\x07|\x1b\\)/);
    if (osc_match) {
      // Ignore OSC sequences (window title, etc.)
      return { length: osc_match[0].length };
    }

    // Single character escapes
    const simple_match = text.match(/^\x1b([7-8DEHM>])/);
    if (simple_match) {
      this.handle_simple_escape(simple_match[1]);
      return { length: simple_match[0].length };
    }

    // Unknown escape - skip ESC + next char
    return { length: 2 };
  }

  private handle_csi(params: number[], command: string) {
    switch (command) {
      case "A": // Cursor up
        this.cursor.y = Math.max(0, this.cursor.y - (params[0] || 1));
        break;
      case "B": // Cursor down
        this.cursor.y = Math.min(this.rows - 1, this.cursor.y + (params[0] || 1));
        break;
      case "C": // Cursor forward
        this.cursor.x = Math.min(this.cols - 1, this.cursor.x + (params[0] || 1));
        break;
      case "D": // Cursor back
        this.cursor.x = Math.max(0, this.cursor.x - (params[0] || 1));
        break;
      case "H": // Cursor position
      case "f":
        this.cursor.y = Math.max(0, Math.min(this.rows - 1, (params[0] || 1) - 1));
        this.cursor.x = Math.max(0, Math.min(this.cols - 1, (params[1] || 1) - 1));
        break;
      case "J": // Erase in display
        this.handle_erase_display(params[0] || 0);
        break;
      case "K": // Erase in line
        this.handle_erase_line(params[0] || 0);
        break;
      case "m": // SGR - Select Graphic Rendition
        this.handle_sgr(params);
        break;
      case "s": // Save cursor position
        this.saved_cursor = { ...this.cursor };
        break;
      case "u": // Restore cursor position
        if (this.saved_cursor) {
          this.cursor = { ...this.saved_cursor };
        }
        break;
    }
  }

  private handle_simple_escape(char: string) {
    switch (char) {
      case "7": // Save cursor
        this.saved_cursor = { ...this.cursor };
        break;
      case "8": // Restore cursor
        if (this.saved_cursor) {
          this.cursor = { ...this.saved_cursor };
        }
        break;
      case "M": // Reverse index (cursor up with scroll)
        if (this.cursor.y === 0) {
          this.scroll_down();
        } else {
          this.cursor.y--;
        }
        break;
    }
  }

  private scroll_down() {
    this.buffer.pop();
    this.buffer.unshift(
      Array(this.cols)
        .fill(null)
        .map(() => ({ char: " " }))
    );
  }

  private handle_erase_display(mode: number) {
    switch (mode) {
      case 0: // Erase below
        for (let y = this.cursor.y; y < this.rows; y++) {
          for (let x = y === this.cursor.y ? this.cursor.x : 0; x < this.cols; x++) {
            this.buffer[y][x] = { char: " " };
          }
        }
        break;
      case 1: // Erase above
        for (let y = 0; y <= this.cursor.y; y++) {
          for (let x = 0; x < (y === this.cursor.y ? this.cursor.x : this.cols); x++) {
            this.buffer[y][x] = { char: " " };
          }
        }
        break;
      case 2: // Erase all
      case 3:
        this.clear();
        break;
    }
  }

  private handle_erase_line(mode: number) {
    const y = this.cursor.y;
    switch (mode) {
      case 0: // Erase to right
        for (let x = this.cursor.x; x < this.cols; x++) {
          this.buffer[y][x] = { char: " " };
        }
        break;
      case 1: // Erase to left
        for (let x = 0; x <= this.cursor.x; x++) {
          this.buffer[y][x] = { char: " " };
        }
        break;
      case 2: // Erase entire line
        for (let x = 0; x < this.cols; x++) {
          this.buffer[y][x] = { char: " " };
        }
        break;
    }
  }

  private handle_sgr(params: number[]) {
    if (params.length === 0) params = [0];

    for (let i = 0; i < params.length; i++) {
      const param = params[i];

      if (param === 0) {
        // Reset
        this.cursor.fg = undefined;
        this.cursor.bg = undefined;
        this.cursor.bold = false;
        this.cursor.italic = false;
        this.cursor.underline = false;
      } else if (param === 1) {
        this.cursor.bold = true;
      } else if (param === 3) {
        this.cursor.italic = true;
      } else if (param === 4) {
        this.cursor.underline = true;
      } else if (param === 22) {
        this.cursor.bold = false;
      } else if (param === 23) {
        this.cursor.italic = false;
      } else if (param === 24) {
        this.cursor.underline = false;
      } else if (param >= 30 && param <= 37) {
        // Foreground color
        this.cursor.fg = this.ansi_color(param - 30);
      } else if (param === 38) {
        // Extended foreground color
        if (params[i + 1] === 5) {
          // 256 color
          this.cursor.fg = this.ansi_256_color(params[i + 2]);
          i += 2;
        } else if (params[i + 1] === 2) {
          // RGB color
          const r = params[i + 2];
          const g = params[i + 3];
          const b = params[i + 4];
          this.cursor.fg = `rgb(${r},${g},${b})`;
          i += 4;
        }
      } else if (param === 39) {
        this.cursor.fg = undefined;
      } else if (param >= 40 && param <= 47) {
        // Background color
        this.cursor.bg = this.ansi_color(param - 40);
      } else if (param === 48) {
        // Extended background color
        if (params[i + 1] === 5) {
          // 256 color
          this.cursor.bg = this.ansi_256_color(params[i + 2]);
          i += 2;
        } else if (params[i + 1] === 2) {
          // RGB color
          const r = params[i + 2];
          const g = params[i + 3];
          const b = params[i + 4];
          this.cursor.bg = `rgb(${r},${g},${b})`;
          i += 4;
        }
      } else if (param === 49) {
        this.cursor.bg = undefined;
      }
    }
  }

  private ansi_color(index: number): string {
    const colors = [
      "#000000", // Black
      "#cd0000", // Red
      "#00cd00", // Green
      "#cdcd00", // Yellow
      "#0000ee", // Blue
      "#cd00cd", // Magenta
      "#00cdcd", // Cyan
      "#e5e5e5", // White
    ];
    return colors[index] || "#ffffff";
  }

  private ansi_256_color(index: number): string {
    // Simplified 256 color palette
    if (index < 16) {
      // Standard colors
      return this.ansi_color(index % 8);
    } else if (index >= 232) {
      // Grayscale
      const gray = (index - 232) * 10 + 8;
      return `rgb(${gray},${gray},${gray})`;
    } else {
      // 216 color cube (6x6x6)
      const i = index - 16;
      const r = Math.floor(i / 36) * 51;
      const g = (Math.floor(i / 6) % 6) * 51;
      const b = (i % 6) * 51;
      return `rgb(${r},${g},${b})`;
    }
  }

  get_buffer(): TerminalCell[][] {
    return this.buffer;
  }

  get_text(): string {
    return this.buffer.map((row) => row.map((cell) => cell.char).join("")).join("\n");
  }

  get_ansi_text(): string {
    // Reconstruct terminal output with ANSI escape codes.
    // Only emits codes when style changes to minimize escape sequence bloat.
    let result = "";
    let current_fg: string | undefined = undefined;
    let current_bg: string | undefined = undefined;
    let current_bold = false;
    let current_italic = false;
    let current_underline = false;
    let has_any_style = false;

    for (const row of this.buffer) {
      for (const cell of row) {
        // Normalize undefined booleans to false for comparison
        const cell_bold = cell.bold || false;
        const cell_italic = cell.italic || false;
        const cell_underline = cell.underline || false;

        // Check if we need to change styles
        const needs_update =
          cell.fg !== current_fg ||
          cell.bg !== current_bg ||
          cell_bold !== current_bold ||
          cell_italic !== current_italic ||
          cell_underline !== current_underline;

        if (needs_update) {
          // Only emit codes if there's actually a style to apply
          const will_have_style = cell.fg || cell.bg || cell_bold || cell_italic || cell_underline;

          if (has_any_style && !will_have_style) {
            // Reset when going from styled to unstyled
            result += "\x1b[0m";
          } else if (will_have_style) {
            // Apply new styles
            if (has_any_style) {
              // Reset first if we had previous styles
              result += "\x1b[0m";
            }

            if (cell_bold) result += "\x1b[1m";
            if (cell_italic) result += "\x1b[3m";
            if (cell_underline) result += "\x1b[4m";

            // Apply foreground color if present
            if (cell.fg) {
              // Check if it's RGB format
              const rgb_match = cell.fg.match(/rgb\((\d+),(\d+),(\d+)\)/);
              if (rgb_match) {
                const [, r, g, b] = rgb_match;
                result += `\x1b[38;2;${r};${g};${b}m`;
              } else {
                // Hex color - convert to RGB
                const hex_match = cell.fg.match(/#([0-9a-fA-F]{6})/);
                if (hex_match) {
                  const hex = hex_match[1];
                  const r = parseInt(hex.substr(0, 2), 16);
                  const g = parseInt(hex.substr(2, 2), 16);
                  const b = parseInt(hex.substr(4, 2), 16);
                  result += `\x1b[38;2;${r};${g};${b}m`;
                }
              }
            }

            // Apply background color if present
            if (cell.bg) {
              const rgb_match = cell.bg.match(/rgb\((\d+),(\d+),(\d+)\)/);
              if (rgb_match) {
                const [, r, g, b] = rgb_match;
                result += `\x1b[48;2;${r};${g};${b}m`;
              } else {
                const hex_match = cell.bg.match(/#([0-9a-fA-F]{6})/);
                if (hex_match) {
                  const hex = hex_match[1];
                  const r = parseInt(hex.substr(0, 2), 16);
                  const g = parseInt(hex.substr(2, 2), 16);
                  const b = parseInt(hex.substr(4, 2), 16);
                  result += `\x1b[48;2;${r};${g};${b}m`;
                }
              }
            }
          }

          current_fg = cell.fg;
          current_bg = cell.bg;
          current_bold = cell_bold;
          current_italic = cell_italic;
          current_underline = cell_underline;
          has_any_style = will_have_style;
        }

        result += cell.char;
      }

      // Reset at end of line if we have any active styles
      if (has_any_style) {
        result += "\x1b[0m";
        has_any_style = false;
        current_fg = undefined;
        current_bg = undefined;
        current_bold = false;
        current_italic = false;
        current_underline = false;
      }
      result += "\n";
    }

    return result;
  }
}
