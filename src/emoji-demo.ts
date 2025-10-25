import { createCliRenderer, TextRenderable, BoxRenderable } from "@opentui/core";

// Create the renderer
const renderer = await createCliRenderer({
  targetFps: 60,
  useAlternateScreen: true,
});

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

// Title
const titleBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 10,
  top: 2,
  width: 60,
  height: 5,
  zIndex: 1,
  border: true,
  borderStyle: "rounded",
  title: "Emoji Test 😻",
  backgroundColor: "#16213e",
});

const titleText = new TextRenderable(renderer, {
  content: "  Testing Emoji Rendering! 🎨",
});

titleBox.add(titleText);
renderer.root.add(titleBox);

// Emoji showcase
const emojiBox = new BoxRenderable(renderer, {
  position: "absolute",
  left: 10,
  top: 8,
  width: 60,
  height: 15,
  zIndex: 1,
  border: true,
  borderStyle: "double",
  title: "Various Emojis",
  backgroundColor: "#0f3460",
});

const emojiText = new TextRenderable(renderer, {
  content: `
  Faces: 😀 😃 😄 😁 😅 😂 🤣 😊 😇 😍 😻

  Hearts: ❤️  💛 💚 💙 💜 🖤 🤍 🤎

  Hands: 👍 👎 👌 ✌️  🤞 🤘 👏 🙌

  Animals: 🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨

  Food: 🍕 🍔 🍟 🌭 🍿 🧂 🥓 🥞 🧇

  Symbols: ✅ ❌ ⭐ 💯 🔥 💎 🎯 🎨 🚀
`,
});

emojiBox.add(emojiText);
renderer.root.add(emojiBox);

// Instructions
const footer = new BoxRenderable(renderer, {
  position: "absolute",
  left: 10,
  bottom: 2,
  width: 60,
  height: 3,
  zIndex: 10,
  backgroundColor: "#e94560",
  border: true,
  borderStyle: "single",
});

const footerText = new TextRenderable(renderer, {
  content: "  Press Ctrl+C to exit • Emojis should render! 🎉",
});

footer.add(footerText);
renderer.root.add(footer);
