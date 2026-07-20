# AI schema

Events, hooks, and permissions that govern this project. Rules → [CLAUDE.md](CLAUDE.md).

---

## Events

`*CLAUDE Hardcoded:*` = built-in, unchangeable. `*vz:*` = this project's hook.

## **SessionStart**

chat opens/resumes; stdout injected.

### _CLAUDE Hardcoded:_

- read [CLAUDE.md](CLAUDE.md)
- read [MEMORY.md](../../../.claude/projects/c--Users-adoma-Desktop-coding-vz/memory/MEMORY.md)
- read `.claude/settings`\*
- read env block
- read git status
- read skills / agents / MCP

* _vz:_ none.

## **UserPromptSubmit** — your msg, before AI reads it; exit `2` blocks.

### _CLAUDE Hardcoded:_

- `<system-reminder>` notes + recalled memory.

* _vz:_ `rule_schema_reminder.py` → rule-add/change prompt → injects hook-vs-context framework.
* _vz:_ `ui_design_reminder.py` → UI/design prompt → injects [UI.md](UI.md) rubric + tells the AI to ask the owner for a screenshot via AskUserQuestion first.

## **PreToolUse** — before a tool runs; can block/deny.

### _CLAUDE Hardcoded:_

- permission prompt + IDE diff on Edit/Write.

* _vz:_ `permissions.allow` checked here; `commit_message_check.py` → `git commit` → warns if the subject misses the house format `vN CODE-NN | desc | n sp` (non-blocking).
* _vz:_ `guard_main_push.py` → warns a _desktop_ session committing/pushing to main (web exempt). `require_main_push.py` → `git push` to a _non-main_ branch → warns to move the work to main (REPO-01, non-blocking).

## **PostToolUse** — after a tool finishes.

### _CLAUDE Hardcoded:_

- "file changed since read" + linter notes; todo nudge.

* _vz:_ `version_reminder.py` → edit `template.html` → badge/SP/rebuild reminder.

## **Notification** — needs input/permission, or idle.

### _CLAUDE Hardcoded:_

- permission popup / idle ping.

* _vz:_ none.

## **Stop** — main agent finishes; exit `2` forces continue.

### _CLAUDE Hardcoded:_

- none.

* _vz:_ `save_reminder.py` → at end of turn, if the tree is dirty or `main` has unpushed commits → reminds to commit + push main (REPO-01, non-blocking).

## **SubagentStop** — subagent (Task) finishes; exit `2` forces continue.

### _CLAUDE Hardcoded:_

- none.

* _vz:_ none.

## **PreCompact** — before context is compacted.

### _CLAUDE Hardcoded:_

- none.

* _vz:_ none.

## **SessionEnd** — session ends (quit, `/clear`).

### _CLAUDE Hardcoded:_

- none.

* _vz:_ none.

---

## Settings files

| File                                                         | Scope               | Holds                                |
| ------------------------------------------------------------ | ------------------- | ------------------------------------ |
| [`.claude/settings.local.json`](.claude/settings.local.json) | vz only, gitignored | permissions + two non-blocking hooks |
| [`~/.claude/settings.json`](../../../.claude/settings.json)  | every project       | no hooks (git-init one removed)      |

**Permissions** (`permissions.allow` — auto-approved, no prompt):

- `WebSearch` — web search
- `Bash(git commit *)` — any commit
- `Bash(git pull *)` — any pull
- `Read(//c/Users/adoma/.claude/**)` — read global .claude

**Hooks** (all non-blocking, in vz):

- **PreToolUse** (`Bash`) → `commit_message_check.py` — `git commit` injects a warning if the subject misses the house format.
- **PostToolUse** (`Edit|Write`) → `version_reminder.py` — template edit injects badge/SP/rebuild reminder.
- **UserPromptSubmit** → `rule_schema_reminder.py` — rule prompt injects this file's framework.
- **Stop** → `save_reminder.py` — finishing injects a commit+push reminder if the tree is dirty.

---

## Claude inner — hardcoded, not hooks

