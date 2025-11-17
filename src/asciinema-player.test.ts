import { test, expect } from "bun:test";
import { AnsiParser } from "./ansi-parser";

// Test 1: Can we parse a simple cast file?
test("parse cast file format", () => {
  const cast_content = `{"version":2,"width":80,"height":24}
[0.5,"o","Hello"]
[1.0,"o"," "]
[1.5,"o","World"]
[2.0,"o","\\n"]`;

  const lines = cast_content.trim().split("\n");
  const header = JSON.parse(lines[0]);
  const events = lines.slice(1).map((line) => {
    const [time, type, data] = JSON.parse(line);
    return { time, type, data };
  });

  console.log("\n=== Cast File Parsing ===");
  console.log("Header:", header);
  console.log("Events:", events);

  expect(header.width).toBe(80);
  expect(events.length).toBe(4);
  expect(events[0].data).toBe("Hello");
});

// Test 2: Can we process events through the ANSI parser?
test("process cast events sequentially", () => {
  const parser = new AnsiParser(24, 80);

  const events = [
    { time: 0.5, type: "o", data: "$ " },
    { time: 1.0, type: "o", data: "echo" },
    { time: 1.5, type: "o", data: " " },
    { time: 2.0, type: "o", data: "hello" },
    { time: 2.5, type: "o", data: "\r\n" },
    { time: 3.0, type: "o", data: "hello\r\n" },
  ];

  console.log("\n=== Sequential Event Processing ===");

  for (const event of events) {
    if (event.type === "o") {
      parser.write(event.data);
    }
  }

  const text = parser.get_text();
  console.log("Final buffer (first 3 lines):");
  text.split("\n").slice(0, 3).forEach((line, i) => {
    console.log(`  Line ${i}: "${line}"`);
  });

  expect(text).toContain("$ echo hello");
  expect(text).toContain("hello");
});

// Test 3: Can we handle colored output?
test("process cast events with colors", () => {
  const parser = new AnsiParser(24, 80);

  parser.write("\x1b[38;5;109m\x1b[48;5;238muser@host\x1b[39m\x1b[49m");
  parser.write("$ ");

  const ansi_text = parser.get_ansi_text();

  console.log("\n=== Colored Event Processing ===");
  console.log("First line with colors:");
  console.log(ansi_text.split("\n")[0]);
  console.log("\nRaw (JSON):", JSON.stringify(ansi_text.split("\n")[0]));

  expect(ansi_text).toContain("user@host");
  expect(ansi_text).toContain("$");
});

// Test 4: Load and parse the actual test.cast file
test("load and parse real cast file", async () => {
  const cast_content = await Bun.file("./static/test.cast").text();
  const lines = cast_content.trim().split("\n");
  const header = JSON.parse(lines[0]);
  const events = lines.slice(1).map((line) => {
    const [time, type, data] = JSON.parse(line);
    return { time, type, data };
  });

  console.log("\n=== Real Cast File ===");
  console.log("Header:", {
    version: header.version,
    width: header.term?.cols || header.width,
    height: header.term?.rows || header.height,
  });
  console.log("Total events:", events.length);
  console.log("First 5 events:");
  events.slice(0, 5).forEach((e, i) => {
    console.log(`  ${i}: time=${e.time.toFixed(3)}s type=${e.type} data=${JSON.stringify(e.data).slice(0, 60)}`);
  });
  console.log("Last 5 events:");
  events.slice(-5).forEach((e, i) => {
    console.log(`  ${i}: time=${e.time.toFixed(3)}s type=${e.type} data=${JSON.stringify(e.data).slice(0, 60)}`);
  });

  expect(events.length).toBeGreaterThan(0);
});

// Test 5: Simulate playback timing
test("simulate playback with timing", async () => {
  const cast_content = `{"version":2,"width":80,"height":24}
[0.0,"o","$ "]
[1.0,"o","e"]
[1.1,"o","c"]
[1.2,"o","h"]
[1.3,"o","o"]
[2.0,"o","\\r\\n"]
[2.5,"o","output\\r\\n"]`;

  const lines = cast_content.trim().split("\n");
  const events = lines.slice(1).map((line) => {
    const [time, type, data] = JSON.parse(line);
    return { time, type, data };
  });

  const parser = new AnsiParser(24, 80);
  let current_frame = 0;
  const snapshots: string[] = [];

  console.log("\n=== Playback Timing Simulation ===");

  // Simulate time progression at 10fps (100ms per frame)
  const fps = 10;
  const frame_time = 1.0 / fps;

  for (let elapsed = 0; elapsed <= 3.0; elapsed += frame_time) {
    // Process all events up to current time
    while (
      current_frame < events.length &&
      events[current_frame].time <= elapsed
    ) {
      const event = events[current_frame];
      if (event.type === "o") {
        parser.write(event.data);
      }
      current_frame++;
    }

    const snapshot = parser.get_text().split("\n")[0];
    if (snapshot !== snapshots[snapshots.length - 1]) {
      console.log(`  t=${elapsed.toFixed(2)}s: "${snapshot}"`);
      snapshots.push(snapshot);
    }
  }

  expect(snapshots.length).toBeGreaterThan(3); // Should have multiple frames
});

// Test 6: Process a chunk of the real file
test("process first 10 events of real cast", async () => {
  const cast_content = await Bun.file("./static/test.cast").text();
  const lines = cast_content.trim().split("\n");
  const header = JSON.parse(lines[0]);
  const events = lines.slice(1, 11).map((line) => {
    const [time, type, data] = JSON.parse(line);
    return { time, type, data };
  });

  const rows = header.term?.rows || header.height || 24;
  const cols = header.term?.cols || header.width || 80;
  const parser = new AnsiParser(rows, cols);

  console.log("\n=== Processing First 10 Events ===");

  events.forEach((event, i) => {
    if (event.type === "o") {
      parser.write(event.data);
      const first_line = parser.get_text().split("\n")[0];
      console.log(`  Event ${i}: "${first_line.slice(0, 60)}"`);
    }
  });

  const final_text = parser.get_text();
  console.log("\nFinal output (first line):");
  console.log(final_text.split("\n")[0]);
});
