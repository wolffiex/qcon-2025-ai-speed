# Presentation Notes: Engineering at AI Speed

## Core Thesis
**Implementation is no longer the bottleneck. Feedback loops are everything.**

The shift isn't that AI writes code faster—it's that you can now optimize for speed of learning rather than quality of judgment.

---

## The Setup

**Claude Code ships:**
- Continuously to internal users
- Daily (every weekday) to external users
- 90% of code written with or by Claude Code

**Key question:** What does it mean to engineer at this pace?

---

## Three Questions to Watch For

In each story, ask:
1. What did shipping reveal that planning could not?
2. What architectures enabled evolution?
3. What distinguished detours from dead ends?

---

## Three Stories

### 1. Rebuilding Input 🎯
**333 → 945 lines over 9 months**

Built custom text input engine because we needed control over `/commands` and `@mentions`. Broke conventional wisdom ("Don't rebuild input!").

**Timeline:**
- Dec 16: 333 lines (initial Cursor class)
- Feb: +419 lines Vim mode
- Jun 18: +249 lines graphemes/CJK
- Jun 30: +331 lines Unicode normalization refactor
- Sep 18: Performance optimization (2.9s → 8ms, 362x faster)

**What made it work:** Virtual abstraction + comprehensive tests (490+). AI writes implementation + tests together, making complexity manageable.

**Pattern:** Could evolve fearlessly because of architecture

### 2. Reimagining Shell 🐚
**773 lines → 656 lines (plus ~3,000 sandbox)**

Started with PersistentShell (queue-based), but it blocked parallelism for BatchTool.

**The pivot:** Transient shells (fresh process each command)
- Deleted 773 lines of queue management
- Rebuilt with 346 lines Shell.ts + 310 lines ShellSnapshot.ts

**The hard part:** Recreating user environment (aliases, functions)
- 10+ alias bugs over 7 months
- Snapshot pattern: capture once → replay before each command

**Surprise:** Queue management complexity > Snapshot complexity

**What enabled evolution:** Composability. Shell.ts stayed small (356 lines), features added as independent layers (snapshot, sandbox).

**Pattern:** Discovered non-obvious solution through experimentation

### 3. Reversing SQLite 🗄️
**500+ → 277 lines in 15 days**

Built database with beautiful schema. Intended to make multiprocess safer.

**What shipping revealed:**
- Wrong tradeoff: Availability > Consistency for CLI (crashing IS worst outcome)
- Native dependency hell (pnpm can't handle it)
- Database-level locking (blocks ALL operations)
- Migration dangers (silent data loss)
- Version skew crashes (v1.5 + v1.6 = crash)

**The irony:** Intended to solve coordination → became the liability

**Replaced with:** 277 lines of JSONL. No dependencies. No locking. Works everywhere.

**Pattern:** Problems were architectural, not predictable from debate

---

## The Answers

### 1. What did shipping reveal that planning couldn't?
- **Cursor:** Unicode is complex (normalization, CJK, graphemes, performance)
- **Shell:** Recreating user's environment is tricky (aliases everywhere)
- **SQLite:** Native dependencies don't work in npm ecosystem

### 2. What architectural choices enabled evolution?
- **Cursor:** Virtual abstraction + comprehensive tests + minimal dependencies
- **Shell:** Transient processes = composable layers
- **SQLite:** Files are more forgiving

### 3. What distinguished detours from dead ends?
- **Cursor:** Pain decreased with each iteration (tests worked)
- **Shell:** Pain persisted but led to better solution (snapshots)
- **SQLite:** Pain increased with every fix (wrong foundation)

---

## The Pattern

**Three possible outcomes when you experiment:**

1. **Success** (Cursor) - AI made complexity manageable
2. **Productive failure** (Shell) - Discovered non-obvious compromise through trying and failing
3. **Clean failure** (SQLite) - 15 days to learn architectural problems

---

## The Core Insight

> Before AI, judgment had to substitute for experimentation.
> Implementation was too expensive to try every possibility.
> We debated, decided, and never found out if we were right.

**Now we can find out:**
- Cursor: Tried it → learned complexity was fine
- Shell: Tried it → discovered non-obvious technique
- SQLite: Tried it → learned it was wrong

---

## The Shift

**Traditional Loop:**
```
Requirements → Implementation → Ship → User Feedback
     ↑                                       ↓
     └───────────────────────────────────────┘
            (slow, expensive loop)
```
Bottleneck: **Expensive implementation**
Result: **Must get requirements "right" upfront**

**The New Loop:**
```
Implementation → Ship → User Feedback
     ↑                        ↓
     └────────────────────────┘
           (faster loop)
```
Bottleneck: **User feedback**
Result: **Don't spend time on requirements!**

**The only sustainable advantage: Learning speed**

---

## How to Work at AI Speed

### 1. Ship small, ship often
- Set up continuous deployment
- Reduce time from code → users
- Target: hours not days

### 2. Make reversal cheap
- Feature flags for experiments
- Modular architecture (Shell: independent layers)
- Invest in build/release/distribution

### 3. You have to unship
- Don't curate features, edit them
- Don't rationalize wrong turns, reverse them
- No ego

---

## The Next Frontier

**AI drives implementation cost to zero.**

**The new bottleneck: Closing feedback loops at scale**

**Next frontiers:**
- Generating actionable insights from scaled freeform user feedback
- Version split-testing in evals
- Continued investment in build, release, and distribution

---

## Dogfooding

**In the world of AI, every product team can dogfood:**
- Using AI to automate YOUR workflows
- Collect and organize user feedback
- Manage tasks, help on Slack

**Claude Code is a special case:** The tool and product can improve each other

**But the principle applies everywhere:** Experiment with using AI to automate your own work

---

## The Takeaway

**Three stories. Three different outcomes.**

**One pattern:**

> Implementation is becoming free.
> Feedback loops are becoming everything.

**Optimize for speed of learning over quality of judgment.**

**Ship faster. Close the loop.**
