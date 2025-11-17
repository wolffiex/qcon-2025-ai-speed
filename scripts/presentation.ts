#!/usr/bin/env bun

import { parsePresentation } from "../src/parser";
import { PresentationRenderer } from "../src/renderer";
import { $ } from "bun";

async function main() {
  // Load presentation markdown
  const markdown = await Bun.file("./static/presentation.md").text();
  const slides = parsePresentation(markdown);

  if (slides.length === 0) {
    console.error("No slides found in presentation.md");
    process.exit(1);
  }

  // Create renderer
  const renderer = await PresentationRenderer.create();
  renderer.slides = slides;

  // Render first slide
  await renderer.renderSlide(slides[0]);

  // Setup keyboard navigation using OpenTUI's KeyHandler
  const keyHandler = renderer.renderer.keyInput;

  keyHandler.on("keypress", async (event) => {
    // Arrow keys
    if (event.name === "up") {
      // Up arrow - navigate links
      renderer.navigateLinks("up");
    } else if (event.name === "down") {
      // Down arrow - navigate links
      renderer.navigateLinks("down");
    } else if (event.name === "right" || event.name === "n") {
      // Right arrow or n - next slide
      if (renderer.currentSlide < slides.length - 1) {
        renderer.currentSlide++;
        await renderer.renderSlide(slides[renderer.currentSlide]);
      }
    } else if (event.name === "left" || event.name === "p") {
      // Left arrow or p - previous slide
      if (renderer.currentSlide > 0) {
        renderer.currentSlide--;
        await renderer.renderSlide(slides[renderer.currentSlide]);
      }
    } else if (event.name === "return" || event.name === "enter") {
      // Enter - activate link
      const link = renderer.getSelectedLink();
      if (link) {
        if (link.url.startsWith("demo://")) {
          await executeDemoLink(link.url);
        } else if (link.url.startsWith("asciinema://")) {
          await playAsciinemaLink(link.url);
        }
      }
    } else if (event.name === "e") {
      // e - edit demo in vim
      const link = renderer.getSelectedLink();
      if (link && link.url.startsWith("demo://")) {
        await editDemoLink(link.url);
      }
    }
  });
}

function parseDemoUrl(url: string): string | null {
  const match = url.match(/^demo:\/\/(.+)$/);
  if (!match) {
    console.error(`Invalid demo URL: ${url}`);
    return null;
  }
  return match[1];
}

async function openTmuxWindow(name: string, command: string) {
  const r1 = await $`tmux new-window -a -t :{end} -n ${name}`.nothrow();
  if (r1.exitCode !== 0) {
    throw new Error(`tmux new-window failed: ${r1.stderr.toString()}`);
  }
  const full_command = `${command}; exit`;
  const r2 = await $`tmux send-keys -t ${name} -l ${full_command}`.nothrow();
  if (r2.exitCode !== 0) {
    throw new Error(`tmux send-keys failed: ${r2.stderr.toString()}`);
  }
  await $`tmux send-keys -t ${name} Enter`;
}

async function executeDemoLink(url: string) {
  const demo = parseDemoUrl(url);
  if (!demo) return;

  try {
    await openTmuxWindow(demo, `bun demos/${demo}.ts`);
  } catch (error) {
    console.error(`Failed to execute tmux link: ${url}`, error);
  }
}

async function editDemoLink(url: string) {
  const demo = parseDemoUrl(url);
  if (!demo) return;

  try {
    await openTmuxWindow("vim", `vim demos/${demo}.ts`);
  } catch (error) {
    console.error(`Failed to open demo in editor: ${url}`, error);
  }
}

async function playAsciinemaLink(url: string) {
  const match = url.match(/^asciinema:\/\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid asciinema URL: ${url}`);
  }
  const file = match[1];

  try {
    await openTmuxWindow("asciinema", `/opt/homebrew/bin/asciinema play -q static/${file}`);
  } catch (error) {
    console.error(`Failed to play asciinema: ${url}`, error);
  }
}

main().catch(console.error);
