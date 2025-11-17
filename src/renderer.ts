import {
  createCliRenderer,
  TextRenderable,
  BoxRenderable,
  type CliRenderer,
  StyledText,
  bold,
  fg,
  getTreeSitterClient,
  treeSitterToStyledText,
  SyntaxStyle,
  RGBA,
} from "@opentui/core";
import type { Slide, SlideElement, Image } from "./parser";
import { Font } from "./fonts";
import { AsciinemaPlayer } from "./asciinema-player";

export class PresentationRenderer {
  renderer: CliRenderer;
  currentSlide = 0;
  slides: Slide[] = [];
  links: Array<{ text: string; url: string; box: BoxRenderable }> = [];
  selectedLinkIndex = 0;
  treeSitterClient: Awaited<ReturnType<typeof getTreeSitterClient>>;
  syntaxStyle: SyntaxStyle;

  private constructor(
    renderer: CliRenderer,
    treeSitterClient: Awaited<ReturnType<typeof getTreeSitterClient>>,
    syntaxStyle: SyntaxStyle
  ) {
    this.renderer = renderer;
    this.treeSitterClient = treeSitterClient;
    this.syntaxStyle = syntaxStyle;
  }

  static async create(): Promise<PresentationRenderer> {
    const renderer = await createCliRenderer({
      targetFps: 60,
      useAlternateScreen: true,
      exitOnCtrlC: true,
    });

    // Initialize tree-sitter for syntax highlighting
    const treeSitterClient = getTreeSitterClient();
    await treeSitterClient.initialize();

    // Register bash parser
    treeSitterClient.addFiletypeParser({
      filetype: "bash",
      queries: {
        highlights: ["./assets/bash/highlights.scm"],
      },
      wasm: "./assets/bash/tree-sitter-bash.wasm",
    });

    // Create syntax style with VS Code Dark+ theme colors
    const syntaxStyle = SyntaxStyle.fromStyles({
      "keyword": { fg: RGBA.fromHex("#569CD6") },          // Blue
      "function": { fg: RGBA.fromHex("#DCDCAA") },         // Yellow
      "function.call": { fg: RGBA.fromHex("#DCDCAA") },
      "string": { fg: RGBA.fromHex("#CE9178") },           // Orange
      "comment": { fg: RGBA.fromHex("#6A9955") },          // Green
      "type": { fg: RGBA.fromHex("#4EC9B0") },             // Cyan
      "variable": { fg: RGBA.fromHex("#9CDCFE") },         // Light blue
      "parameter": { fg: RGBA.fromHex("#9CDCFE") },
      "property": { fg: RGBA.fromHex("#9CDCFE") },         // For bash variable_name
      "number": { fg: RGBA.fromHex("#B5CEA8") },           // Light green
      "operator": { fg: RGBA.fromHex("#D4D4D4") },         // White
      "punctuation": { fg: RGBA.fromHex("#D4D4D4") },      // White
      "class": { fg: RGBA.fromHex("#4EC9B0") },
      "constant": { fg: RGBA.fromHex("#4FC1FF") },
    });

    return new PresentationRenderer(renderer, treeSitterClient, syntaxStyle);
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

    // Render background images first (zIndex: -1)
    for (const element of slide.elements) {
      if (element.type === "image") {
        await this.renderBackgroundImage(element, slide.frontmatter);
      }
    }

    // Determine font and alignment from frontmatter
    const font_name = slide.frontmatter?.font || "jsstickletters";
    const alignment = slide.frontmatter?.align || "left";

    // Start at top
    let title_top = 2;
    let yOffset = title_top;

    // Only render title if it's not empty
    if (slide.title.trim()) {
      // Title - render with specified font
      // Support \n for explicit line breaks in the title
      const font = new Font(font_name);
      const title_parts = slide.title.split('\\n');
      const rendered_parts = title_parts.map(part =>
        font.render_to_string(part.toUpperCase())
      );
      const rendered_title = rendered_parts.join('\n\n'); // Extra line between parts
      const title_lines = rendered_title.split("\n");

      // For centered text, vertically center as well as horizontally center
      if (alignment === "center") {
        // Calculate vertical center position
        title_top = Math.floor((this.renderer.height - title_lines.length) / 2);

        const line_positions = title_lines.map(line =>
          Math.floor((this.renderer.width - line.length) / 2)
        );

        // Apply text color if specified
        const text_color = slide.frontmatter?.text_color;
        const title_content = text_color
          ? new StyledText([fg(text_color)(rendered_title)])
          : rendered_title;

        title_lines.forEach((line, index) => {
          const lineBox = new BoxRenderable(this.renderer, {
            position: "absolute",
            left: line_positions[index],
            top: title_top + index,
            width: line.length + 2,
            height: 1,
            zIndex: 1,
          });

          // Apply color to individual line if text_color is specified
          const line_content = text_color
            ? new StyledText([fg(text_color)(line)])
            : line;

          const lineText = new TextRenderable(this.renderer, {
            content: line_content,
          });

          lineBox.add(lineText);
          this.renderer.root.add(lineBox);
        });
      } else {
        // For left/right alignment, use single box
        let title_left = 5;
        if (alignment === "right") {
          const max_line_length = Math.max(...title_lines.map(l => l.length));
          title_left = this.renderer.width - max_line_length - 5;
        }

        const titleBox = new BoxRenderable(this.renderer, {
          position: "absolute",
          left: title_left,
          top: title_top,
          width: 120,
          height: title_lines.length + 2,
          zIndex: 1,
        });

        // Apply text color if specified
        const text_color = slide.frontmatter?.text_color;
        const title_content = text_color
          ? new StyledText([fg(text_color)(rendered_title)])
          : rendered_title;

        const titleText = new TextRenderable(this.renderer, {
          content: title_content,
        });

        titleBox.add(titleText);
        this.renderer.root.add(titleBox);
      }

      // Content starts after title (accounting for font height)
      yOffset = title_top + title_lines.length + 1;
    }

    for (let i = 0; i < slide.elements.length; i++) {
      const element = slide.elements[i];
      // Skip images as they're already rendered as backgrounds
      if (element.type === "image") continue;

      const next_element = slide.elements[i + 1];
      const result = await this.renderElement(element, 8, yOffset, slide.frontmatter);
      yOffset = result.nextY;

      // Add extra spacing after quotes if next element is not a quote
      if (element.type === "quote" && next_element && next_element.type !== "quote") {
        yOffset += 1;
      }
    }

    // Highlight first link if any
    if (this.links.length > 0) {
      this.highlightLink(0);
    }
  }

