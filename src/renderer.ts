import {
  createCliRenderer,
  TextRenderable,
  BoxRenderable,
  type CliRenderer,
} from "@opentui/core";
import type { Slide, SlideElement } from "./parser";
import { Font } from "./fonts";

export class PresentationRenderer {
  renderer: CliRenderer;
  currentSlide = 0;
  slides: Slide[] = [];
  links: Array<{ text: string; url: string; box: BoxRenderable }> = [];
  selectedLinkIndex = 0;

  private constructor(renderer: CliRenderer) {
    this.renderer = renderer;
  }

  static async create(): Promise<PresentationRenderer> {
    const renderer = await createCliRenderer({
      targetFps: 60,
      useAlternateScreen: true,
      exitOnCtrlC: true,
    });

    return new PresentationRenderer(renderer);
  }

  async renderSlide(slide: Slide) {
    // Clear previous content
    this.renderer.root.getChildren().forEach((child) => {
      this.renderer.root.remove(child._id);
    });
    this.links = [];
    this.selectedLinkIndex = 0;

    // Background - fill with black then make transparent to clear screen
    const bgBox = new BoxRenderable(this.renderer, {
      position: "absolute",
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "#000000",
      zIndex: 0,
    });
    this.renderer.root.add(bgBox);

    // Request a render with black background to clear
    this.renderer.requestRender();

    // Wait for render to complete
    await new Promise(resolve => setTimeout(resolve, 16));

    // Now make it transparent for the actual content
    bgBox.backgroundColor = "transparent";

    // Title - render with jsstickletters font
    const font = new Font("jsstickletters");
    const rendered_title = font.render_to_string(slide.title.toUpperCase());
    const title_lines = rendered_title.split("\n");

    const titleBox = new BoxRenderable(this.renderer, {
      position: "absolute",
      left: 5,
      top: 2,
      width: 120,
      height: title_lines.length + 2,
      zIndex: 1,
    });

    const titleText = new TextRenderable(this.renderer, {
      content: rendered_title,
    });

    titleBox.add(titleText);
    this.renderer.root.add(titleBox);

    // Content starts after title (accounting for font height)
    let yOffset = 2 + title_lines.length + 3;

    for (const element of slide.elements) {
      const result = await this.renderElement(element, 8, yOffset);
      yOffset = result.nextY;
    }

    // Highlight first link if any
    if (this.links.length > 0) {
      this.highlightLink(0);
    }
  }

  private async renderElement(
    element: SlideElement,
    x: number,
    y: number
  ): Promise<{ nextY: number }> {
    switch (element.type) {
      case "heading": {
        // Use jsstickletters font for level 1 headings (#)
        if (element.level === 1) {
          const font = new Font("jsstickletters");
          const rendered_text = font.render_to_string(element.content.toUpperCase());
          const lines = rendered_text.split("\n");

          const box = new BoxRenderable(this.renderer, {
            position: "absolute",
            left: x,
            top: y,
            width: 120,
            height: lines.length + 2,
            zIndex: 1,
          });

          const text = new TextRenderable(this.renderer, {
            content: rendered_text,
          });

          box.add(text);
          this.renderer.root.add(box);
          return { nextY: y + lines.length + 3 };
        }

        // Regular text for level 2 and 3 headings
        const prefix = element.level === 2 ? "## " : "### ";
        const box = new BoxRenderable(this.renderer, {
          position: "absolute",
          left: x,
          top: y,
          width: 70,
          height: 2,
          zIndex: 1,
        });

        const text = new TextRenderable(this.renderer, {
          content: `${prefix}${element.content}`,
        });

        box.add(text);
        this.renderer.root.add(box);
        return { nextY: y + 3 };
      }

      case "text": {
        const box = new BoxRenderable(this.renderer, {
          position: "absolute",
          left: x,
          top: y,
          width: 70,
          height: 2,
          zIndex: 1,
        });

        // Apply bold styling if needed
        const content = element.bold
          ? `\x1b[1m${element.content}\x1b[0m`
          : element.content;

        const text = new TextRenderable(this.renderer, {
          content,
        });

        box.add(text);
        this.renderer.root.add(box);
        return { nextY: y + 2 };
      }

      case "bullets": {
        let bulletY = y;
        for (const item of element.items) {
          let content = "  • ";
          const hasLink = item.some((el) => el.type === "link");

          for (const part of item) {
            if (part.type === "text") {
              // Apply bold styling if needed
              const textContent = part.bold
                ? `\x1b[1m${part.content}\x1b[0m`
                : part.content;
              content += textContent;
            } else if (part.type === "link") {
              content += part.text;
            }
          }

          const box = new BoxRenderable(this.renderer, {
            position: "absolute",
            left: x,
            top: bulletY,
            width: 70,
            height: 2,
            zIndex: 1,
            backgroundColor: hasLink ? "#16213e" : "transparent",
          });

          const text = new TextRenderable(this.renderer, {
            content,
          });

          box.add(text);
          this.renderer.root.add(box);

          // Track links
          if (hasLink) {
            const link = item.find((el) => el.type === "link");
            if (link && link.type === "link") {
              this.links.push({ text: link.text, url: link.url, box });
            }
          }

          bulletY += 2;
        }
        return { nextY: bulletY + 1 };
      }

      case "image": {
        try {
          const imagePath = `./static/${element.filename}`;
          const imageContent = await Bun.file(imagePath).text();

          const box = new BoxRenderable(this.renderer, {
            position: "absolute",
            left: x + 5,
            top: y,
            width: 75,
            height: imageContent.split("\n").length + 2,
            zIndex: 1,
          });

          const text = new TextRenderable(this.renderer, {
            content: imageContent,
          });

          box.add(text);
          this.renderer.root.add(box);

          return { nextY: y + imageContent.split("\n").length + 3 };
        } catch (error) {
          console.error(`Failed to load image: ${element.filename}`, error);
          return { nextY: y + 1 };
        }
      }

      case "link": {
        const box = new BoxRenderable(this.renderer, {
          position: "absolute",
          left: x,
          top: y,
          width: element.text.length + 4,
          height: 2,
          zIndex: 1,
          backgroundColor: "#16213e",
        });

        const text = new TextRenderable(this.renderer, {
          content: `  ${element.text}`,
        });

        box.add(text);
        this.renderer.root.add(box);

        this.links.push({ text: element.text, url: element.url, box });

        return { nextY: y + 2 };
      }
    }
  }

  highlightLink(index: number) {
    // Remove highlight from all links
    this.links.forEach((link) => {
      link.box.backgroundColor = "#16213e";
    });

    // Highlight selected link
    if (index >= 0 && index < this.links.length) {
      this.links[index].box.backgroundColor = "#e94560";
      this.selectedLinkIndex = index;
    }
  }

  navigateLinks(direction: "up" | "down") {
    if (this.links.length === 0) return;

    if (direction === "down") {
      this.selectedLinkIndex = (this.selectedLinkIndex + 1) % this.links.length;
    } else {
      this.selectedLinkIndex =
        (this.selectedLinkIndex - 1 + this.links.length) % this.links.length;
    }

    this.highlightLink(this.selectedLinkIndex);
  }

  getSelectedLink(): { text: string; url: string } | null {
    if (this.selectedLinkIndex >= 0 && this.selectedLinkIndex < this.links.length) {
      return this.links[this.selectedLinkIndex];
    }
    return null;
  }
}
