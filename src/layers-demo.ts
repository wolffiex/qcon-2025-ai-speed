import { createCliRenderer, TextRenderable, BoxRenderable } from "@opentui/core";

// Create the renderer with alternate screen so it clears on exit
const renderer = await createCliRenderer({
  targetFps: 60,
  useAlternateScreen: true,
});

// Demo: Three overlapping boxes showing z-index layering
const colors = [
  { name: "Red", bg: "#ff3333", left: 10, top: 5 },
  { name: "Green", bg: "#33ff33", left: 15, top: 8 },
  { name: "Blue", bg: "#3333ff", left: 20, top: 11 },
];

colors.forEach((color, index) => {
  const box = new BoxRenderable(renderer, {
    position: "absolute",
    left: color.left,
    top: color.top,
    width: 30,
    height: 8,
    zIndex: index + 1, // Higher zIndex = rendered on top
    backgroundColor: color.bg,
    border: true,
    borderStyle: "rounded",
    title: `Layer ${index + 1}`,
  });

  const text = new TextRenderable(renderer, {
    content: `\n  ${color.name} Box\n  zIndex: ${index + 1}\n  left: ${color.left}, top: ${color.top}`,
  });

  box.add(text);
  renderer.root.add(box);
});

// Add ASCII art overlay
const border1 = await Bun.file("./static/border1.txt").text();

const artBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 45,
  top: 5,
  width: 30,
  height: 7,
  zIndex: 10, // On top of everything
});

const artText = new TextRenderable(renderer, {
  content: border1,
});

artBox.add(artText);
renderer.root.add(artBox);

const titleBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 48,
  top: 6,
  width: 24,
  height: 3,
  zIndex: 11,
  backgroundColor: "#000000",
});

const titleText = new TextRenderable(renderer, {
  content: "  ASCII Art Overlay",
});

titleBox.add(titleText);
renderer.root.add(titleBox);

// Instructions
const instructions = new TextRenderable(renderer, {
  content: "Demo: Overlapping Layers | Press Ctrl+C to exit",
});

const instructionsBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 2,
  top: 1,
  width: 50,
  height: 1,
  zIndex: 100,
});

instructionsBox.add(instructions);
renderer.root.add(instructionsBox);
