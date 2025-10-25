import { createCliRenderer, TextRenderable, BoxRenderable } from "@opentui/core";

// Create the renderer
const renderer = await createCliRenderer({
  targetFps: 60,
  useAlternateScreen: true,
});

// Load ASCII art
const border1 = await Bun.file("./static/border1.txt").text();
const heli = await Bun.file("./static/heli.txt").text();

// Create a presentation slide-like layout
// Background
const bgBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "#1a1a2e",
  zIndex: 0,
});
renderer.root.add(bgBox);

// Title section with border
const titleBorder = new BoxRenderable(renderer, {
  position: "absolute",
  left: 10,
  top: 2,
  width: 60,
  height: 7,
  zIndex: 2,
});

const borderText = new TextRenderable(renderer, {
  content: border1,
});

titleBorder.add(borderText);
renderer.root.add(titleBorder);

// Title text
const titleBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 15,
  top: 3,
  width: 50,
  height: 3,
  zIndex: 3,
  backgroundColor: "#1a1a2e",
});

const title = new TextRenderable(renderer, {
  content: "     Terminal Presentations",
});

titleBox.add(title);
renderer.root.add(titleBox);

// Content box
const contentBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 5,
  top: 10,
  width: 40,
  height: 12,
  zIndex: 1,
  backgroundColor: "#16213e",
  border: true,
  borderStyle: "rounded",
  title: "Features",
});

const content = new TextRenderable(renderer, {
  content: `
  • ASCII art support
  • Layered rendering
  • Navigation links
  • Tmux integration
  • Markdown parsing
  • Custom styling
`,
});

contentBox.add(content);
renderer.root.add(contentBox);

// Image box with helicopter
const imageBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 48,
  top: 10,
  width: 70,
  height: 18,
  zIndex: 1,
  border: true,
  borderStyle: "double",
  title: "ASCII Art Demo",
  borderColor: "#e94560",
});

const heliText = new TextRenderable(renderer, {
  content: heli,
});

imageBox.add(heliText);
renderer.root.add(imageBox);

// Footer/navigation hint
const footer = new BoxRenderable(renderer, {
  position: "absolute",
  left: 5,
  bottom: 2,
  width: 70,
  height: 3,
  zIndex: 10,
  backgroundColor: "#0f3460",
  border: true,
  borderStyle: "single",
});

const footerText = new TextRenderable(renderer, {
  content: "  ↑/↓ Navigate  •  Enter to activate link  •  Ctrl+C to exit",
});

footer.add(footerText);
renderer.root.add(footer);
