#!/usr/bin/env bun

import { parsePresentation } from "../src/parser";
import { PresentationRenderer } from "../src/renderer";

const presentationPath = "./static/presentation.md";

async function previewSlide(slideNumber: number) {
  const markdown = await Bun.file(presentationPath).text();
  const slides = parsePresentation(markdown);

  if (slideNumber < 1 || slideNumber > slides.length) {
    console.error(`Slide ${slideNumber} not found. Valid range: 1-${slides.length}`);
    process.exit(1);
  }

  const slide = slides[slideNumber - 1];

  // Create renderer and render the slide
  const renderer = await PresentationRenderer.create();
  renderer.slides = slides;
  renderer.currentSlide = slideNumber - 1;
  await renderer.renderSlide(slide);
}

const slideNumber = parseInt(process.argv[2]);

if (isNaN(slideNumber)) {
  console.error("Usage: bun scripts/preview.ts <slide_number>");
  process.exit(1);
}

await previewSlide(slideNumber);
