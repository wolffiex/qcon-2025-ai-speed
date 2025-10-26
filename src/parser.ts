// Markdown parser for presentation slides

export interface Link {
  type: "link";
  text: string;
  url: string;
}

export interface Image {
  type: "image";
  alt: string;
  filename: string;
}

export interface Text {
  type: "text";
  content: string;
  bold?: boolean;
}

export interface Heading {
  type: "heading";
  level: 1 | 2 | 3;
  content: string;
}

export interface BulletList {
  type: "bullets";
  items: Array<Text | Link>[];
}

export type SlideElement = Heading | Text | BulletList | Image | Link;

export interface SlideFrontmatter {
  font?: string;
  align?: "left" | "center" | "right";
  image_position?: string; // Format: "x,y" for absolute positioning
}

export interface Slide {
  title: string;
  elements: SlideElement[];
  frontmatter?: SlideFrontmatter;
}

export function parsePresentation(markdown: string): Slide[] {
  // Split slides while being aware of frontmatter
  const slideContents = splitSlides(markdown);
  const slides: Slide[] = [];

  for (const slideContent of slideContents) {
    const slide = parseSlide(slideContent);
    if (slide) {
      slides.push(slide);
    }
  }

  return slides;
}

function splitSlides(markdown: string): string[] {
  const lines = markdown.split("\n");
  const slides: string[] = [];
  let currentSlide: string[] = [];
  let inFrontmatter = false;
  let frontmatterStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this is the start of frontmatter
    if (trimmed === "---" && currentSlide.length === 0) {
      inFrontmatter = true;
      frontmatterStart = i;
      currentSlide.push(line);
      continue;
    }

    // Check if this is the end of frontmatter
    if (trimmed === "---" && inFrontmatter && i > frontmatterStart) {
      inFrontmatter = false;
      currentSlide.push(line);
      continue;
    }

    // Check if this is a slide separator (not in frontmatter)
    if (trimmed === "---" && !inFrontmatter && currentSlide.length > 0) {
      // End current slide
      slides.push(currentSlide.join("\n"));
      currentSlide = [];
      continue;
    }

    currentSlide.push(line);
  }

  // Don't forget the last slide
  if (currentSlide.length > 0) {
    slides.push(currentSlide.join("\n"));
  }

  return slides;
}

function parseSlide(markdown: string): Slide | null {
  const lines = markdown.trim().split("\n");
  if (lines.length === 0) return null;

  let currentSlide: Slide | null = null;
  let currentBulletList: BulletList | null = null;
  let frontmatter: SlideFrontmatter | undefined;

  // Check for frontmatter at the beginning
  let startIndex = 0;
  const firstLine = lines[0]?.trim();

  // Handle both "---" and empty first line followed by "---"
  if (firstLine === "---" || (firstLine === "" && lines[1]?.trim() === "---")) {
    const fmStart = firstLine === "---" ? 0 : 1;

    // Find the closing ---
    let endIndex = -1;
    for (let i = fmStart + 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        endIndex = i;
        break;
      }
    }

    if (endIndex > 0) {
      // Parse frontmatter
      frontmatter = {};
      for (let i = fmStart + 1; i < endIndex; i++) {
        const line = lines[i].trim();
        if (line === "") continue;
        const match = line.match(/^([\w-]+):\s*(.+)$/);
        if (match) {
          const key = match[1];
          const value = match[2];
          if (key === "font") {
            frontmatter.font = value;
          } else if (key === "align") {
            frontmatter.align = value as "left" | "center" | "right";
          } else if (key === "image-position" || key === "image_position") {
            frontmatter.image_position = value;
          }
        }
      }
      startIndex = endIndex + 1;
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines between sections
    if (trimmed === "") {
      // End current bullet list
      if (currentBulletList && currentSlide) {
        currentSlide.elements.push(currentBulletList);
        currentBulletList = null;
      }
      continue;
    }

    // H1 - Slide title (first one becomes the title)
    if (trimmed.startsWith("# ")) {
      if (!currentSlide) {
        const title = trimmed.substring(2).trim();
        currentSlide = { title, elements: [], frontmatter };
      } else {
        // Additional H1s are treated as heading elements
        if (currentBulletList) {
          currentSlide.elements.push(currentBulletList);
          currentBulletList = null;
        }
        const content = trimmed.substring(2).trim();
        currentSlide.elements.push({ type: "heading", level: 1, content });
      }
      continue;
    }

    // Initialize slide with empty title if no H1 found yet
    if (!currentSlide) {
      currentSlide = { title: "", elements: [], frontmatter };
    }

    // H2
    if (trimmed.startsWith("## ")) {
      if (currentBulletList) {
        currentSlide.elements.push(currentBulletList);
        currentBulletList = null;
      }
      const content = trimmed.substring(3).trim();
      currentSlide.elements.push({ type: "heading", level: 2, content });
      continue;
    }

    // H3
    if (trimmed.startsWith("### ")) {
      if (currentBulletList) {
        currentSlide.elements.push(currentBulletList);
        currentBulletList = null;
      }
      const content = trimmed.substring(4).trim();
      currentSlide.elements.push({ type: "heading", level: 3, content });
      continue;
    }

    // Image: ![alt](filename.txt)
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      if (currentBulletList) {
        currentSlide.elements.push(currentBulletList);
        currentBulletList = null;
      }
      currentSlide.elements.push({
        type: "image",
        alt: imageMatch[1],
        filename: imageMatch[2],
      });
      continue;
    }

    // Bullet list item
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.substring(2).trim();
      const item = parseLine(content);

      if (!currentBulletList) {
        currentBulletList = { type: "bullets", items: [] };
      }
      currentBulletList.items.push(item);
      continue;
    }

    // Regular text line
    if (currentBulletList) {
      currentSlide.elements.push(currentBulletList);
      currentBulletList = null;
    }

    const parsedLine = parseLine(trimmed);
    currentSlide.elements.push(...parsedLine);
  }

  // Don't forget the last bullet list
  if (currentBulletList && currentSlide) {
    currentSlide.elements.push(currentBulletList);
  }

  return currentSlide;
}

// Parse a line for links, bold text, and regular text
function parseLine(content: string): Array<Text | Link> {
  const elements: Array<Text | Link> = [];
  // Match links [text](url) or bold **text**
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      const text = content.substring(lastIndex, match.index);
      if (text) {
        elements.push({ type: "text", content: text });
      }
    }

    // Check if it's a link or bold
    if (match[1] !== undefined) {
      // It's a link [text](url)
      elements.push({
        type: "link",
        text: match[1],
        url: match[2],
      });
    } else if (match[3] !== undefined) {
      // It's bold **text**
      elements.push({
        type: "text",
        content: match[3],
        bold: true,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.substring(lastIndex);
    if (text) {
      elements.push({ type: "text", content: text });
    }
  }

  // If no elements, just return the content as text
  if (elements.length === 0) {
    return [{ type: "text", content }];
  }

  return elements;
}
