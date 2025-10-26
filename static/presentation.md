---
font: ansishadow
align: center
image-position: 96, 6
---
# Engineering\nat\nAI Speed
![lightning](lightning.txt)

---

# Engineering at AI Speed ⚡

Lessons from the First Agentically Accelerated Software Project

**QCon San Francisco 2025**

---

## The Unique Context

**Claude Code** - Anthropic's CLI for AI-assisted development

**First of its kind:**
- First AI coding agent
- First fully agent-enabled codebase
- Built using Claude Code itself (dogfooding from day one)

**90% of Claude Code's code is written with or by Claude Code**

**This gives us unique insight:** We didn't just build an AI tool.
We learned what it's like to work at AI speed.

---

## Three Examples

**Three modules. AI made implementation fast.**

**Three different outcomes:**
- One went from 333 → 945 lines
- One went from 773 → 4,109 lines
- One went from 500+ → 277 lines

**Why?**

---

## What We'll Cover

Three war stories:

- 🎯 **Cursor:** Virtualizing input (going deep)
- 🐚 **Shell:** Command execution (going broad)
- 🗄️ **SQLite:** Storage (going back)

---

## The Meta-Pattern

**Watch for these questions in each story:**

1. **Where did the initial assumption break?**
2. **What did shipping reveal that planning couldn't?**
3. **How did we know to persist vs back out?**

---

---
font: ansishadow
align: center
---
# Episode 1:\nVirtualizing\nInput

---

## The Problem

**Need:** Rich text input for Claude Code
- `/commands` for git operations
- `@mentions` to reference files
- Full keystroke control

**Obvious choice:** Use a library (readline, blessed, ink)

**Problem:** Libraries don't let us intercept everything
- Black box input handling
- Can't intercept `/` or `@` before processing

---

## The Decision

> "We're building a text entry tool.
> It starts with text entry.
> Move everything inside JavaScript."

**December 16, 2024:** Build virtual Cursor class
- 333 lines of new code
- 204 lines of tests
- Simplified useTextInput by 416 lines

