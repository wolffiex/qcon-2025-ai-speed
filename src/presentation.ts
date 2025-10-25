import { parsePresentation } from "./parser";
import { PresentationRenderer } from "./renderer";
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
    } else if (event.name === "right") {
      // Right arrow - next slide
      if (renderer.currentSlide < slides.length - 1) {
        renderer.currentSlide++;
        await renderer.renderSlide(slides[renderer.currentSlide]);
      }
    } else if (event.name === "left") {
      // Left arrow - previous slide
      if (renderer.currentSlide > 0) {
        renderer.currentSlide--;
        await renderer.renderSlide(slides[renderer.currentSlide]);
      }
    } else if (event.name === "return" || event.name === "enter") {
      // Enter - activate link
      const link = renderer.getSelectedLink();
      if (link && link.url.startsWith("tmux://")) {
        await executeTmuxLink(link.url);
      }
    }
  });
}

async function executeTmuxLink(url: string) {
  try {
    // Parse tmux://pane/command
    const match = url.match(/^tmux:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      console.error(`Invalid tmux URL: ${url}`);
      return;
    }

    const [, pane, command] = match;

    // Check if pane exists, create if not
    try {
      await $`tmux list-panes -t ${pane}`.quiet();
    } catch {
      // Pane doesn't exist, create a new window with that name
      try {
        await $`tmux new-window -n ${pane}`.quiet();
      } catch {
        // If we can't create a window, just try to send to the pane anyway
      }
    }

    // Send keys to tmux pane
    await $`tmux send-keys -t ${pane} ${command} Enter`;
  } catch (error) {
    console.error(`Failed to execute tmux link: ${url}`, error);
  }
}

main().catch(console.error);
