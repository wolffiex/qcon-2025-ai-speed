# Engineering at AI Speed

![Engineering at AI Speed](static/title.png)

Lessons from the First Agentically Accelerated Software Project

**QCon San Francisco 2025**
[Conference Session](https://qconsf.com/presentation/nov2025/engineering-ai-speed-lessons-first-agentically-accelerated-software-project)

---

## About This Repository

This repository contains the presentation materials and live demos for the talk "Engineering at AI Speed: Lessons from the First Agentically Accelerated Software Project."

The talk draws from our experience building [Claude Code](https://claude.com/claude-code), Anthropic's CLI for AI-assisted development—the first AI coding agent built using itself. **90% of Claude Code's code was written with or by Claude Code**, giving us unique insights into what it means to work at AI speed.

## Core Thesis

> **AI gives you velocity. You provide direction.**

Engineering at AI speed isn't about writing code faster—it's about asking "why?" better.

## The Three Stories

We explore three modules from Claude Code's development that had wildly different outcomes:

### 🎯 Cursor: Going Deep (333 → 945 lines)

Built a custom text input engine because libraries couldn't intercept `/` and `@` characters. Shipping revealed unexpected Unicode complexity: normalization, CJK width, grapheme clusters. Achieved 362x performance improvement through lazy evaluation.

**Pattern:** Domain reality demanded going deep

### 🐚 Shell: Going Broad (773 → 4,109 lines)

Evolved through three phases as real needs emerged: sequential → parallel execution, bare shell → user environment snapshots, and production requirements including 3,293 lines of security code.

**Pattern:** User workflows kept expanding requirements

### 🗄️ SQLite: Going Back (500+ → 277 lines in 15 days)

Built a database for migrations we thought we'd need. Five problems emerged: wrong availability tradeoff, native dependencies, locking issues, migration failures, and version skew. The irony: intended to solve coordination, became the liability. Replaced with simple JSONL.

**Pattern:** Second-order effects revealed wrong direction

## Key Takeaways

### The Shift in Constraints

**Before AI:** Implementation cost forced careful planning → constraint = quality gate
**With AI:** Implementation is cheap → removed constraint = removed gate

**Implication:** Judgment must replace what implementation cost used to provide

### Three Types of Unknowns

1. **Domain constraints** you didn't know existed (Cursor: Unicode normalization)
2. **User workflows** you didn't model (Shell: aliases, security needs)
3. **Second-order effects** you didn't anticipate (SQLite: version skew)

### Earned Complexity

Simple ≠ fewer lines
Simple = complexity earned by requirements

- **Cursor: 945 lines = simple** (Unicode demands it)
- **Shell: 4,109 lines = simple enough** (users need it)
- **SQLite: 500+ lines = not simple** (nothing earned it)

## Running the Presentation

This presentation uses a custom terminal-based presentation system with live code demos.

```bash
bun install
bun src/presentation.ts
```

### Navigation

- **Arrow Keys (←/→):** Navigate between slides
- **Arrow Keys (↑/↓):** Select interactive links
- **Enter:** Activate links (run demos, open URLs)

### Live Demos

The presentation includes interactive demos that run in tmux:

- `demos/cursor-*.ts` - Text input and Unicode handling
- `demos/shell-*.ts` - Command execution and environment management
- `demos/sqlite-*.ts` - Database complexity and migration issues
- `demos/simple-storage.ts` - The simple JSONL replacement

## Repository Contents

```
content/
├── src/               # Presentation system implementation
├── static/            # Presentation content and ASCII art
│   ├── presentation.md        # Main slide deck
│   ├── presentation-notes.md  # Speaker notes
│   └── *.txt                  # ASCII art assets
├── demos/             # Live code demonstrations
└── docs/              # Technical documentation
    └── markdown.md    # Presentation system docs
```

## The Framework We Built

The presentation itself runs on a custom terminal-based presentation system we built for this talk. It features:

- Markdown-based slide format
- ASCII art rendering
- Live code execution via tmux integration
- Interactive navigation

For technical details about the presentation framework, see [docs/markdown.md](docs/markdown.md).

## Three Questions to Ask Yourself

When engineering at AI speed:

1. **What will shipping reveal that planning can't?**
   Domain constraints, user workflows, second-order effects

2. **Is this complexity earned by reality?**
   Does something break without it?

3. **Am I iterating toward or away from simple?**
   Complexity should decrease as understanding increases

## Contact

**Adam Wolff**
Member of Technical Staff, Anthropic

- Twitter/X: [@wolffiex](https://twitter.com/wolffiex)
- GitHub: [wolffiex](https://github.com/wolffiex)

## License

This presentation and demo code are provided for educational purposes.
