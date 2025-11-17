#!/usr/bin/env bun

import { parsePresentation } from "../src/parser";

const presentationPath = "./static/presentation.md";

async function analyzeSlides() {
  const markdown = await Bun.file(presentationPath).text();
  const slides = parsePresentation(markdown);

  console.log(`Total slides: ${slides.length}\n`);
  console.log("Slide lengths (lines):\n");

  const longSlides: number[] = [];

  // Need to get raw slide contents to count lines accurately
  const slideContents = markdown.split(/\n---\n/);

  slideContents.forEach((slide, index) => {
    const lines = slide.trim().split("\n").length;
    const marker = lines > 22 ? " ⚠️ TOO LONG" : "";
    console.log(`Slide ${index + 1}: ${lines} lines${marker}`);

    if (lines > 22) {
      longSlides.push(index + 1);
    }
  });

  console.log(`\n${longSlides.length} slides over 22 lines: ${longSlides.join(", ")}`);
}

await analyzeSlides();