Can't change these — only attach hooks alongside.

- **Memory** — loads CLAUDE.md + MEMORY.md (hook runs code; memory loads text).
- **System reminders** — `<system-reminder>` notes + todo nudge, auto-injected.
- **Permissions** — the `permissions.allow` list, checked before each tool.

---

# hooks vs context

Two mechanisms change behaviour; every other label is just text.

## The two mechanisms

- **Hook** — code that runs on an event (SessionStart · UserPromptSubmit · PreToolUse · PostToolUse · Stop).
  - We use it as **aggressive, conditional context** — detects a condition, injects the right reminder.
  - Trigger is deterministic; the AI's response stays its own. Lives in `.claude/settings.json`.
  - Can hard-block, but we don't — it informs, never force-blocks or auto-fixes.
- **Context** — text injected into the window (this file, CLAUDE.md, tool output).
  - Read, not run → influences only, probabilistically. Can be forgotten.
  - Effect decays with length and mid-document position. Naming it "rule" changes nothing.

Real split isn't hard-vs-soft — both inform. It's **always-on vs. fired-on-condition**:

- Plain Context is always in the window, and decays.
- A hook fires only on its trigger — lands sharp, costs nothing when irrelevant.

## `@import` — a Context delivery method, not a third mechanism

- `@path/to/file.md` in CLAUDE.md pulls that whole file's text in every session.
- Resolved at load time: always-on, unconditional, full-file.
- Costs its length every turn whether relevant or not, and can still be forgotten.

## Three ways to put text in front of the model

Pick per rule, by when and whether it loads:

- **Plain Context** — lives in CLAUDE.md, always loaded. For short, always-relevant rules.
- **`@import`** — `@other.md` in CLAUDE.md, always loaded, whole file. For a whole reference doc.
- **Hook-injected Context** — a hook prints `additionalContext`, loaded only when its condition fires.
  - Zero cost when irrelevant; lands at the right moment; only as reliable as its trigger.
  - Our default for any rule a program can detect.

Quick pick:

- short + always-relevant → plain Context
- big doc + always-relevant → `@import`
- only-sometimes-relevant + program-detectable → hook-injected Context

## The hook test

Can a program detect when it's relevant — binary, no judgment?

- **Yes → hook-injected reminder.** Fires when it applies; detection is the verifiable part.
- **No → plain Context.** Always-on, advisory, read with judgment (an LLM-judge is \~65% biased).

Corollary: nothing here force-blocks. A bad trigger gets sharper, not a harder gate.

## Behaviours a program can detect (→ hook injects context, not a block)

Each line is a _trigger → what the hook reminds_, on the named event.

- (PostToolUse) output drifted from source build → remind to rebuild before sending.
- (PostToolUse) generated file hand-edited, not its template → remind to edit source.
- (PostToolUse) version badge ≠ latest history entry → remind to reconcile.
- (PostToolUse) template changed, badge not bumped → remind to bump.
- (PostToolUse) new history entry missing its SP value → remind to add.
- (PostToolUse) embedded JS may be invalid → remind to run syntax check.
- (Stop) tree not clean or `main` not pushed → remind to save.
- (SessionStart) before work → remind (or run) fetch + rebase first.

## Behaviours that can only be Context (judgment → advisory, never a hook)

- is the SP estimate fair? (effort vs value)
- is the design compact / on-brand? (taste)
- fixed the whole bug _class_, not just the shown case?
- terminology right? (turnover vs revenue)
- merge conflicts resolved feature-by-feature, never one side wholesale?

## Adding a behaviour

- One line → apply the hook test → **Hook** (build it) or **Context** (advisory).
- A behaviour isn't enforced until its hook exists. The name never enforces anything.
<br />

## Events & hooks

Four hooks touch vz; the rest of each event is CLAUDE-hardcoded. Full map → [Schema.md](Schema.md).

