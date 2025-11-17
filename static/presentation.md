---
font: ansishadow
align: center
image-position: 66, 0
text_color: #D0D0D0
img_color: #CA8A04
---
# Engineering\nat\nAI Speed
![image](lightning.txt)

---
---
image-position: 26, 14
---

`⚡Lessons from the First Agentically Accelerated Software Project ⚡`

**QCon San Francisco 2025**
![image](claude_welcome.txt)

---

## The Shift

**We shipped and removed a database in 15 days.**

**Before AI, we'd have planned for months or never tried it.**

**The shift isn't that AI writes code faster.**

**It's that implementation is no longer the bottleneck.**

---

## Claude Code

![asciinema:autoplay](test.cast)

---

## Claude Code

**90% of code written with or by Claude Code**

**We ship:**
- Continuously to internal users
- Daily (every weekday) to external users

**Robust feedback channels:**
+ #claude-code-feedback: 20+ posts, 50+ comments / day
+ 65 issues/day on Github

---

## Three Stories

**🎯 Rebuilding Input**
Breaking conventional wisdom. 9 months of evolution.

**🐚 Reimagining Shell**
Forced pivot. Discovery through failure.

**🗄️ Reversing SQLite**
15 days from launch to removal.

---

## What to Watch For

**Three questions to ask in each story:**

1. What did shipping reveal that planning could not?
2. What architectures enabled evolution?
3. What distinguished detours from dead ends?

---
---
image-position: 20, 16
text_color: #82AADC
img_color: #966C1E
---

:::card
Episode I 🎯
:::

# Rebuilding Input
![slide rule](sliderule.txt)

---

## The Problem
<animation>

**Need:** Rich text input for Claude Code
- `/commands` for git operations
- `@mentions` to reference files
- Full keystroke control

**Conventional wisdom:** Don't rebuild input!!

