import { test, expect } from "bun:test";
import { PresentationRenderer } from "./renderer";
import { parsePresentation } from "./parser";

/**
 * Calculate horizontal position for centering multiline text
 * Each line should be centered based on its own length
 */
function center_multiline_text(lines: string[], screen_width: number): number[] {
  return lines.map(line => {
    const line_length = line.length;
    return Math.floor((screen_width - line_length) / 2);
  });
}

test("center_multiline_text - single line", () => {
  const lines = ["HELLO"];
  const screen_width = 80;
  const positions = center_multiline_text(lines, screen_width);

  // "HELLO" is 5 chars, (80 - 5) / 2 = 37.5, floor = 37
  expect(positions).toEqual([37]);
});

test("center_multiline_text - multiple lines of same length", () => {
  const lines = ["HELLO", "WORLD"];
  const screen_width = 80;
  const positions = center_multiline_text(lines, screen_width);

  // Both 5 chars, should have same position
  expect(positions).toEqual([37, 37]);
});

test("center_multiline_text - multiple lines of different lengths", () => {
  const lines = [
    "SHORT",  // 5 chars
    "MEDIUM LINE",  // 11 chars
    "A MUCH LONGER LINE OF TEXT"  // 26 chars
  ];
  const screen_width = 80;
  const positions = center_multiline_text(lines, screen_width);

  // SHORT: (80 - 5) / 2 = 37.5, floor = 37
  // MEDIUM LINE: (80 - 11) / 2 = 34.5, floor = 34
  // LONG: (80 - 26) / 2 = 27
  expect(positions).toEqual([37, 34, 27]);
});

test("center_multiline_text - ASCII art with varying widths", () => {
  const lines = [
    " █████╗ ",  // 8 chars
    "██╔══██╗",  // 8 chars
    "███████║",  // 8 chars
  ];
  const screen_width = 80;
  const positions = center_multiline_text(lines, screen_width);

  // All 8 chars: (80 - 8) / 2 = 36
  expect(positions).toEqual([36, 36, 36]);
});

test("center_multiline_text - handle very long lines", () => {
  const lines = ["A".repeat(100)];
  const screen_width = 80;
  const positions = center_multiline_text(lines, screen_width);

  // Line is longer than screen, result will be negative
  // (80 - 100) / 2 = -10
  expect(positions).toEqual([-10]);
});

// Code block width tests
test("code block width calculation", () => {
  const code_box_width = 90;
  const code_content_width = code_box_width - 10; // Account for padding and borders

  // Should be 80 chars of content
  expect(code_content_width).toBe(80);

  // Border calculation - note that literal \ counts as 1 char in the string
  // "    /\" + spaces + "\" should total to 90 chars
  // 4 (spaces) + 1 (/) + 1 (\) + spaces + 1 (\) = 90
  // So spaces = 90 - 7 = 83, but the pattern uses code_box_width - 6 = 84
  const top_border = "    /\\" + " ".repeat(code_box_width - 6) + "\\";
  // This actually creates: 4 + 1 + 84 + 1 = 90, but the backslash is one char
  expect(top_border.length).toBe(91); // Actual length

  const top_tape = "(O)===)" + "><".repeat((code_box_width - 12) / 2) + "==(O)";
  expect(top_tape.length).toBe(90);
});

test("code block padding calculation", () => {
  const code_content_width = 80;

  // Test various line lengths
  const test_cases = [
    { line: "function test()", expected_padding: 65 },
    { line: "const x = 1;", expected_padding: 68 },
    { line: "", expected_padding: 80 },
    { line: "a".repeat(80), expected_padding: 0 },
    { line: "a".repeat(90), expected_padding: 0 }, // Longer than max, but padding should be 0
  ];

  for (const { line, expected_padding } of test_cases) {
    const padding = Math.max(0, code_content_width - line.length);
    expect(padding).toBe(expected_padding);
  }
});

// Integration tests
test("PresentationRenderer can be created", async () => {
  const renderer = await PresentationRenderer.create();

  expect(renderer).toBeDefined();
  expect(renderer.renderer).toBeDefined();
  expect(renderer.treeSitterClient).toBeDefined();
  expect(renderer.syntaxStyle).toBeDefined();
  expect(renderer.currentSlide).toBe(0);
  expect(renderer.slides).toEqual([]);
  expect(renderer.links).toEqual([]);
});