| Event                | When                   | Hook                                                               | Does                                                                                                     | Blocks? |
| :------------------- | :--------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- | :------ |
| **SessionStart**     | chat opens/resumes     | — (CLAUDE-hardcoded)                                               | loads CLAUDE.md + MEMORY.md, settings, env, git status, skills/agents/MCP                                | no      |
| **UserPromptSubmit** | before AI reads prompt | [`rule_schema_reminder.py`](.claude/hooks/rule_schema_reminder.py) | rule-add/change prompt → injects Schema.md's hook-vs-context framework so the AI decides _how_ to add it | no      |
| **PreToolUse**       | before a Bash call     | [`commit_message_check.py`](.claude/hooks/commit_message_check.py) | `git commit` → warns if the subject misses the house format `vN CODE-NN \| desc \| n sp`                 | no      |
| **PostToolUse**      | after Edit/Write       | [`version_reminder.py`](.claude/hooks/version_reminder.py)         | edit `template.html` → reminds to bump badge + log SP + rebuild                                          | no      |
| **Stop**             | AI finishes responding | [`save_reminder.py`](.claude/hooks/save_reminder.py)               | dirty tree / `main` not pushed → reminds to commit + push (REPO-01)                                      | no      |

<br />

## Hook design laws (HOOK-01…05)

Two real lockups in this repo produced these. They are constraints, not advice — a hook that
breaks one is a bug, however useful it looks.

**The core asymmetry:** a hook's _worst case_ must be silence, never paralysis. A hook that fails
open costs you a reminder. A hook that fails closed costs you the session.

### HOOK-01 — Absolute paths, always

`py .claude/hooks/x.py` resolves against the agent's _current_ cwd, not the repo. The moment a
shell steps into a subdirectory (`cd next-app`), every hook 404s and **every Bash and Edit call is
blocked** — the agent is locked out of its own tools with no way to fix the thing that would
unblock it. Happened here during the next-app hoist.
→ Use `$CLAUDE_PROJECT_DIR`, or derive ROOT from `__file__`.

### HOOK-02 — Blocking is a separate risk class

`exit 2` is the only way a hook can trap the agent: hook rejects → agent retries → hook rejects.
`PreToolUse` blockers (`guard_main_push`, `require_main_push`, `commit_message_check`) are the
dangerous class. A `PostToolUse` formatter _cannot_ loop — it fires after the write already
succeeded, so there is no verdict to fail.
→ Never `exit 2` from anything advisory. Reserve it for genuine guardrails.

### HOOK-03 — Non-blocking hooks still loop (the soft loop)

This is the subtle one. A warning that re-fires on the edits made _to satisfy it_ is a loop with
extra steps. `version_reminder` fired "bump the version" on four consecutive `template.html`
edits — interrupting the very fix it was demanding. Noise is indistinguishable from a wall: the
agent learns to ignore it, or thrashes.
→ Every hook must be a **function of state the agent controls**, and must **go quiet when that
state is fixed**. If complying doesn't silence it, it is broken.

### HOOK-04 — Refractory period

Even a correct hook must not shout twice in a row. After firing, mute that message for a cooldown
(90s) so the agent has room to _act_ before being told again. Condition still unmet after the
window? It fires once more — nothing is lost, it is rate-limited.
→ Use [`refractory.py`](../../.claude/hooks/refractory.py): `say(msg)`.
→ **Time, not a counter.** A counter needs a resetter, and the resetter becomes the next bug.
Time self-clears, so an unforeseen environment change can at worst _delay_ a warning.

### HOOK-05 — Fail open

Every failure path exits 0 and says nothing. Missing dependency, unparseable stdin, no git, dead
temp dir: degrade to silent. A hook must never become the reason work cannot proceed.

### The test

> **CLAUDE.md/AGENTS.md is for what the model should _consider_. A hook is for what the system
> must _guarantee_.**

"Format nicely" is a preference — preferences drift, which is why telling an AI to match your
style fails. "This file is formatted on write" is a guarantee. That is the whole case for the
Prettier hook: the agent's sloppy output never survives to disk, so it never becomes the "old
style" a later edit copies. The formatter always gets the last word, and it cannot argue back.