  private async renderBackgroundImage(element: Image, frontmatter?: import("./parser").SlideFrontmatter) {
    try {
      if (!frontmatter?.image_position) return;

      const imagePath = `./static/${element.filename}`;
      const imageContent = await Bun.file(imagePath).text();
      const lines = imageContent.split("\n");

      const image_width = Math.max(...lines.map(l => l.length));
      const image_height = lines.length;

      const [x, y] = frontmatter.image_position.split(',').map(s => parseInt(s.trim()));

      const box = new BoxRenderable(this.renderer, {
        position: "absolute",
        left: x,
        top: y,
        width: image_width + 2,
        height: image_height + 2,
        zIndex: -1, // Behind all other content
      });

      // Apply img color if specified
      const img_color = frontmatter?.img_color;
      const content = img_color
        ? new StyledText([fg(img_color)(imageContent)])
        : imageContent;

      const text = new TextRenderable(this.renderer, {
        content,
      });

      box.add(text);
      this.renderer.root.add(box);
    } catch (error) {
      console.error(`Failed to load background image: ${element.filename}`, error);
    }
  }

  private async renderElement(
    element: SlideElement,
    x: number,
    y: number,
    frontmatter?: import("./parser").SlideFrontmatter
  ): Promise<{ nextY: number }> {
    switch (element.type) {
      case "heading": {
        // Use jsstickletters font for level 1 headings
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

          // Apply text color if specified in frontmatter
          const text_color = frontmatter?.text_color;
          const content = text_color
            ? new StyledText([fg(text_color)(rendered_text)])
            : rendered_text;

          const text = new TextRenderable(this.renderer, {
            content,
          });

          box.add(text);
          this.renderer.root.add(box);
          return { nextY: y + lines.length + 3 };
        }

        // Use mini font for level 2 headings
        if (element.level === 2) {
          const font = new Font("mini");
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

          // Apply warm Claude orange color to H2
          const h2_color = "#F58B57"; // rgb(245,139,87)
          const content = new StyledText([fg(h2_color)(rendered_text)]);

          const text = new TextRenderable(this.renderer, {
            content,
          });

          box.add(text);
          this.renderer.root.add(box);
          return { nextY: y + lines.length + 3 };
        }

        // Regular text for level 3 headings
        const box = new BoxRenderable(this.renderer, {
          position: "absolute",
          left: x,
          top: y,
          width: 120,
          height: 2,
          zIndex: 1,
        });

        const text = new TextRenderable(this.renderer, {
          content: `### ${element.content}`,
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
          width: 120,
          height: 2,
          zIndex: 1,
        });

        // Apply bold or inline code styling using StyledText
        const code_color = fg("#CE9178"); // Orange color for inline code
        let content;
        if (element.bold) {
          content = new StyledText([bold(element.content)]);
        } else if (element.inline_code) {
          content = new StyledText([code_color(element.content)]);
        } else {
          content = element.content;
        }

        const text = new TextRenderable(this.renderer, {
          content,
        });

        box.add(text);
        this.renderer.root.add(box);
        return { nextY: y + 2 };
      }

      case "textline": {
        // Render a line that contains multiple parts (regular text, bold text, inline code, links)
        const chunks = [];
        const code_color = fg("#CE9178"); // Orange color for inline code
        for (const part of element.parts) {
          if (part.type === "text") {
            if (part.bold) {
              chunks.push(bold(part.content));
            } else if (part.inline_code) {
              chunks.push(code_color(part.content));
            } else {
              chunks.push({ __isChunk: true as const, text: part.content });
            }
          } else if (part.type === "link") {
            chunks.push({ __isChunk: true as const, text: part.text });
          }
        }

        const box = new BoxRenderable(this.renderer, {
          position: "absolute",
          left: x,
          top: y,
          width: 120,
          height: 2,
          zIndex: 1,
        });

        const text = new TextRenderable(this.renderer, {
          content: new StyledText(chunks),
        });

        box.add(text);
        this.renderer.root.add(box);
        return { nextY: y + 2 };
      }

      case "bullets": {
        let bulletY = y;
        const code_color = fg("#CE9178"); // Orange color for inline code
        for (const item of element.items) {
          const hasLink = item.some((el) => el.type === "link");

          // Build content - collect chunks for StyledText
          const chunks = [];
          const hasStyledParts = item.some(part =>
            part.type === "text" && (part.bold || part.inline_code)
          );

          if (hasStyledParts) {
            // Add bullet as plain text chunk
            chunks.push({ __isChunk: true as const, text: "  • " });

            // Add each part as a chunk
            for (const part of item) {
              if (part.type === "text") {
                if (part.bold) {
                  chunks.push(bold(part.content));
                } else if (part.inline_code) {
                  chunks.push(code_color(part.content));
                } else {
                  chunks.push({ __isChunk: true as const, text: part.content });
                }
              } else if (part.type === "link") {
                chunks.push({ __isChunk: true as const, text: part.text });
              }
            }
            var content = new StyledText(chunks);
          } else {
            // Plain string
            let str = "  • ";
            for (const part of item) {
              if (part.type === "text") {
                str += part.content;
              } else if (part.type === "link") {
                str += part.text;
              }
            }
            var content = str;
          }

          const box = new BoxRenderable(this.renderer, {
            position: "absolute",
            left: x,
            top: bulletY,
            width: 120,
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

          // Apply img color if specified
          const img_color = frontmatter?.img_color;
          const content = img_color
            ? new StyledText([fg(img_color)(imageContent)])
            : imageContent;

          const text = new TextRenderable(this.renderer, {
            content,
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

      case "card": {
        // Create ASCII box around the card content
        const content_length = element.content.length;
        const box_width = content_length + 4;

        const top_border = "╔" + "═".repeat(content_length + 2) + "╗";
        const content_line = "║ " + element.content + " ║";
        const bottom_border = "╚" + "═".repeat(content_length + 2) + "╝";

        const card_content = [top_border, content_line, bottom_border].join("\n");

        // Center the card horizontally
        const card_left = Math.floor((this.renderer.width - box_width) / 2);

        const box = new BoxRenderable(this.renderer, {
          position: "absolute",
          left: card_left,
          top: y,
          width: box_width + 2,
          height: 5,
          zIndex: 1,
        });

        // Apply soft coral red color to card
        const card_color = "#EB5F57"; // rgb(235,95,87) - Soft coral red with orange tinge
        const content = new StyledText([fg(card_color)(card_content)]);

        const text = new TextRenderable(this.renderer, {
          content,
        });

        box.add(text);
        this.renderer.root.add(box);

        return { nextY: y + 5 };
      }

      case "code": {
        // Check if borders should be shown (default: true)
        const show_border = frontmatter?.code_border !== false;

        // Calculate dimensions first
        const code_lines = element.content.split("\n");
        const max_line_length = Math.max(...code_lines.map(l => l.length));

        // If no border requested, just render plain code
        if (!show_border) {
          let content_to_render: StyledText | string;
          if (element.language) {
            try {
              content_to_render = await treeSitterToStyledText(
                element.content,
                element.language,
                this.syntaxStyle,
                this.treeSitterClient
              );
            } catch (error) {
              console.error(`Failed to highlight ${element.language} code:`, error);
              content_to_render = element.content;
            }
          } else {
            content_to_render = element.content;
          }

          const box_width = max_line_length + 4;
          const box_height = code_lines.length + 2;
          const box_left = Math.floor((this.renderer.width - box_width) / 2);

          const box = new BoxRenderable(this.renderer, {
            position: "absolute",
            left: box_left,
            top: y,
            width: box_width,
            height: box_height,
            zIndex: 1,
          });

          const text = new TextRenderable(this.renderer, {
            content: content_to_render,
          });

          box.add(text);
          this.renderer.root.add(box);

          return { nextY: y + box_height + 2 };
        }

        // Build bordered version
        const content_width = max_line_length + 2; // Add padding inside border
        const top_border = "┌" + "─".repeat(content_width) + "┐";
        const bottom_border = "└" + "─".repeat(content_width) + "┘";

        // Border color (subtle gray)
        const border_color = RGBA.fromHex("#666666");

        // Apply syntax highlighting if language is specified
        let content_to_render: StyledText | string;
        if (element.language) {
          try {
            // Get the syntax-highlighted content
            const highlighted = await treeSitterToStyledText(
              element.content,
              element.language,
              this.syntaxStyle,
              this.treeSitterClient
            );

            // Build bordered content with syntax highlighting preserved
            const new_chunks: any[] = [];

            // Top border
            new_chunks.push({ __isChunk: true, text: top_border + "\n", fg: border_color });

            // Process highlighted chunks line by line
            let current_line = "";
            let line_chunks: any[] = [];
            let line_index = 0;

            for (const chunk of highlighted.chunks) {
              const chunk_text = chunk.text;
              const lines = chunk_text.split("\n");

              for (let i = 0; i < lines.length; i++) {
                const line_part = lines[i];

                if (i > 0) {
                  // New line - finish previous line and start new one
                  const padding = " ".repeat(content_width - current_line.length - 1);

                  // Add left border
                  new_chunks.push({ __isChunk: true, text: "│ ", fg: border_color });
                  // Add line content chunks
                  new_chunks.push(...line_chunks);
                  // Add padding and right border
                  new_chunks.push({ __isChunk: true, text: padding + "│\n", fg: border_color });

                  // Reset for new line
                  current_line = "";
                  line_chunks = [];
                  line_index++;
                }

                if (line_part.length > 0) {
                  current_line += line_part;
                  line_chunks.push({
                    __isChunk: true,
                    text: line_part,
                    fg: chunk.fg,
                    bg: chunk.bg,
                    attributes: chunk.attributes,
                  });
                }
              }
            }

            // Handle last line if any
            if (current_line.length > 0 || line_index === 0) {
              const padding = " ".repeat(content_width - current_line.length - 1);
              new_chunks.push({ __isChunk: true, text: "│ ", fg: border_color });
              new_chunks.push(...line_chunks);
              new_chunks.push({ __isChunk: true, text: padding + "│\n", fg: border_color });
            }

            // Bottom border
            new_chunks.push({ __isChunk: true, text: bottom_border, fg: border_color });

            content_to_render = new StyledText(new_chunks);
          } catch (error) {
            // If highlighting fails, use plain bordered text
            console.error(`Failed to highlight ${element.language} code:`, error);
            const bordered_lines = code_lines.map(line => {
              const padding = " ".repeat(content_width - line.length - 1);
              return `│ ${line}${padding}│`;
            });
            content_to_render = [top_border, ...bordered_lines, bottom_border].join("\n");
          }
        } else {
          // No syntax highlighting - just plain bordered text
          const bordered_lines = code_lines.map(line => {
            const padding = " ".repeat(content_width - line.length - 1);
            return `│ ${line}${padding}│`;
          });
          content_to_render = [top_border, ...bordered_lines, bottom_border].join("\n");
        }

        // Calculate box dimensions (account for borders)
        const box_width = content_width + 2; // Border characters
        const box_height = code_lines.length + 2; // Top and bottom borders

        // Center horizontally
        const box_left = Math.floor((this.renderer.width - box_width) / 2);

        const box = new BoxRenderable(this.renderer, {
          position: "absolute",
          left: box_left,
          top: y,
          width: box_width,
          height: box_height,
          zIndex: 1,
        });

        const text = new TextRenderable(this.renderer, {
          content: content_to_render,
        });

        box.add(text);
        this.renderer.root.add(box);

        return { nextY: y + box_height + 2 };
      }

      case "asciinema": {
        try {
          const castPath = `./static/${element.filename}`;
          const castContent = await Bun.file(castPath).text();

          // Calculate viewport to fit on screen (leave room for title/margins)
          const available_height = this.renderer.height - y - 2;
          const available_width = this.renderer.width - x - 2;

          const player = new AsciinemaPlayer(this.renderer, castContent, {
            position: { x, y },
            autoplay: element.autoplay ?? false,
            loop: element.loop ?? false,
            speed: element.speed ?? 1.0,
            viewport: {
              top: 0,
              left: 0,
              width: Math.min(available_width, 120),
              height: Math.min(available_height, 40),
            },
          });

          return { nextY: y + Math.min(available_height, 40) + 2 };
        } catch (error) {
          console.error(`Failed to load asciinema cast: ${element.filename}`, error);
          return { nextY: y + 1 };
        }
      }

      case "quote": {
        const box = new BoxRenderable(this.renderer, {
          position: "absolute",
          left: x,
          top: y,
          width: 120,
          height: 1,
          zIndex: 1,
        });

        // Light gray color for quotes from the theme palette
        const quote_color = fg("#999999"); // rgb(153,153,153)
        // Add a cool vertical bar prefix
        const content = new StyledText([quote_color(`▌ ${element.content}`)]);

        const text = new TextRenderable(this.renderer, {
          content,
        });

        box.add(text);
        this.renderer.root.add(box);
        return { nextY: y + 1 };
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
