import { test, expect, describe } from "bun:test";
import { parsePresentation } from "./parser";

describe("parsePresentation", () => {
  describe("basic slide parsing", () => {
    test("parses single slide with title", () => {
      const markdown = "# Hello World";
      const slides = parsePresentation(markdown);

      expect(slides).toHaveLength(1);
      expect(slides[0].title).toBe("Hello World");
      expect(slides[0].elements).toHaveLength(0);
    });

    test("parses multiple slides separated by ---", () => {
      const markdown = `# Slide 1

---

# Slide 2`;
      const slides = parsePresentation(markdown);

      expect(slides).toHaveLength(2);
      expect(slides[0].title).toBe("Slide 1");
      expect(slides[1].title).toBe("Slide 2");
    });

    test("parses slide with no title", () => {
      const markdown = "Just some text";
      const slides = parsePresentation(markdown);

      expect(slides).toHaveLength(1);
      expect(slides[0].title).toBe("");
      expect(slides[0].elements).toHaveLength(1);
      expect(slides[0].elements[0]).toEqual({
        type: "text",
        content: "Just some text",
      });
    });
  });

  describe("frontmatter parsing", () => {
    test("parses frontmatter with font and align", () => {
      const markdown = `---
font: jsstickletters
align: center
---
# Title`;
      const slides = parsePresentation(markdown);

      expect(slides).toHaveLength(1);
      expect(slides[0].title).toBe("Title");
      expect(slides[0].frontmatter).toEqual({
        font: "jsstickletters",
        align: "center",
      });
    });

    test("parses frontmatter with only font", () => {
      const markdown = `---
font: dosrebel
---
# Title`;
      const slides = parsePresentation(markdown);

      expect(slides[0].frontmatter).toEqual({
        font: "dosrebel",
      });
    });

    test("parses frontmatter with only align", () => {
      const markdown = `---
align: right
---
# Title`;
      const slides = parsePresentation(markdown);

      expect(slides[0].frontmatter).toEqual({
        align: "right",
      });
    });

    test("handles slide without frontmatter", () => {
      const markdown = "# Title";
      const slides = parsePresentation(markdown);

      expect(slides[0].frontmatter).toBeUndefined();
    });

    test("handles empty frontmatter", () => {
      const markdown = `---
---
# Title`;
      const slides = parsePresentation(markdown);

      expect(slides[0].title).toBe("Title");
      expect(slides[0].frontmatter).toEqual({});
    });
  });

  describe("heading parsing", () => {
    test("parses H2 headings", () => {
      const markdown = `# Title

## Subtitle`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(1);
      expect(slides[0].elements[0]).toEqual({
        type: "heading",
        level: 2,
        content: "Subtitle",
      });
    });

    test("parses H3 headings", () => {
      const markdown = `# Title

### Subheading`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(1);
      expect(slides[0].elements[0]).toEqual({
        type: "heading",
        level: 3,
        content: "Subheading",
      });
    });

    test("parses additional H1 as heading element", () => {
      const markdown = `# Title

# Another Title`;
      const slides = parsePresentation(markdown);

      expect(slides[0].title).toBe("Title");
      expect(slides[0].elements).toHaveLength(1);
      expect(slides[0].elements[0]).toEqual({
        type: "heading",
        level: 1,
        content: "Another Title",
      });
    });
  });

  describe("text parsing", () => {
    test("parses regular text", () => {
      const markdown = `# Title

Regular text here`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(1);
      expect(slides[0].elements[0]).toEqual({
        type: "text",
        content: "Regular text here",
      });
    });

    test("parses bold text", () => {
      const markdown = `# Title

This is **bold** text`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(3);
      expect(slides[0].elements[0]).toEqual({
        type: "text",
        content: "This is ",
      });
      expect(slides[0].elements[1]).toEqual({
        type: "text",
        content: "bold",
        bold: true,
      });
      expect(slides[0].elements[2]).toEqual({
        type: "text",
        content: " text",
      });
    });

    test("parses multiple bold segments", () => {
      const markdown = `# Title

**First** and **second**`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(3);
      expect(slides[0].elements[0]).toEqual({
        type: "text",
        content: "First",
        bold: true,
      });
      expect(slides[0].elements[1]).toEqual({
        type: "text",
        content: " and ",
      });
      expect(slides[0].elements[2]).toEqual({
        type: "text",
        content: "second",
        bold: true,
      });
    });
  });

  describe("bullet list parsing", () => {
    test("parses bullet lists with -", () => {
      const markdown = `# Title

- Item 1
- Item 2`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(1);
      const bullets = slides[0].elements[0];
      expect(bullets.type).toBe("bullets");
      if (bullets.type === "bullets") {
        expect(bullets.items).toHaveLength(2);
        expect(bullets.items[0]).toEqual([{ type: "text", content: "Item 1" }]);
        expect(bullets.items[1]).toEqual([{ type: "text", content: "Item 2" }]);
      }
    });

    test("parses bullet lists with *", () => {
      const markdown = `# Title

* Item 1
* Item 2`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(1);
      const bullets = slides[0].elements[0];
      expect(bullets.type).toBe("bullets");
      if (bullets.type === "bullets") {
        expect(bullets.items).toHaveLength(2);
      }
    });

    test("parses bullets with bold text", () => {
      const markdown = `# Title

- **Bold** item`;
      const slides = parsePresentation(markdown);

      const bullets = slides[0].elements[0];
      if (bullets.type === "bullets") {
        expect(bullets.items[0]).toHaveLength(2);
        expect(bullets.items[0][0]).toEqual({
          type: "text",
          content: "Bold",
          bold: true,
        });
        expect(bullets.items[0][1]).toEqual({
          type: "text",
          content: " item",
        });
      }
    });

    test("separates bullet lists by empty lines", () => {
      const markdown = `# Title

- List 1 Item 1
- List 1 Item 2

Text between

- List 2 Item 1`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(3);
      expect(slides[0].elements[0].type).toBe("bullets");
      expect(slides[0].elements[1].type).toBe("text");
      expect(slides[0].elements[2].type).toBe("bullets");
    });
  });

  describe("link parsing", () => {
    test("parses markdown links", () => {
      const markdown = `# Title

Check out [this link](https://example.com)`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(2);
      expect(slides[0].elements[0]).toEqual({
        type: "text",
        content: "Check out ",
      });
      expect(slides[0].elements[1]).toEqual({
        type: "link",
        text: "this link",
        url: "https://example.com",
      });
    });

    test("parses standalone links", () => {
      const markdown = `# Title

[Click here](tmux://main/ls)`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(1);
      expect(slides[0].elements[0]).toEqual({
        type: "link",
        text: "Click here",
        url: "tmux://main/ls",
      });
    });

    test("parses links in bullet lists", () => {
      const markdown = `# Title

- Item with [link](https://example.com)`;
      const slides = parsePresentation(markdown);

      const bullets = slides[0].elements[0];
      if (bullets.type === "bullets") {
        expect(bullets.items[0]).toHaveLength(2);
        expect(bullets.items[0][0]).toEqual({
          type: "text",
          content: "Item with ",
        });
        expect(bullets.items[0][1]).toEqual({
          type: "link",
          text: "link",
          url: "https://example.com",
        });
      }
    });

    test("parses multiple links in one line", () => {
      const markdown = `# Title

[First](url1) and [Second](url2)`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(3);
      expect(slides[0].elements[0]).toEqual({
        type: "link",
        text: "First",
        url: "url1",
      });
      expect(slides[0].elements[1]).toEqual({
        type: "text",
        content: " and ",
      });
      expect(slides[0].elements[2]).toEqual({
        type: "link",
        text: "Second",
        url: "url2",
      });
    });
  });

  describe("image parsing", () => {
    test("parses image syntax", () => {
      const markdown = `# Title

![Alt text](image.txt)`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements).toHaveLength(1);
      expect(slides[0].elements[0]).toEqual({
        type: "image",
        alt: "Alt text",
        filename: "image.txt",
      });
    });

    test("parses image with empty alt text", () => {
      const markdown = `# Title

![](image.txt)`;
      const slides = parsePresentation(markdown);

      expect(slides[0].elements[0]).toEqual({
        type: "image",
        alt: "",
        filename: "image.txt",
      });
    });
  });

  describe("complex scenarios", () => {
    test("parses slide with mixed content", () => {
      const markdown = `# Main Title

## Section

Regular text with **bold**

- Bullet 1
- Bullet with [link](url)

![Image](file.txt)`;
      const slides = parsePresentation(markdown);

      expect(slides[0].title).toBe("Main Title");
      expect(slides[0].elements.length).toBeGreaterThan(0);

      // Check we have heading, text, bullets, and image
      const types = slides[0].elements.map((e) => e.type);
      expect(types).toContain("heading");
      expect(types).toContain("text");
      expect(types).toContain("bullets");
      expect(types).toContain("image");
    });

    test("parses presentation with frontmatter and multiple slides", () => {
      const markdown = `---
font: jsstickletters
align: center
---
# Slide 1

---

# Slide 2

Content here`;
      const slides = parsePresentation(markdown);

      expect(slides).toHaveLength(2);
      expect(slides[0].frontmatter).toEqual({
        font: "jsstickletters",
        align: "center",
      });
      expect(slides[0].title).toBe("Slide 1");
      expect(slides[1].title).toBe("Slide 2");
      expect(slides[1].frontmatter).toBeUndefined();
    });

    test("handles empty slides gracefully", () => {
      const markdown = `# Slide 1

---

---

# Slide 2`;
      const slides = parsePresentation(markdown);

      // Should skip empty slides
      expect(slides.length).toBeGreaterThanOrEqual(2);
      expect(slides[0].title).toBe("Slide 1");
    });
  });
});
