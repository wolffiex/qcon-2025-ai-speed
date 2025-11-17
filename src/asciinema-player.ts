import { BoxRenderable, TextRenderable, type CliRenderer } from "@opentui/core";
import { AnsiParser } from "./ansi-parser";
import { terminal_buffer_to_styled_text } from "./ansi-to-styled-text";

/**
 * Asciinema cast player for OpenTUI.
 *
 * Plays back .cast files (v2/v3 format) with full color support. Cast files use
 * relative timestamps (deltas), which we convert to absolute times for playback.
 */

interface CastHeader {
  version: number;
  width: number;
  height: number;
  timestamp?: number;
  term?: {
    cols: number;
    rows: number;
    type?: string;
  };
}

interface CastEvent {
  time: number;  // Absolute time after delta conversion
  type: string;
  data: string;
}

export interface AsciinemaPlayerOptions {
  position?: { x: number; y: number };
  viewport?: {
    top?: number;
    left?: number;
    width?: number;
    height?: number;
  };
  autoplay?: boolean;
  loop?: boolean;
  speed?: number; // Playback speed multiplier (1.0 = normal)
}

export class AsciinemaPlayer {
  private renderer: CliRenderer;
  private header: CastHeader;
  private events: CastEvent[];
  private box: BoxRenderable;
  private textRenderable: TextRenderable;

  private current_frame = 0;
  private ansi_parser: AnsiParser;
  private is_playing = false;
  private start_time = 0;
  private animation_frame_id: number | null = null;

  // Options
  private viewport: Required<NonNullable<AsciinemaPlayerOptions["viewport"]>>;
  private speed: number;
  private loop: boolean;

  constructor(
    renderer: CliRenderer,
    cast_content: string,
    options: AsciinemaPlayerOptions = {}
  ) {
    this.renderer = renderer;
    this.speed = options.speed ?? 1.0;
    this.loop = options.loop ?? false;

    // Parse cast file (JSON-lines format: header + events)
    const lines = cast_content.trim().split("\n");
    this.header = JSON.parse(lines[0]);

    // Convert relative timestamps (deltas) to absolute times for playback.
    // Cast format: [delta, "o", "data"] where delta is seconds since last event.
    let absolute_time = 0;
    this.events = lines.slice(1)
      .filter(line => line.trim())
      .map((line) => {
        const [delta_time, type, data] = JSON.parse(line);
        absolute_time += delta_time;
        return { time: absolute_time, type, data };
      });

    // Initialize ANSI parser
    const rows = this.header.term?.rows ?? this.header.height ?? 24;
    const cols = this.header.term?.cols ?? this.header.width ?? 80;
    this.ansi_parser = new AnsiParser(rows, cols);

    // Set up viewport (default to full terminal)
    this.viewport = {
      top: options.viewport?.top ?? 0,
      left: options.viewport?.left ?? 0,
      width: options.viewport?.width ?? cols,
      height: options.viewport?.height ?? rows,
    };

    // Create renderables
    const pos = options.position ?? { x: 5, y: 5 };
    this.box = new BoxRenderable(renderer, {
      position: "absolute",
      left: pos.x,
      top: pos.y,
      width: this.viewport.width + 2,
      height: this.viewport.height + 2,
      zIndex: 10,
      backgroundColor: "#000000",
    });

    this.textRenderable = new TextRenderable(renderer, {
      content: "",
    });

    this.box.add(this.textRenderable);
    renderer.root.add(this.box);

    if (options.autoplay) {
      this.play();
    }
  }

  play() {
    if (this.is_playing) return;

    this.is_playing = true;
    this.start_time = Date.now() - (this.events[this.current_frame]?.time ?? 0) * 1000;
    this.tick();
  }

  pause() {
    this.is_playing = false;
    if (this.animation_frame_id !== null) {
      clearTimeout(this.animation_frame_id);
      this.animation_frame_id = null;
    }
  }

  reset() {
    this.pause();
    this.current_frame = 0;
    this.ansi_parser.clear();
    this.render();
  }

  private tick() {
    if (!this.is_playing) return;

    const elapsed = (Date.now() - this.start_time) / 1000 * this.speed;

    // Process all events up to current time
    let processed_any = false;
    while (
      this.current_frame < this.events.length &&
      this.events[this.current_frame].time <= elapsed
    ) {
      const event = this.events[this.current_frame];
      if (event.type === "o") {
        this.process_output(event.data);
        processed_any = true;
      }
      this.current_frame++;
    }

    // Only render if we processed something
    if (processed_any) {
      this.render();
    }

    // Check if we're done
    if (this.current_frame >= this.events.length) {
      if (this.loop) {
        this.reset();
        this.play();
      } else {
        this.pause();
      }
      return;
    }

    // Tick at 30fps for smooth rendering. Wait longer if next event is far away.
    const next_event_time = this.events[this.current_frame].time;
    const time_until_next = (next_event_time - elapsed) * 1000 / this.speed;
    const frame_delay = 1000 / 30;
    const delay = Math.max(frame_delay, Math.min(time_until_next, frame_delay));

    this.animation_frame_id = setTimeout(() => this.tick(), delay) as any;
  }

  private process_output(data: string) {
    // Use ANSI parser to process terminal output
    this.ansi_parser.write(data);
  }

  private render() {
    // Get terminal buffer and convert to StyledText for color support
    const buffer = this.ansi_parser.get_buffer();

    // Extract viewport from buffer
    const visible_buffer = buffer
      .slice(this.viewport.top, this.viewport.top + this.viewport.height)
      .map(row =>
        row.slice(this.viewport.left, this.viewport.left + this.viewport.width)
      );

    // Convert to StyledText
    const styled_text = terminal_buffer_to_styled_text(visible_buffer);

    this.textRenderable.content = styled_text;
    this.renderer.requestRender();
  }

  destroy() {
    this.pause();
    this.renderer.root.remove(this.box._id);
  }

  // Viewport controls
  set_viewport(top: number, left: number, width?: number, height?: number) {
    this.viewport.top = top;
    this.viewport.left = left;
    if (width !== undefined) this.viewport.width = width;
    if (height !== undefined) this.viewport.height = height;
    this.render();
  }

  pan(dx: number, dy: number) {
    this.viewport.left = Math.max(0, this.viewport.left + dx);
    this.viewport.top = Math.max(0, this.viewport.top + dy);
    this.render();
  }
}
