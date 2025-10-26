# Presentation Notes: Engineering at AI Speed

## Core Thesis
**AI gives you velocity. You provide direction.**

Engineering at AI speed isn't about writing code faster—it's about asking "why?" better.

---

## Three Stories

### 1. Cursor 🎯 - Going Deep
**333 → 945 lines (2.8x)**

Built custom text input engine because libraries couldn't intercept `/` and `@` characters. Shipping revealed Unicode complexity: normalization, CJK width, grapheme clusters. Achieved 362x performance improvement through lazy evaluation.

**Pattern:** Domain reality demanded going deep

### 2. Shell 🐚 - Going Broad
**773 → 4,109 lines (5.3x)**

Evolved through three phases as real needs emerged:
- Phase 1: Sequential → Parallel (agents need concurrency)
- Phase 2: Bare shell → User environment (snapshot aliases/functions)
- Phase 3: Production requirements (state management, 3,293 lines of security)

**Pattern:** User workflows kept expanding requirements

### 3. SQLite 🗄️ - Going Back
**500+ → 277 lines (45% reduction in 15 days)**

Built database for migrations we thought we'd need. Five problems emerged: wrong availability tradeoff, native deps, locking, migration failures, version skew. The irony: intended to solve coordination, became the liability. Replaced with simple JSONL.

**Pattern:** Second-order effects revealed wrong direction

---

## Key Themes

### The Shift in Constraints
**Before AI:** Implementation cost forced careful planning → constraint = quality gate
**With AI:** Implementation is cheap → removed constraint = removed gate

**Implication:** Judgment must replace what implementation cost used to provide

### Three Types of Unknowns
1. **Domain constraints** you didn't know existed (Cursor: Unicode)
2. **User workflows** you didn't model (Shell: aliases, security)
3. **Second-order effects** you didn't anticipate (SQLite: version skew)

### Earned Complexity
Simple ≠ fewer lines
Simple = complexity earned by requirements

**Examples:**
- Cursor: 945 lines = simple (Unicode demands it)
- Shell: 4,109 lines = simple enough (users need it)
- SQLite: 500+ lines = not simple (nothing earned it)

---

## Conclusion Structure

### 1. What Changed
Three outcomes recap:
- Cursor: 333 → 945 lines (earned complexity)
- Shell: 773 → 4,109 lines (earned breadth)
- SQLite: 500+ → 277 lines (earned simplicity)

**What made the difference?** Not the "how" - that was fast in all three.

### 2. The Key Realizations
The "how" was fast in all three cases. What mattered were realizations about "why":

1. **Cursor:** "We need perfect keystroke control" → go deep
2. **Shell:** "Users need their aliases" → snapshot strategy
3. **SQLite:** "We don't actually need migrations" → back out

**Pattern:** The "why" determined the outcome, not implementation speed

### 3. What AI Gave Us / Couldn't Give Us

**AI Gave Us:**
✅ Fast iteration, quick pivots, rapid optimization, easy removal

**AI Couldn't Give Us:**
❌ Knowing Unicode would be hard
❌ Predicting users need aliases
❌ Seeing SQLite shortcomings
❌ Context validation (SQLite works at Robinhood ≠ works here)
❌ Judgment on when to go deep/stay modular/back out

**We had to provide "why"**

### 4. The Bottleneck Shifted ← **The Big Reveal**

**Before AI:**
- "How do we build this?" (Easy - just decide)
- → Implement slowly (**Hard - the bottleneck**)
- → Hope it's right

**With AI:**
- "Why are we building this?" (**Hard - the bottleneck**)
- → Implement quickly (Easy - AI does it)
- → Learn if it's right

**The constraint that forced good design changed**

**Implication:** Shipping fast becomes EVEN MORE important
- You can't learn "why" without shipping
- Fast iteration reveals the unknowns (Unicode, aliases, version skew)
- AI doesn't reduce this need - it **amplifies** it

### 5. Three Questions Framework

Your practical toolkit:

**1. What will shipping reveal that planning can't?**
- Domain constraints, user workflows, second-order effects

**2. Is complexity earned by reality?**
- Does something break without it?

**3. Does each iteration bring clarity or add confusion?**
- Cursor: Each addition solved a concrete problem
- Shell: Each module addressed a real need
- SQLite: Each addition raised more questions

### 6. The Insight

> **AI gives you velocity.**
>
> **You provide direction.**

**Engineering at AI speed is about asking "why?" better.**
