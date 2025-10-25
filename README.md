# Terminal Presentation System

A terminal-based presentation system with ASCII art support, live code execution, and tmux integration.

## Getting Started

```bash
bun install
bun src/presentation.ts
```

## Markdown Format

Presentations are written in a custom markdown format stored in `static/presentation.md`.

### Slide Structure

Each slide begins with an H1 heading (`#`). Everything following the H1 until the next H1 is part of that slide.

```markdown
# Slide Title

Content goes here...

# Next Slide

More content...
```

### Supported Elements

#### Headings

- **H1** (`#`): Creates a new slide with the title
- **H2** (`##`): Section heading within a slide
- **H3** (`###`): Subsection heading within a slide

```markdown
# Main Slide Title

## Section Heading

### Subsection Heading
```

#### Text

Regular paragraphs are rendered as plain text:

```markdown
This is regular text on the slide.
```

#### Bullet Lists

Use `-` or `*` to create bullet points:

```markdown
- First bullet point
- Second bullet point
- Third bullet point
```

#### Links

Standard markdown links can be used for interactive elements:

```markdown
[Click me](https://example.com)
```

Links can also be embedded in bullet points:

```markdown
- This is a [clickable link](https://example.com) in a bullet
```

#### Images (ASCII Art)

Use standard markdown image syntax to embed ASCII art files from the `static/` directory:

```markdown
![description](filename.txt)
```

The system will load the contents of `static/filename.txt` and render it in the slide.

Example:
```markdown
![helicopter](heli.txt)
```

### Tmux Integration

Special `tmux://` URLs allow you to execute commands in tmux panes:

```markdown
[Run demo](tmux://pane-name/command to run)
```

**Format:** `tmux://[pane-name]/[command]`

- `pane-name`: The target tmux pane or window name
- `command`: The command to execute

**Examples:**

```markdown
- [Run tests](tmux://test/bun test)
- [Build project](tmux://build/bun run build)
- [Clear screen](tmux://main/clear)
- [Run script](tmux://demo/bun src/demo.ts)
```

When you press Enter on a tmux link:
1. The system checks if the pane exists
2. If not, it creates a new window with that name
3. It sends the command to the pane

## Keyboard Navigation

- **Left Arrow** (`←`): Previous slide
- **Right Arrow** (`→`): Next slide
- **Up Arrow** (`↑`): Navigate to previous link
- **Down Arrow** (`↓`): Navigate to next link
- **Enter** (`↵`): Activate selected link (opens URL or executes tmux command)

## Features

### Visual Styling

- Dark terminal theme with custom colors
- Highlighted links that change color when selected
- Emoji support throughout
- Proper spacing and layout

### Link Highlighting

- Links are highlighted with a dark blue background (`#16213e`)
- The currently selected link has a red/pink highlight (`#e94560`)
- Navigate between links using arrow keys

### ASCII Art Support

Place ASCII art files in the `static/` directory and reference them in your presentation:

```
static/
  ├── presentation.md
  ├── heli.txt
  ├── border1.txt
  └── ... other art files
```

### Live Code Execution

Using tmux integration, you can:
- Run demos during your presentation
- Execute tests live
- Start/stop services
- Show real-time command output

## Example Presentation

```markdown
# Welcome to My Talk 🎨

This is the introduction slide.

## Overview

- Point one
- Point two with a [demo link](tmux://demo/bun src/demo.ts)
- Point three

# Demo Slide

Check out this ASCII art:

![cool art](art.txt)

## Try It

[Run the code](tmux://main/bun run example)

# Thank You! 🎉

Questions?
```

## Architecture

- **Parser** (`src/parser.ts`): Parses markdown into slide objects
- **Renderer** (`src/renderer.ts`): Renders slides using OpenTUI
- **Presentation** (`src/presentation.ts`): Main application with keyboard handling

## Requirements

- Bun runtime
- tmux (for interactive command execution)
- Terminal with emoji support (for best experience)

## Tips

1. Keep slides concise - terminal real estate is limited
2. Use ASCII art sparingly for visual interest
3. Test tmux links to ensure pane names and commands work
4. Emojis work great for visual flair
5. Use links to make presentations interactive

---
