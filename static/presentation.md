# Engineering at AI Speed ⚡

Lessons from the First Agentically Accelerated Software Project

**QCon San Francisco 2025**

---

## What We'll Cover

Three war stories from building with AI agents:

- 🎯 Episode 1: Virtualizing Input & The Cursor Class
- 🐚 Episode 2: Shell Implementation Evolution
- 🗄️ Episode 3: The SQLite Decision Reversal

---

# Episode 1: Virtualizing Input 🎯

## The Problem

Building a terminal presentation system with interactive elements

- Need to handle keyboard input
- Need to track cursor position
- Need to update display efficiently

## The Insight

> "Wait... we can virtualize this"

- Abstract terminal operations into a Cursor class
- Decouple input handling from rendering
- Enable testing without a real terminal

## The Original Cursor Class

Key responsibilities:
- Track virtual cursor position
- Buffer terminal operations
- Convert logical operations to escape sequences
- Provide clean API for rendering

---

# Episode 2: Shell Implementation 🐚

## Act 1: The Interactive Shell

**Initial approach:** Abstraction over stdin

```typescript
// Send commands to interactive shell
shell.stdin.write('ls\n')
```

**Problems:**
- Sequential execution only
- Hard to capture output reliably
- State management nightmares

## Act 2: The Spawn Revelation

**Better approach:** spawn for parallelism

```typescript
// Each command gets its own process
spawn('ls', ['-la'])
```

**Benefits:**
- Run commands in parallel
- Clean output capture
- No shared state issues

## Act 3: Snapshotting

**The final piece:** State management

- Snapshot terminal state before commands
- Restore on navigation
- Enable true interactivity

**Key insight:** Not just about running commands, but managing state over time

---

# Episode 3: Unshipping SQLite 🗄️

## The Decision to Add

**Why SQLite seemed right:**
- Rock-solid storage foundation
- ACID guarantees
- Worked great at Robinhood
- "Professional" architecture

[Show SQLite complexity](tmux://main/bun demos/sqlite-before.ts)

## Five Reasons It Had To Go

### 1. Availability > Consistency

> "If you're a financial firm, crash on data inconsistency.
> For Claude Code, crashing IS the worst outcome."

- Model is adaptive - better to keep running
- Users can't recover from crashes
- Data perfection < availability

### 2. Native Dependency Hell

The npm ecosystem & native deps don't mix:
- pnpm basically doesn't handle them
- Users hit installation issues constantly
- Moving to single-file executable (Bun)
- Didn't want to pressurize that migration

### 3. SQLite's Weird Locking

- No row or table-level locking
- Read throws if anyone holds write lock
- Not what you expect from a "database"

[Show locking demo](tmux://main/bun demos/sqlite-locking.ts)

### 4. Migration Nightmares

**Real story:** Forgot `ON DELETE CASCADE` on foreign keys

- Constraints can't be modified
- Tried to migrate → data loss
- Still don't fully understand why

**With AI speed:** You ship these mistakes before you learn

### 5. The Multiprocess Irony

**Expected:** SQLite solves multiprocess coordination
**Reality:** SQLite WAS the multiprocess problem

- Colleague used `better-lockfile` instead
- Auto-updater couldn't depend on it
- The foundation was the liability

## The Unshipping

[Show simple alternative](tmux://main/bun demos/simple-storage.ts)

**Lesson:** AI velocity makes adding complexity dangerously easy
**Corollary:** Wisdom is knowing when to back out

---

# What We Learned 🎓

## About AI-Accelerated Development

- Speed enables experimentation
- But also enables over-engineering
- Architecture decisions matter more, not less
- Iterate fast, but reflect often

## Key Principles

1. **Virtual First:** Abstract early, test easily
2. **Iterate Boldly:** Don't fear rewrites when you learn
3. **Simplicity Wins:** Fast implementation ≠ keep everything
4. **State Matters:** Get state management right

---

# The Meta Lesson 🤔

## AI Changes the Bottleneck

**Before AI:**
- Implementation was slow
- Architects designed carefully upfront
- Rewrites were expensive

**With AI:**
- Implementation is fast
- Experimentation is cheap
- Knowing what to build matters more than how

## New Skills for AI Speed

- Rapid prototyping → Rapid pruning
- Architecture sense over coding skill
- Recognizing over-complexity faster
- Comfortable with major refactors

---

# Conclusion 🎯

[TODO: Final thoughts to be determined]

**Questions?**

---

# Thanks! 🙏

**Engineering at AI Speed**
Lessons from the Agentically Accelerated Project

Contact: [TODO]
Code: [TODO]

---

# Appendix: Interactive Demos

[Add live demos here if needed]

- [Demo 1: Cursor virtualization](tmux://main/bun demos/cursor-demo.ts)
- [Demo 2: Shell execution](tmux://main/bun demos/shell-demo.ts)
- [Demo 3: State management](tmux://main/bun demos/state-demo.ts)
