#!/usr/bin/env bun

import { createCliRenderer } from "@opentui/core";
import { AsciinemaPlayer } from "../src/asciinema-player";

async function main() {
  // Load the test cast
  const cast_content = await Bun.file("./static/test.cast").text();

  // Create renderer
  const renderer = await createCliRenderer({
    targetFps: 30,
    useAlternateScreen: true,
    exitOnCtrlC: true,
  });

  // Create player
  const player = new AsciinemaPlayer(renderer, cast_content, {
    position: { x: 2, y: 2 },
    autoplay: true,
    loop: false,
    speed: 1.0,
  });

  console.log("Playing asciinema cast...");
  console.log("Press Ctrl+C to exit");

  // Keep running
  await new Promise(() => {});
}

main().catch(console.error);