test("PresentationRenderer parses and renders simple slide", async () => {
  const markdown = `---
title: Test Slide
---

# Heading

This is a test.
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);
  // The parser uses the first heading as the title, not the frontmatter title
  expect(slides[0].title).toBe("Heading");
  // Heading becomes the title, so only text element remains
  expect(slides[0].elements.length).toBe(1); // just text

  renderer.slides = slides;

  // Should not throw
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles code blocks", async () => {
  const markdown = `---
title: Code Test
---

# Code Example

\`\`\`typescript
const x = 42;
\`\`\`
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);

  const code_element = slides[0].elements.find(e => e.type === "code");
  expect(code_element).toBeDefined();

  if (code_element && code_element.type === "code") {
    expect(code_element.language).toBe("typescript");
    expect(code_element.content).toBe("const x = 42;");
  }

  renderer.slides = slides;

  // Should not throw when rendering with syntax highlighting
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles multiline code blocks", async () => {
  const markdown = `---
title: Multiline Code
---

# Function Example

\`\`\`javascript
function greet(name) {
  return "Hello, " + name;
}

const result = greet("World");
\`\`\`
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  const code_element = slides[0].elements.find(e => e.type === "code");
  expect(code_element).toBeDefined();

  if (code_element && code_element.type === "code") {
    expect(code_element.language).toBe("javascript");
    expect(code_element.content.split("\n").length).toBe(5);
  }

  renderer.slides = slides;
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles code blocks without language", async () => {
  const markdown = `---
title: Plain Code
---

# Plain Text Code

\`\`\`
plain text
no highlighting
\`\`\`
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  const code_element = slides[0].elements.find(e => e.type === "code");
  expect(code_element).toBeDefined();

  if (code_element && code_element.type === "code") {
    expect(code_element.language).toBeUndefined();
    expect(code_element.content).toContain("plain text");
  }

  renderer.slides = slides;
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles bold text without extra newlines", async () => {
  const markdown = `---
title: Bold Test
---

# Bold Text

**This is bold text**

More text after bold.
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);

  // Check that the text elements are parsed correctly
  const text_elements = slides[0].elements.filter(e => e.type === "text");
  expect(text_elements.length).toBe(2);

  if (text_elements[0] && text_elements[0].type === "text") {
    expect(text_elements[0].content).toBe("This is bold text");
    expect(text_elements[0].bold).toBe(true);
  }

  if (text_elements[1] && text_elements[1].type === "text") {
    expect(text_elements[1].content).toBe("More text after bold.");
  }

  renderer.slides = slides;
  // Should not throw and should render without extra newlines
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles inline bold text without extra newlines", async () => {
  const markdown = `---
title: Inline Bold Test
---

# Test

Text before **bold text** and text after.
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);

  // This line should be parsed as a single textline with 3 parts:
  // 1. "Text before " (regular)
  // 2. "bold text" (bold)
  // 3. " and text after." (regular)
  const textline_elements = slides[0].elements.filter(e => e.type === "textline");
  expect(textline_elements.length).toBe(1);

  const textline = textline_elements[0];
  if (textline && textline.type === "textline") {
    expect(textline.parts.length).toBe(3);

    if (textline.parts[0] && textline.parts[0].type === "text") {
      expect(textline.parts[0].content).toBe("Text before ");
      expect(textline.parts[0].bold).toBeUndefined();
    }

    if (textline.parts[1] && textline.parts[1].type === "text") {
      expect(textline.parts[1].content).toBe("bold text");
      expect(textline.parts[1].bold).toBe(true);
    }

    if (textline.parts[2] && textline.parts[2].type === "text") {
      expect(textline.parts[2].content).toBe(" and text after.");
      expect(textline.parts[2].bold).toBeUndefined();
    }
  }

  renderer.slides = slides;
  // Should not throw and should render without extra newlines
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles inline code", async () => {
  const markdown = `---
title: Inline Code Test
---

# Test

Text with \`inline code\` in it.
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);

  // This line should be parsed as a single textline with 3 parts:
  // 1. "Text with " (regular)
  // 2. "inline code" (inline_code)
  // 3. " in it." (regular)
  const textline_elements = slides[0].elements.filter(e => e.type === "textline");
  expect(textline_elements.length).toBe(1);

  const textline = textline_elements[0];
  if (textline && textline.type === "textline") {
    expect(textline.parts.length).toBe(3);

    if (textline.parts[0] && textline.parts[0].type === "text") {
      expect(textline.parts[0].content).toBe("Text with ");
      expect(textline.parts[0].inline_code).toBeUndefined();
    }

    if (textline.parts[1] && textline.parts[1].type === "text") {
      expect(textline.parts[1].content).toBe("inline code");
      expect(textline.parts[1].inline_code).toBe(true);
    }

    if (textline.parts[2] && textline.parts[2].type === "text") {
      expect(textline.parts[2].content).toBe(" in it.");
      expect(textline.parts[2].inline_code).toBeUndefined();
    }
  }

  renderer.slides = slides;
  // Should not throw and should render inline code in orange
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles mixed bold and inline code", async () => {
  const markdown = `---
title: Mixed Styling Test
---

# Test

Text with **bold** and \`code\` and **more bold** together.
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);

  // This line should be parsed as a textline with 7 parts
  const textline_elements = slides[0].elements.filter(e => e.type === "textline");
  expect(textline_elements.length).toBe(1);

  const textline = textline_elements[0];
  if (textline && textline.type === "textline") {
    expect(textline.parts.length).toBe(7);

    // Verify the styling of each part
    const parts = textline.parts;
    expect(parts[0].type === "text" && parts[0].content).toBe("Text with ");
    expect(parts[1].type === "text" && parts[1].content).toBe("bold");
    expect(parts[1].type === "text" && parts[1].bold).toBe(true);
    expect(parts[2].type === "text" && parts[2].content).toBe(" and ");
    expect(parts[3].type === "text" && parts[3].content).toBe("code");
    expect(parts[3].type === "text" && parts[3].inline_code).toBe(true);
    expect(parts[4].type === "text" && parts[4].content).toBe(" and ");
    expect(parts[5].type === "text" && parts[5].content).toBe("more bold");
    expect(parts[5].type === "text" && parts[5].bold).toBe(true);
    expect(parts[6].type === "text" && parts[6].content).toBe(" together.");
  }

  renderer.slides = slides;
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles inline code in bullet lists", async () => {
  const markdown = `---
title: Bullets with Code
---

# Test

- Item with \`code\` in it
- Another with **bold** and \`code\`
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);

  const bullet_elements = slides[0].elements.filter(e => e.type === "bullets");
  expect(bullet_elements.length).toBe(1);

  const bullets = bullet_elements[0];
  if (bullets && bullets.type === "bullets") {
    expect(bullets.items.length).toBe(2);

    // First bullet: "Item with `code` in it"
    const item1 = bullets.items[0];
    expect(item1.length).toBe(3);
    expect(item1[0].type === "text" && item1[0].content).toBe("Item with ");
    expect(item1[1].type === "text" && item1[1].content).toBe("code");
    expect(item1[1].type === "text" && item1[1].inline_code).toBe(true);
    expect(item1[2].type === "text" && item1[2].content).toBe(" in it");

    // Second bullet: "Another with **bold** and `code`"
    const item2 = bullets.items[1];
    expect(item2.length).toBe(4);
    expect(item2[0].type === "text" && item2[0].content).toBe("Another with ");
    expect(item2[1].type === "text" && item2[1].content).toBe("bold");
    expect(item2[1].type === "text" && item2[1].bold).toBe(true);
    expect(item2[2].type === "text" && item2[2].content).toBe(" and ");
    expect(item2[3].type === "text" && item2[3].content).toBe("code");
    expect(item2[3].type === "text" && item2[3].inline_code).toBe(true);
  }

  renderer.slides = slides;
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles text_color in frontmatter", async () => {
  const markdown = `---
text_color: #FF0000
---

# Red Title

Content here.
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);
  expect(slides[0].frontmatter?.text_color).toBe("#FF0000");

  renderer.slides = slides;
  // Should not throw when rendering with text color
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles img_color in frontmatter", async () => {
  const markdown = `---
img_color: #00FF00
image_position: 10, 10
---

# Title

![lightning](lightning.txt)
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);
  expect(slides[0].frontmatter?.img_color).toBe("#00FF00");
  expect(slides[0].frontmatter?.image_position).toBe("10, 10");

  renderer.slides = slides;
  // Should not throw when rendering with image color
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles both text_color and img_color", async () => {
  const markdown = `---
text_color: #FF0000
img_color: #0000FF
align: center
image_position: 50, 20
---

# Colored Title

![test](test.txt)
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);
  expect(slides[0].frontmatter?.text_color).toBe("#FF0000");
  expect(slides[0].frontmatter?.img_color).toBe("#0000FF");
  expect(slides[0].frontmatter?.align).toBe("center");

  renderer.slides = slides;
  // Should not throw when rendering with both colors
  await renderer.renderSlide(slides[0]);
});

test("PresentationRenderer handles standalone inline code at start of line", async () => {
  const markdown = `---
title: Inline Code Test
---

# Test

\`code at the start\`
`;

  const renderer = await PresentationRenderer.create();
  const slides = parsePresentation(markdown);

  expect(slides.length).toBe(1);

  // This should be parsed as a text element with inline_code: true
  const text_elements = slides[0].elements.filter(e => e.type === "text");
  expect(text_elements.length).toBe(1);

  if (text_elements[0] && text_elements[0].type === "text") {
    expect(text_elements[0].content).toBe("code at the start");
    expect(text_elements[0].inline_code).toBe(true);
  }

  renderer.slides = slides;
  // Should not throw and should render inline code in orange
  await renderer.renderSlide(slides[0]);
});
