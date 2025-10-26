# Engineering at AI Speed ⚡

Lessons from the First Agentically Accelerated Software Project

**QCon San Francisco 2025**

---

## The Question

**Three projects. AI made implementation fast.**

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

**Each teaches something different about AI-accelerated development**

---

# Episode 1: Virtualizing Input 🎯

## The Problem

**Need:** Rich text input for Claude Code
- `/commands` for git operations
- `@mentions` to reference files
- Full keystroke control

**Obvious choice:** Use a library (readline, blessed, ink)

**Problem:** Libraries don't let us intercept everything
- Black box input handling
- Can't implement `/` or `@` inception

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

## The Performance Problem

**September 2025:** Users report lag

**Root cause:**
```
Each keystroke: 2.9 seconds
wrapAnsi overhead: 66.2% of runtime
```

Every keystroke recomputed everything

---

## The Fix

**Lazy evaluation:**
```typescript
// Compute on demand, not upfront
get graphemes() {
  if (!this._graphemes) {
    this._graphemes = this.computeGraphemes()
  }
  return this._graphemes
}
```

**Result:**
- Typing: 2.9s → 8ms (362x faster)
- Wrapped text only computed when needed

[Show performance demo](tmux://main/bun demos/cursor-performance.ts)

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

## The Delivery Challenge

**Tried 4 approaches:**

1. ✅ Files → Works
2. ❌ In-memory (`source <(cat)`) → EPIPE errors
3. ❌ Via stdin → E2BIG errors
4. ✅ Back to files → Wins

**Learning:** Simple beats clever

[Demo: Snapshot iteration](tmux://main/bun demos/shell-snapshot.ts)

---

# Phase 3: Production Challenges

## State Management Challenge

**Three questions:**

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

---

## Security Requirements (August 2025+)

Users: "Control network access"

**Added: 3,293 lines of sandbox code**
- Network sandboxing (Mac/Linux different approaches)
- Filesystem permissions
- SOCKS proxy for interception

**Total: 773 → 4,109 lines** (5.3x growth)

[Demo: Sandbox](tmux://main/bun demos/shell-sandbox.ts)

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

# Episode 3: Unshipping SQLite 🗄️

## The Real Motivation

**Surface goal:** Store conversation history

**Deep goal:** Schema migrations for tool calls

**The vision:**
- Product evolves → tool APIs change
- Need to migrate old tool calls to new schema
- Database migrations are "the right way"™
- Enable smooth product evolution

**Initial solution:** JSON files
- Works for storage
- But no migration story for schema changes

**"Professional" solution:** SQLite database with migrations!

---

# The Timeline: A 3-Week Journey

## Day 1 (April 24, 2025)

**Morning:** Merged database implementation (#2027)

```typescript
// Beautiful schema with proper relationships
const baseMessages = sqliteTable('base_messages', {
  uuid: text('uuid').primaryKey(),
  parentUuid: text('parent_uuid'),
  // ...
}, table => ({
  parentReference: foreignKey({
    columns: [table.parentUuid],
    foreignColumns: [table.uuid],
  }),
}))
```

**Features:**
- Parent-child relationships for conversation forks
- Table inheritance (base_messages → user/assistant_messages)
- Drizzle ORM for type safety
- Proper foreign keys for data integrity

**Afternoon (hours later):** Emergency revert! (#2204)
> "Due to relative file path issue"

**Evening:** Second try merged (#2211)

[Show SQLite schema](tmux://main/bun demos/sqlite-before.ts)

---

# Day 7 (April 30)

## First Cracks Appear

**Problem:** Users can't install CLI

```bash
$ npm install
...
Error: Cannot find module 'better-sqlite3'
node-pre-gyp: Failed to find prebuilt binary
```

**Fix attempt:** Auto-rebuild on failure (#2400)

```typescript
try {
  const betterSqlite = new BetterDatabase(getDbPath())
  return betterDrizzle(betterSqlite, { schema })
} catch (error) {
  // Try to rebuild better-sqlite3
  execSync('npm rebuild better-sqlite3')
  // Try again...
}
```

**Quote from PR:**
> "For some versions of node (especially older versions of node v18)
> the prebuilt binaries for better-sqlite3 are not available"

---

# Day 9 (May 2)

## Make It Optional

**Realization:** Database is causing more problems than solving

**PR #2513:** "Make SQLite database support gracefully optional"

```typescript
export function isDatabaseEnabled(): boolean {
  return initializeDatabase() != null
}

// All database functions now check:
if (!db) {
  return [] // Fail gracefully
}
```

**Quote:**
> "Users with better-sqlite3 dependency issues can still use
> core CLI features. Continue/resume features disabled when
> database unavailable."

**The writing on the wall:** "Optional" usually means "dying"

---

# Day 10 (May 3)

## Add Warnings

**PR #2541:** Warn users when database unavailable

Added to "Doctor" diagnostic output:
```
⚠️  Database unavailable - continue/resume disabled
```

**This is damage control**

---

# Day 15 (May 8): The Unshipping

## The Slack Post

From your message (reproduced in thread):

> "#2741 is the beginning of the end for our brief but painful
> misadventure with SQLite."

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

```sql
-- Original schema (April 24)
CREATE TABLE base_messages (
  uuid TEXT PRIMARY KEY,
  parent_uuid TEXT,
  FOREIGN KEY (parent_uuid) REFERENCES base_messages(uuid)
  -- MISSING: ON DELETE CASCADE
);
```

**The problem:**
- Can't modify constraints in SQLite
- Have to recreate table with correct constraints
- Requires careful data migration

**What happened:**
- Wrote migration to fix it
- Resulted in data loss
- "Still don't fully understand why" (from Slack)

**Quote from you:**
> "When I originally specified the foreign key constraints on the
> table inheritance for messages, I forgot to set ON DELETE CASCADE.
> I tried to write a migration to do this, but it resulted in data
> loss for reasons I still don't totally understand."

**With AI speed:** You ship these mistakes before you learn

[Show migration disaster](tmux://main/bun demos/sqlite-migration.ts)

### 5. The Multiprocess Irony

**Original intent:** Database makes multiprocess safer
- Transactions for consistency
- Locking for coordination
- Safe concurrent access

**Reality:** Database made multiprocess MORE dangerous

**The version skew problem:**
```
User's machine:
- Terminal 1: Claude Code v1.5 (schema v3)
- Terminal 2: Claude Code v1.6 (schema v4)
- Both trying to read/write same database
- v1.6 writes new schema → v1.5 crashes reading it
```

[Show version skew scenario](tmux://main/bun demos/sqlite-version-skew.ts)

**Quote from you (Slack):**
> "I was hopeful that SQLite would be useful for general
> multiprocess concurrency. When I asked @lev to consider
> using the db, he pointed out some tricky gotchas with
> SQLite and went with better-lockfile instead. When
> designing enhancements to the auto-updater, I realized
> that having it depend on the db for safe multiprocess
> concurrency was a huge liability--the biggest multiprocess
> problems we've had stem from the database itself."

**The irony:**
- Intended to solve multiprocess coordination
- Actually became the biggest multiprocess liability
- Colleague explicitly avoided it for multiprocess needs

## The Unshipping (May 8, PR #2741)

**PR title:** "Replace SQLite database with file-based session storage"

**What replaced it:**

```typescript
// New: Simple session storage (277 lines)
class Project {
  private sessions = new Map<UUID, Session>()

  loadSession(uuid: UUID): Message[] {
    const file = `~/.claude/projects/{name}/{uuid}.jsonl`
    return file.readLines().map(JSON.parse)
  }

  saveMessage(msg: Message) {
    fs.appendFileSync(file, JSON.stringify(msg) + '\n')
  }
}
```

**Benefits:**
- No native dependencies
- Human-readable (JSONL)
- No locking issues
- Easy to debug
- Works everywhere

[Show simple alternative](tmux://main/bun demos/simple-storage.ts)

---

# Episode 3: What Happened

[Show complete timeline](tmux://main/bun demos/sqlite-timeline.ts)

## The Stats

```
April 24:  Database added (reverted same day)
April 25:  Re-added (second try)
April 30:  First fixes (7 days)
May 2:     Made optional (9 days)
May 8:     Removed (15 days total)

Lifespan: 2 weeks of being "required"
         3 weeks total before removal
```

## The Pattern

**Day 1:** Excited about "proper" architecture
**Day 7:** Fighting build issues
**Day 9:** Making it optional (death sentence)
**Day 15:** Complete removal

## What Made It Different?

**Cursor & Shell:** Iterated to success
- Found the right approach
- Solved real problems
- Code grew to meet needs

**SQLite:** Iterated to removal
- Fast addition enabled by AI
- Fast removal enabled by AI
- **The hard part: Knowing when to quit**

---

# Three Lessons 🎓

---

# Lesson 1: Fast Iteration Reveals True Requirements

## The Pattern Across All Three

Notice: **All three started with reasonable-sounding decisions**

- Cursor: "Just use readline"
- Shell: "Just exec() each command"
- SQLite: "Use a proper database"

**All three initial instincts were wrong**

You can't know until you ship.

---

## What Shipping Revealed

**Cursor:** Domain was harder than expected
- Unicode normalization, CJK width, grapheme clusters
- Each discovered through user reports
- 333 → 945 lines (complexity earned)

**Shell:** Requirements kept emerging
- Parallelism, user env, state, security
- Each discovered through usage
- 773 → 4,109 lines (breadth earned)

**SQLite:** Direction was wrong
- Install failures, locking, version skew
- Discovery: We don't need this
- 500+ → 277 lines (simplicity earned)

---

## The Shift

**Before AI:** Slow iteration → design upfront

**With AI:** Fast iteration → learn by shipping

**New risk:** Ship mistakes before learning

**New skill:** Recognize wrong direction faster

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

❌ Simple = fewer lines
✅ Simple = complexity earned by requirements

## The Three Examples

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

**Cursor:** Realizing "we need perfect keystroke control"
- **Why:** Libraries can't do `/` and `@` inception
- Led to: Going deep, building right
- 945 lines = right answer

**Shell:** Understanding "users need their aliases"
- **Why:** Spawn is fast but bare
- Led to: Snapshot strategy
- 4,109 lines = right answer

**SQLite:** Recognizing "we don't actually need migrations"
- **Why:** Tool calls resist schematization
- Led to: Backing out fast
- 277 lines = right answer

**The "why" determined the outcome**

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

**Three questions to always ask:**

1. **Why this solution?** (Requirements inform solutions)
2. **Why this complexity?** (Must be earned)
3. **Why keep iterating?** (Know when to stop/pivot)

**AI gives you velocity**
**You provide direction**

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