[Demo: Readline behaviors](tmux://main/bun demos/cursor-demo.ts)

---

## The Decision

> We're building a text entry tool.
> We need control.

**December 16, 2024:** Build virtual Cursor class
- 333 lines of new code
- 204 lines of tests
- Simplified useTextInput by 416 lines

---

## Implementation

**December 16, 2024**

**Virtual cursor class:**

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

---

## Implementation

**333 lines with:**
- All readline shortcuts (Ctrl+A, Ctrl+E, Ctrl+W, Ctrl+K)
- Clean API
- Full test coverage

**Shipped and worked great.**

**Then the architecture started proving its value...**

---

## 2 months later

**Vim mode, obviously**

**Test example:**

```typescript
it('should move cursor right with l', async () => {
  render(<TestVimInput initialValue="hello" />)
  stdin.write('\u001b')  // Enter normal mode
  stdin.write('l')        // Move right

  expect(frames[frames.length - 1])
    .toBe('h[e]llo (NORMAL)')
})
```
---

## Vim Mode

**Shipped in one PR:**
- 419 lines of Vim logic (hjkl, w/b/e, gg/G, f/t, ., etc.)
- 353 lines of tests
- "Generated with Claude Code"

**The virtual Cursor architecture paid off**
- Class with no interior mutability
- Designed for testability

---
---
code_border: false
---

## 2 months later

**Graphemes**

```typescript
"ABC"     // 3 chars, 3 cols (ASCII)
"ＡＢＣ"  // 3 chars, 6 cols (fullwidth)
```

**Also:** 👨‍👩‍👧‍👦 = 7 codepoints but 1 visual unit

Need proper grapheme clustering.

---

## The Fix

```typescript
// Use Intl.Segmenter for proper grapheme boundaries
const segmenter = new Intl.Segmenter(undefined, {
  granularity: 'grapheme'
})
```

**Shipped:** +249 lines, +90 tests
**Commit message:** "🤖 Generated with Claude Code"
**Total:** 633 lines

---

## 12 days later

**Issue:** Japanese text End key bug

Text: `"café"`

NFD: `c a f e ´`
> 5 code points: c, a, f, e, combining-acute

NFC: `c a f é`
> 4 code points: c, a, f, e-acute


---

## Refactor

```typescript
text.normalize('NFC')  // Consistent form
```

**Comprehensive cleanup:**
- Move normalization into `MeasuredText`
- Make interface more opaque (hide Unicode details)
- Add consistency guarantees

---

## Refactor

**Shipped:** +331 lines, +200 tests
**Commit message:** "🤖 Generated with Claude Code"
**Total:** 894 lines
**Effort:** Major refactor made easier with AI

---

## 3 months later

**Problem:** "Typing feels laggy"

**Measurement:** 2.9 seconds per keystroke (!!)

**Root cause:**
- Creating new `MeasuredText` on every keystroke
- Precomputing all grapheme boundaries
- Wrapping entire text with `wrapAnsi`

---

## Optimize

**Lazy evaluation strategy:**
- Defer grapheme computation until needed
- Binary search for boundaries (O(log n) not O(n))
- Skip wrapping until render/navigation

**Shipped:** Rewrote text measurement
**Commit message:** "Co-authored-by: Claude"
**Result:** 2.9s → 8ms (362x faster!)
**Total:** 945 lines

[Demo: Performance comparison](tmux://main/bun demos/cursor-performance.ts)

---

## The Journey

**Timeline:**
- **Dec 16, 2024:** 333 lines (initial implementation)
- **Apr 4, 2025:** 384 lines (+normalization)
- **Jun 18, 2025:** 633 lines (+CJK/graphemes)
- **Jun 30, 2025:** 894 lines (+measurement refactor)
- **Sep 18, 2025:** 945 lines (+performance)

**Three major Unicode issues. Three fast fixes with AI.**

---

## The Result

**945 lines, complete text editing engine:**
- Complete Unicode handling (NFC, CJK, graphemes)
- Performance optimized
- Vim mode support
- *Comprehensive test coverage* (490+ tests)

**What made this possible:**
- AI writes implementation + tests together
- Tests make complexity manageable
- Each feature independently testable

**We could evolve fearlessly.**

---
---
font: ansishadow
image-position: 76, 26
text_color: #82AADC
img_color: #666666
---
:::card
Episode II 🐚
:::

# Reimagining
# Shell
![snail](snail.txt)

---

## Claude's Shell
<animation>

```typescript
exec('ls -la')  // How hard could this be?
```

**Narrator:** It turned out to be very hard.

**This is a story about:** External dependencies

---

## The Persistent Shell

**PersistentShell.ts** (773 lines)

```typescript
class PersistentShell {
  private commandQueue: QueuedCommand[] = []
  private ptyProcess: IPty

  async exec(cmd: string) {
    this.commandQueue.push(cmd)  // ONE AT A TIME
    await this.processQueue()
  }
}
```

**Design:** One long-running shell process, sequential queue

**Benefits:** State persists (CWD, env vars, aliases)

---

## Concurrent Tools

**BatchTool:**

```typescript
// Want to enable this:
[
  { tool: "bash", command: "npm run build" },
  { tool: "bash", command: "npm test" },
  { tool: "bash", command: "npm run lint" }
]
// All at once!
```

**PersistentShell became the bottleneck**

---

## The Pivot

**Transient shells**

```typescript
export async function exec(command: string) {
  return spawn(binShell, ['-l', '-c', command])
  // Each command = fresh process = parallel by default!
}
```

**Deleted:** 773 lines of PersistentShell

**Rebuilt:** Shell.ts (346 lines)

**Result:** 3x faster, modular, parallel by default

[Demo: Parallelism](tmux://main/bun demos/shell-parallel.ts)

---

## Implementation

**Synchronization:** How to get output from user's shell?
- Tolerate errors, including malformed commands
- Tried: PTY parsing, temp files, in-memory, stdin
- Nodejs limitations

**Total time: ~3 weeks of iteration**

[Demo: nodejs pipe problems](tmux://main/bun demos/shell-parallel.ts)

---

## The Compromise

**PersistentShell had the user environment**

> Keep it simple. Users will adapt."

**Also gave up perfect state persistence:**
- CWD tracking manually (led to months of bugs)
- Env vars don't persist
- Confused Claude

---

## Failed Compromise

**Users immediately complained:** 

> Claude can't find my git aliases!

```bash
$ gs  # My git status alias
bash: gs: command not found
```

**The realization:**
- Thought we could simplify by removing user environment
- **Can't compromise on this** - model needs same environment as user
- Users rely on shell customizations

---

## Detour

**Why press on despite the pain?**
- No queue management
- No PTY complexity
- Parallel by default
- **Bet:** Architecture will enable future work

---

## Snapshot Design

**The question:** How do we emulate user environment in a transient shell?

**Persistent shell:** Environment lives in the long-running process

**Transient shell:** Fresh process each time. No memory.

**The insight:** Capture state once → replay before each command

---

## Aliases: Not Easy

**Seems simple:**
```bash
alias gs='git status'
```

**Reality - 10+ bug fixes over 7 months:**

- **March 30:** Special characters (`alias -='cd -'`)
- **April 3:** Different output formats (bash vs zsh)
- **April 17:** Unalias before defining functions
- **June 4:** Restore user aliases after error handling
- **September 18:** Alias expansion in non-interactive shells
- **October 29:** Aliases in sandbox

---

## Also Not Easy

**Funky shell configs:**
```bash
# User's .bashrc runs interactive menu
select option in "Dev" "Prod"; do
  echo "Selected $option"
  break
done
```

---

## Also Not Easy


**Interactive prompts:**
```bash
# Snapshot captures this
alias rm='rm -i'  # Always prompts!
```

---

## Also Not Easy

**Edge cases everywhere:**
- Heredocs with weird syntax
- Functions that rely on interactive input
- Shell-specific syntax differences

---

## Snapshots

```typescript
// 1. Capture in user's shell to temp file
const tmpFile = `/tmp/snapshot-${session}.sh`
await runInUserShell(`
  alias > ${tmpFile}
  declare -f >> ${tmpFile}
  # ... more commands
`)

// 2. Source before each command
spawn(shell, ['-c', `source ${tmpFile} && ${command}`])
```

**ShellSnapshot.ts:** 310 lines (but took 3 weeks!)

**Shell.ts changes:** 31 lines (the integration was trivial)

[Demo: Snapshots](tmux://main/bun demos/shell-snapshot.ts)


---

## Surprise!

**Snapshots were HARD:**
- 3 weeks of iteration
- Multiple failed approaches
- 310 lines of complexity

**But the net result was STILL simpler:**
- **PersistentShell:** 773 lines (queue + PTY + state sync)
- **Transient:** 346 + 310 = 656 lines (shell + snapshot)

**Net:** 117 lines simpler, even with the hard snapshot problem

**Queue management complexity > Snapshot complexity**

---

## Sandbox

**User request:** "I don't trust Claude with network access"

**With transient shells, easy to add:**

```typescript
// Mac: sandbox-exec wraps spawn
spawn('sandbox-exec', ['-p', profile, shell, ...args])

// Linux: LD_PRELOAD intercepts network
spawn(shell, args, { env: { LD_PRELOAD: 'proxy.so' } })
```

**Just wrap the spawn call!**

**Added:** ~3,000 lines of sandbox utilities (Mac + Linux + policies)

**Shell.ts changes:** Minimal

**Time:** ~2 weeks for both platforms

---

## Trade-offs

**What we gave up:** Natural environment durability

**What we're still paying:**
- Months of CWD bugs (ongoing)
- Snapshot doesn't capture everything
- Users with interactive shells have issues
- Complex working directory logic

**What we gained:** Speed

**Tradeoff:** Imperfect behavior, but easy to extend

---

## Not Tests

**PersistentShell had 367 lines of tests.**

**Tests couldn't prevent:**
- Architectural mismatch (queue blocks parallelism)
- Integration complexity (8+ alias bugs over 7 months)
- CWD bugs (state across processes)
- External dependencies (user environments)

**Contrast with Cursor:**
- Cursor: 490+ tests made 945 lines manageable
- Shell: 367 tests didn't prevent pivot

---

## Emergent Architecture

**So what DID make it possible?**

```typescript
// Core: Shell.ts (356 lines - stayed small!)
function exec(command: string) {
  const snapshot = getSnapshot()      // ShellSnapshot.ts (463 lines)
  const sandbox = getSandboxConfig()  // Sandbox (~3,186 lines)

  return spawn(shell, [
    ...sandbox.args,
    '-c',
    `source ${snapshot} && ${command}`
  ], {
    env: sandbox.env
  })
}
```

Composability.

---

## Experimentation

**Persistent shell (773 lines):**
- "Correct" abstraction (matches session semantics)
- How you'd naively design it
- Judgment stops here

---

## Experimentation

**Transient + snapshots (~800 lines):**
- Weird implementation
- Snapshot pattern used nowhere else (?)
- Discovered by: Try simplification → Fail → Recover differently

Satisfies constraints planning couldn't balance:
  - Parallelism ✓
  - User environment ✓
  - Extensibility ✓

---

## Experimentation

**You don't plan this. It's too weird.**
You discover it through experimentation.

---
---
font: dosrebel
align: center
text_color: #DC2626
---
# Failure

---
---
image-position: 62, 12
text_color: #82AADC
---

:::card
Episode III 💀
:::

# Reversing SQLite
![rip](rip.txt)

---

## The Temptation

**Current solution:** JSONL files (working, but...)

**Everyone knows:** Databases are for data
- SQLite quality lore (most deployed database)
- Migrations, queries, ACID, multiprocess
- **With AI, building it felt achievable**

---
---
font: dosrebel
text_color: #9333EA
align: center
---

# 15 Days

---

## Launch

Merged database implementation with beautiful schema:
- Foreign keys, table inheritance, type safety
- Everything you'd want in a comprehensive solution

**Hours later:** Emergency revert (dependency issue)

**That evening:** Re-merged (second try)

[Show schema](tmux://main/bun demos/sqlite-before.ts)

---

## Trouble

**Day 7:** Install failures (native dep issues)
- Try auto-rebuild

**Day 9:** Make it "gracefully optional"
- Database causing more problems than solving
- Continue/resume disabled if unavailable

**Day 10:** Add warnings to Doctor output

---

## Decision

The end: Adding a new multiprocess feature that bypasses the db

Slack post: "The beginning of the end for our brief but painful misadventure"

**15 days from launch to removal**

---

## What We Discovered

**Shipping revealed problems judgment couldn't predict**

---

## Foundational Issues

**1. Availability > Consistency**
- Robinhood: Crash on bad data (correct for finance)
- Claude Code: Crashing IS worst outcome
- Wrong tradeoff for our domain

**2. Native Dependency Hell**
- pnpm can't handle native deps
- Install failures everywhere
- Users can't even start the app

---

## Locking

**SQLite limitations**
- Database-level locking (not row/table)
- EXCLUSIVE locks block ALL operations, even reads
- Unexpected for developers expecting row/table locking
- WAL mode helps but adds complexity

[Demo: Locking behavior](tmux://main/bun demos/sqlite-multiprocess.ts)

---

## Migration

**Data migration dangers**
- Forgot `ON DELETE CASCADE` in schema
- Can't modify constraints in SQLite (must recreate tables)
- Partial table migration breaks foreign keys
- Silent data loss: child tables reference non-existent parent

[Demo: Migration data loss](tmux://main/bun demos/sqlite-migration-data-loss.ts)

---

## Multiprocess

**Intent:** Make multiprocess safer (transactions, locking)

**Reality:** Made it MORE dangerous (version skew)

**The scenario:**
- Terminal 1: v1.5 (schema v3)
- Terminal 2: v1.6 (schema v4) ← auto-updated
- v1.6 writes new schema → v1.5 crashes

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

## Mistake?

**Yes and No**

**The problems were architectural:**
- Database-level locking (SQLite-specific behavior)
- Native dependency packaging (npm/pnpm interaction)
- Version skew crashes (multiprocess coordination)
- ALTER TABLE limitations (SQLite constraints)

**Not all of these are predictable from debate**

**The experiment failed. That's fine when reversal is cheap.**

---
---
font: ansishadow
align: center
text_color: #B1B9F9
---

# Synthesis

---

## The Answers

**1. What did shipping reveal that planning couldn't?**
- Cursor: Unicode is complex
- Shell: Recreating the user's environment is tricky
- SQLite: Native dependencies don't work in npm ecosystem

---

## The Answers

**2. What architectural choices enabled evolution?**
- Cursor: Virtual abstraction + comprehensive tests + minimal dependencies
- Shell: Transient processes = composable layers
- SQLite: Files are more forgiving

---

## The Answers


**3. What distinguished detours from dead ends?**
- Cursor: Pain decreased with each iteration (tests worked)
- Shell: Pain persisted but led to better solution (snapshots)
- SQLite: Pain increased with every fix (wrong foundation)

---

## The Pattern

**Three possible outcomes when you experiment:**

**1. Success** (Cursor)
- AI made complexity manageable

**2. Productive failure** (Shell)
- Discovered non-obvious compromise through trying and failing

**3. Clean failure** (SQLite)
- 15 days to learn architectural problems

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

## Traditional Loop

```
Requirements → Implementation → Ship → User Feedback
     ↑                                       ↓
     └───────────────────────────────────────┘
            (slow, expensive loop)
```

Bottleneck: **Expensive implementation**

Result: **Must get requirements "right" upfront**

Hard to connect these feedback loops

---

## The Shift

```
Implementation → Ship → User Feedback
     ↑                        ↓
     └────────────────────────┘
           (faster loop)
```

Bottleneck: **User feedback**

Result: **Don't spend time on requirements!**

The only sustainable advantage: **Learning speed**

---

## So What To Do?

**Ship faster.**

Remember this?

**Claude Code ships:**
- Continuously to internal users
- Daily (every weekday) to external users

**This wasn't just a fact about our project.**

**This is the key to AI-accelerated product development.**

---

## Cadence Matters

**Our three experiments:**
- Cursor: 9 months of incremental Unicode discoveries
- Shell: 3 weeks to get snapshots right (5+ iterations)
- SQLite: 15 days to learn and reverse

**None of this works without rapid feedback:**
- Users hit Unicode edge cases → we fixed same day/week
- Users complained about aliases → we knew immediately
- Users hit install failures → we saw it in days

**Fast shipping = fast learning = fast iteration**

---

## Keep it simple

Being a CLI is another way we optimize for fast iteration
What can you do to simplify your distribution?

---

## How to Work 
## at AI Speed

**The practical playbook:**

**1. Ship small, ship often**
- Set up continuous deployment
- Reduce time from code → users
- Target: hours not days

---

## How to Work 
## at AI Speed

**The practical playbook:**

**2. Make reversal cheap**
- Feature flags for experiments
- Modular architecture (Shell: independent layers)
- Invest in build/release/distribution

---

## How to Work 
## at AI Speed

**The practical playbook:**

**3. You have to unship**
- Don't curate features, edit them
- Don't rationalize wrong turns, reverse them
- No ego

---

## The Next Frontier

**AI drives implementation cost to zero.**

**The new bottleneck: Closing feedback loops at scale**

**The next frontiers:**
- Generating actionable insights from scaled freeform user feedback
- Version split-testing in evals
- Continued investment in build, release, and distribution

---

## Dogfooding

**Yes. And you should be too.**

**In the world of AI, every product team can dogfood:**
- Using AI to automate YOUR workflows
- Collect and organize user feedback
- Manage tasks, help on Slack

**Claude Code is a special case:**
- The tool and product can improve each other
- Tight feedback loop

But the principle applies everywhere:

**Experiment with using AI to automate your own work**

In that way, we're all dogfooders now.

---

## The Takeaway

**Three stories. Three different outcomes.**

**One pattern:**

> Implementation is becoming free.
> Feedback loops are becoming everything.

Optimize for speed of learning than quality of judgment.

**Ship faster. Close the loop. 🚀**

---
---
image-position: 60, 11
---

`Engineering at AI Speed`

**Adam Wolff**
Member of Technical Staff, Anthropic
**Demos & Slides:** github.com/wolffiex/qcon-2025-ai-speed

Twitter/X: @wolffiex
Github: wolffiex

![image](github.txt)
