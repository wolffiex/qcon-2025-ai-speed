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

export interface Slide {
  title: string;
  elements: SlideElement[];
}

export function parsePresentation(markdown: string): Slide[] {
  // First split on slide separators (---)
  const slideContents = markdown.split(/\n---\n/);
  const slides: Slide[] = [];

  for (const slideContent of slideContents) {
    const slide = parseSlide(slideContent);
    if (slide) {
      slides.push(slide);
    }
  }

  return slides;
}

function parseSlide(markdown: string): Slide | null {
  const lines = markdown.trim().split("\n");
  if (lines.length === 0) return null;

  let currentSlide: Slide | null = null;
  let currentBulletList: BulletList | null = null;

  for (let i = 0; i < lines.length; i++) {
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
        currentSlide = { title, elements: [] };
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
      currentSlide = { title: "", elements: [] };
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