[Demo: Virtual cursor](tmux://main/bun demos/cursor-demo.ts)

---

## Initial Implementation

**Before: Using readline library**

[Demo: Basic readline](tmux://main/bun demos/node-readline.ts)

**After: Virtual cursor class**

```typescript
class Cursor {
  left(): Cursor
  right(): Cursor
  up(): Cursor
  down(): Cursor
  insert(text: string): Cursor
  deleteWordBefore(): Cursor
}
```

**Reimplemented readline:**
- Ctrl+A, Ctrl+E, Ctrl+W, Ctrl+K
- All standard shortcuts

**Seemed straightforward...**

---

## The Unicode Reality

**Soft wrapping revealed complexity:**

```typescript
// Naive approach
const wrapped = wrapAnsi(text, columns)
const offset = text.indexOf(wrappedLine)  // Breaks!
```

**Three problems discovered through shipping:**

1. **Normalization** (April 2025): café (NFC) ≠ café (NFD)
2. **CJK width** (June 2025): 東 = 1 char, 2 display columns
3. **Grapheme clusters** (June 2025): 👨‍👩‍👧‍👦 = 7 codepoints, 1 character

[Show Unicode complexity](tmux://main/bun demos/cursor-unicode.ts)

---

## The Complexity Growth

**December 2024:** 333 lines
**June 2025:** 945 lines (3x growth)

**Added:**
- Unicode normalization (NFC)
- `Intl.Segmenter` for grapheme boundaries
- String index ↔ display width mapping
- Binary search for efficient navigation

**Complexity earned by domain reality**

---

## The Performance Cliff

**Problem:** 2.9s per keystroke (recomputed everything)

**Fix:** Lazy evaluation (compute on demand)

**Result:** 2.9s → 8ms (362x faster)

[Demo](tmux://main/bun demos/cursor-performance.ts)

---

## The Result

**945 lines, complete text editing engine:**
- Perfect Unicode handling
- Vim mode support
- All readline shortcuts
- Fully testable

**Build vs Buy changed:**
- Before AI: Use libraries (too slow to build)
- With AI: Build what you need (fast enough)

**For Claude Code:** Full control was essential
**Worth it.**

---

# Episode 2: Shell Implementation 🐚

## The Setup

**Goal:** Execute bash commands for AI agents

```typescript
exec('ls -la')  // How hard could this be?
```

**Spoiler:** 6+ months, 3 major rewrites, 5.3x code growth

---

# Phase 1: From Sequential to Parallel

## The Initial Approach

**PersistentShell** (773 lines, Pre-March 2025):
```typescript
class PersistentShell {
  private commandQueue: QueuedCommand[] = []
  async exec(cmd: string) {
    this.commandQueue.push(cmd)  // ONE AT A TIME
  }
}
```

**Problem discovered:** Agents want parallel execution

```
Model: "Run tests while building"
PersistentShell: "Sorry, one at a time" ❌
```

---

## The Rewrite (March 29, 2025)

**Deleted 773 lines**, rebuilt as **346 lines:**

```typescript
export async function exec(command: string) {
  return spawn(binShell, ['-l', '-c', command])
  // Parallel! Each command independent!
}
```

**Learning:** Can't predict agent needs upfront

[Demo: 3x speedup from parallelism](tmux://main/bun demos/shell-parallel.ts)

---

# Phase 2: Preserving User Environment

**The Problem** (April 2025):

Users: "Claude can't find my aliases!"

```bash
$ gs  # My git status alias
bash: gs: command not found
```

Each spawn = fresh shell, no user config

---

## The Solution: Shell Snapshots

**ShellSnapshot.ts** (463 lines)

Capture once, replay every command:
- Aliases
- Functions
- Shell options
- Environment

```bash
source /snapshot.sh && eval "$COMMAND"
```

---

## The Synchronization Challenge

**Problem:** How to write from and read to the shell

**Tried:** PIPES, stdin/stdout, temp files

**Winner:** Temp files (simple beats clever)

[Demo: Snapshot iteration](tmux://main/bun demos/shell-snapshot.ts)

---

# Phase 3: Production Reality

**State management is subtle:**
- What persists? (CWD yes, env vars no)
- How to isolate agents?
- Login vs interactive shells?

**Security requirements emerged:**
- Users: "I don't want Claude accessing internet without asking"
- Platform-specific sandboxing (macOS sandbox-exec vs Linux LD_PRELOAD)
- Proxy layers, policy management
- 3K+ lines of security code

**Total: 773 → 4,109 lines** (5.3x growth)

**Learning:** Production reveals needs planning can't predict

---

# Episode 2: The Pattern

**Three phases of discovery:**

**Phase 1:** Sequential → Parallel (agents need concurrency)

**Phase 2:** Bare shell → User environment (aliases matter)

**Phase 3:** Basic → Production-ready (state, security)

**Total:** 773 → 4,109 lines (5.3x growth)

**Couldn't predict any of this upfront** - discovered through shipping

---

## Shell vs Cursor

**Cursor:** Going deep (945 lines, one problem)
- Domain complexity (Unicode)
- Converged to solution

**Shell:** Going broad (4,109 lines, multiple problems)
- Requirements complexity (users, platforms, security)
- Keeps evolving

**Different problems → different approaches**

---

## The Question

**Cursor and Shell both grew:**
- 333 → 945 lines
- 773 → 4,109 lines

**But what about when growth itself is the mistake?**

---

# Episode 3: Unshipping SQLite 🗄️

## The Real Motivation

**Surface goal:** Store conversation history

**Deep goal:** Schema migrations for tool calls

**Why we thought we needed it:**
- Product evolves → tool APIs change
- Need to migrate old tool calls to new schema

---

## The Wrong Turn

**Initial solution:** JSON files
- ✅ Works for storage
- ❌ No migration story for schema changes

**"Professional" solution:** Database migrations!

**The vision:**
- Database migrations are "the right way"™
- Enable smooth product evolution
- Handle schema changes gracefully

**But here's the mistake:**
- Built MVP without the real goal (migrations)
- Theoretical benefits (multiprocess safety, transactions) weren't re-risked
- Not validateing this before shipping

---

# The 15-Day Journey

## Launch (April 24)

Merged database implementation with beautiful schema:
- Foreign keys, table inheritance, type safety
- Everything you'd want in a "professional" solution

**Hours later:** Emergency revert (file path issue)

**That evening:** Re-merged (second try)

[Show schema](tmux://main/bun demos/sqlite-before.ts)

---

## Trouble (Days 7-10)

**Day 7:** Install failures (native dep issues)
- Try auto-rebuild

**Day 9:** Make it "gracefully optional"
- Database causing more problems than solving
- Continue/resume disabled if unavailable

**Day 10:** Add warnings to Doctor output

**"Optional" = writing on the wall**

---

## Decision (Day 15)

Slack post: "The beginning of the end for our brief but painful misadventure"

[Show timeline](tmux://main/bun demos/sqlite-timeline.ts)

**15 days from launch to removal**

---

## Why It Had To Go

**Reality check:** Five critical problems emerged

---

## Problems 1-2: Foundation Issues

**1. Availability > Consistency**
- Robinhood: Crash on bad data (correct for finance)
- Claude Code: Crashing IS worst outcome
- Wrong tradeoff for our domain

**2. Native Dependency Hell**
- pnpm can't handle native deps
- Install failures everywhere
- Users can't even start the app

---

## Problems 3-4: Database Complexity

**3. Weird Locking**
- Database-level locking (not row/table)
- EXCLUSIVE locks block ALL operations, even reads
- Unexpected for developers expecting row/table locking
- WAL mode helps but adds complexity

[Demo: Locking behavior](tmux://main/bun demos/sqlite-multiprocess.ts)

**4. Migration Nightmares**
- Forgot `ON DELETE CASCADE` in schema
- Can't modify constraints in SQLite (must recreate tables)
- Partial table migration breaks foreign keys
- Silent data loss: child tables reference non-existent parent

[Demo: Migration data loss](tmux://main/bun demos/sqlite-migration-data-loss.ts)

---

## The Killer Issue: Multiprocess Irony

**Intent:** Make multiprocess safer (transactions, locking)

**Reality:** Made it MORE dangerous (version skew)

**The scenario:**
- Terminal 1: v1.5 (schema v3)
- Terminal 2: v1.6 (schema v4) ← auto-updated
- v1.6 writes new schema → v1.5 crashes

**From Slack:**
> "The biggest multiprocess problems we've had stem from the database itself"

[Demo: Version skew crash](tmux://main/bun demos/sqlite-version-skew-real.ts)
[Demo: Concurrent load testing](tmux://main/bun demos/sqlite-multiprocess-real.ts)

**Intended to solve coordination → became the liability**

---

## The Replacement

500+ lines of database → 277 lines of JSONL

```typescript
// Simple session storage
fs.appendFileSync(file, JSON.stringify(msg) + '\n')
```

No dependencies. No locking. Works everywhere.

[Show alternative](tmux://main/bun demos/simple-storage.ts)

---

# Three Lessons 🎓

**Cursor and Shell iterated to success. SQLite iterated to removal. What patterns emerge?**

---

# Lesson 1: Shipping Reveals Three Types of Unknowns

## Type 1: Domain Constraints You Didn't Know Existed

**Cursor:** "Unicode is hard" → café ≠ café (NFD vs NFC)

**What planning can't reveal:**
- Normalization, CJK width, grapheme clusters
- Only discovered through user reports
- 333 → 945 lines (complexity earned)

**Pattern:** Go deep when domain reality demands it

---

## Type 2: User Workflows You Didn't Model

**Shell:** "Just spawn commands" → Users need aliases

**What requirements docs miss:**
- Parallelism, user environment, state persistence, security
- Each need emerged from real usage
- 773 → 4,109 lines (breadth earned)

**Pattern:** Stay flexible, iterate broad

---

## Type 3: Second-Order Effects You Didn't Anticipate

**SQLite:** "Database for migrations" → Version skew causes crashes

**What first-order thinking misses:**
- Intended to solve coordination, became the liability
- Install failures, locking, version skew
- 500+ → 277 lines (simplicity earned)

**Pattern:** Recognize wrong direction, back out fast

---

## The Shift

**Before AI:** Implementation cost forced careful planning
  ↓
Slow to ship wrong things (constraint = quality gate)

**With AI:** Implementation is cheap
  ↓
Fast to ship wrong things (removed constraint = removed gate)

---

## The Shift (continued)

**Implementation was a forcing function for good design**

Now judgment must replace what implementation cost used to provide.

**New risk:** Ship mistakes before learning
- Example: SQLite Day 1 - launched with wrong approach

**New skill:** Recognize wrong direction faster
- Example: SQLite Day 15 - identified and removed quickly

---

# Lesson 2: Match Solution to Problem

## Three Problems, Three Structures

**Cursor:** Monolithic (945 lines)
- Text measurement = one coherent problem
- Going deep was right

**Shell:** Modular (4,109 lines)
- Multiple concerns evolving separately
- Staying flexible was right

**SQLite:** Wrong direction → Simplified (277 lines)
- Didn't match actual requirements
- Backing out was right

**Synthesis:** No "best" structure - depends on the problem

---

## Context Matters

**Same tool, different contexts:**

SQLite at Robinhood: ✅ Right choice
- Financial firm: crash on inconsistency
- Data consistency > availability

SQLite at Claude Code: ❌ Wrong choice
- AI app: availability critical
- Model adapts, crashing is worst

**AI implements what you ask**
**Doesn't validate if it's right for your context**

---

# Lesson 3: Earned Complexity

## Redefine "Simple"

❌ **Simple = fewer lines**

✅ **Simple = complexity earned by requirements**

The question isn't "how many lines?" but "what justifies them?"

---

## Earned Complexity: The Three Examples

**Cursor: 945 lines = Simple**
- Unicode reality demands it
- Every line justified

**Shell: 4,109 lines = Simple enough**
- Each module solves real needs
- Complexity earned through usage

**SQLite: 500+ lines = Not simple**
- Foreign keys, ACID, migrations
- **Nothing earned them**
- 277 lines of JSONL = actually simple

---

## The Question

**Before adding complexity, ask:**

"What requirement does this solve?"

**Cursor:** Unicode breaks without it ✓
**Shell:** Users can't work without it ✓
**SQLite:** We thought we'd need migrations ✗

**AI makes adding easy**
**You provide the discipline to ask "why?"**

---

# Conclusion: The Shift 🎯

## What Changed

**Three projects. AI made implementation fast.**

**Three different outcomes:**
- Cursor: 333 → 945 lines (earned complexity)
- Shell: 773 → 4,109 lines (earned breadth)
- SQLite: 500+ → 277 lines (earned simplicity)

**What made the difference?** Not the "how" - that was fast in all three.

---

## The Moments That Mattered

**Not the "how" - that was fast in all three**

The key moments were realizations about "why"

---

## Moment 1: Cursor

**Realizing:** "We need perfect keystroke control"

**Why:** Libraries can't do `/` and `@` interception

**Led to:** Going deep, building right

**Result:** 945 lines = right answer

---

## Moment 2: Shell

**Understanding:** "Users need their aliases"

**Why:** Spawn is fast but bare

**Led to:** Snapshot strategy

**Result:** 4,109 lines = right answer

---

## Moment 3: SQLite

**Recognizing:** "We don't actually need migrations"

**Why:** Tool calls resist schematization

**Led to:** Backing out fast

**Result:** 277 lines = right answer

---

## What AI Gave Us

✅ Fast iteration (all three)
✅ Quick pivots (snapshot delivery: 4 attempts)
✅ Rapid optimization (cursor: 362x faster)
✅ Easy removal (SQLite: 15 days total)

**AI made "how" easy**

---

## What AI Couldn't Give Us

❌ **Cursor:** Knowing Unicode would be hard
❌ **Shell:** Predicting users need aliases
❌ **SQLite:** Seeing version skew danger

❌ **Context:** SQLite works at Robinhood ≠ works here
❌ **Judgment:** When to go deep vs stay modular vs back out
❌ **Discipline:** Asking "is this complexity earned?"

**We had to provide "why"**

---

## The Bottleneck Shifted

**Before AI:**
```
"How do we build this?" ← Hard
  ↓
Implement slowly
  ↓
Hope it's right
```

**With AI:**
```
"Why are we building this?" ← Hard
  ↓
Implement quickly
  ↓
Learn if it's right
```

**The constraint that forced good design changed**

---

## New Skills Required

**Less critical:**
- Writing correct code
- Implementing algorithms
- Knowing syntax

**More critical:**
- Understanding "why" before "how"
- Recognizing earned vs unearned complexity
- Matching structure to problem
- Knowing when to back out

**From "can we build it?" to "should we build it?"**

---

## The Answer

> Engineering at AI speed isn't about writing code faster.
>
> It's about asking "why?" better.

**Three questions to ask yourself:**

---

## Question 1: What will shipping reveal?

**What will shipping reveal that planning can't?**

- **Domain constraints:** café ≠ café (Unicode normalization)
- **User workflows:** Users need their aliases
- **Second-order effects:** Migrations are hard

**You can't predict everything upfront**

---

## Question 2: Is complexity earned?

**Is this complexity earned by reality?**

✅ **Cursor: 945 lines**
- Unicode demands it

✅ **Shell: 4,109 lines**
- Users need it

❌ **SQLite: 500+ lines**
- Nothing earned it

**Every line should justify itself**

---

## Question 3: Which direction?

**Am I iterating toward or away from simple?**

**Cursor:** Toward (converged on solution)

**Shell:** Toward (modular growth)

**SQLite:** Away (back out fast)

**Complexity should decrease as understanding increases**

---

## The Insight

> **AI gives you velocity.**
>
> **You provide direction.**

**Questions?**

---

# Thanks! 🙏

**Engineering at AI Speed**
Lessons from the First Agentically Accelerated Project

**Adam Wolff**
Member of Technical Staff, Anthropic

Twitter/X: @wolffiex
Github: wolffiex

**Demos & Slides:** github.com/wolffiex/qcon-2025-ai-speed

---

# Backup Slides

---

## Shell Security Details

**User requirement:** "Control network access"

**What we built (3,293 lines):**
- Network sandboxing (Mac/Linux different approaches)
- Filesystem permissions
- SOCKS proxy for interception

[Demo: Sandbox](tmux://main/bun demos/shell-sandbox.ts)

---

## Shell State Management Details

**Three key questions:**

1. **Performance:** `-l` flag slow (100-500ms)
   - Solution: Snapshot captures once, skip `-l` on commands

2. **Persistence:** What state carries over?
   - CWD: Yes (users need it)
   - Env vars: No (matches real shell)
   - Agent isolation: Yes (prevent interference)

3. **Compatibility:** Login vs interactive shells
   - Balance: Capture everything, stay clean
   - Every user's setup different

**Learning:** State in dev environments is subtle

