import { createCliRenderer, TextRenderable, BoxRenderable } from "@opentui/core";

// Load ASCII art
const border1 = await Bun.file("./static/border1.txt").text();
const heli = await Bun.file("./static/heli.txt").text();

// Create the renderer
const renderer = await createCliRenderer({
  targetFps: 60,
  useAlternateScreen: true,
});

// Demo: Overlapping layers with ASCII art
// Background layer - helicopter ASCII art
const heliBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 5,
  top: 5,
  width: 70,
  height: 18,
  zIndex: 1,
});

const heliText = new TextRenderable(renderer, {
  content: heli,
});

heliBox.add(heliText);
renderer.root.add(heliBox);

// Middle layer - decorative border
const borderBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 20,
  top: 3,
  width: 30,
  height: 7,
  zIndex: 2,
});

const borderText = new TextRenderable(renderer, {
  content: border1,
});

borderBox.add(borderText);
renderer.root.add(borderBox);

// Top layer - title text
const titleBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 24,
  top: 4,
  width: 25,
  height: 3,
  zIndex: 3,
  backgroundColor: "#000000",
});

const titleText = new TextRenderable(renderer, {
  content: "  Hello OpenTUI!  ",
});

titleBox.add(titleText);
renderer.root.add(titleBox);

// Additional demo: Overlapping colored boxes
const box1 = new BoxRenderable(renderer, {
  position: "absolute",
  left: 10,
  top: 22,
  width: 20,
  height: 5,
  zIndex: 1,
  backgroundColor: "#0000ff",
  border: true,
  borderStyle: "single",
});

const text1 = new TextRenderable(renderer, {
  content: "  Layer 1\n  (Blue)",
});

box1.add(text1);
renderer.root.add(box1);

const box2 = new BoxRenderable(renderer, {
  position: "absolute",
  left: 15,
  top: 24,
  width: 20,
  height: 5,
  zIndex: 2,
  backgroundColor: "#00ff00",
  border: true,
  borderStyle: "double",
});

const text2 = new TextRenderable(renderer, {
  content: "  Layer 2\n  (Green)",
});

box2.add(text2);
renderer.root.add(box2);

const box3 = new BoxRenderable(renderer, {
  position: "absolute",
  left: 20,
  top: 26,
  width: 20,
  height: 5,
  zIndex: 3,
  backgroundColor: "#ff0000",
  border: true,
  borderStyle: "rounded",
});

const text3 = new TextRenderable(renderer, {
  content: "  Layer 3\n  (Red)",
});

box3.add(text3);
renderer.root.add(box3);

// Add instructions
const instructions = new TextRenderable(renderer, {
  content: "Press Ctrl+C to exit",
});

const instructionsBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 2,
  top: 1,
  width: 25,
  height: 1,
  zIndex: 10,
});

instructionsBox.add(instructions);
renderer.root.add(instructionsBox);
