# AI schema

## Events Hooks and Permissions

---

---

## EVENTS

The main events (more exist in the schema). Under each: what fires now. No hooks configured anywhere → only Claude-inner fires.

- **SessionStart** — chat opens/resumes; stdout injected.
  - *inner:* reads CLAUDE.md + MEMORY.md, `.claude/settings`*, env block, git status, skills/agents/MCP.
- **UserPromptSubmit** — your message, before the AI reads it; exit `2` blocks.
  - *vz:* `rule_schema_reminder.py` — rule-add/change prompt → injects this file's hook-vs-context framework. *inner:* injects `<system-reminder>` notes + recalled memory.
- **PreToolUse** — before a tool runs; can block/deny.
  - *vz:* `permissions.allow` checked here. *inner:* permission prompt + IDE diff on Edit/Write.
- **PostToolUse** — after a tool finishes.
  - *vz:* `version_reminder.py` — editing `template.html` → badge/SP/rebuild reminder. *inner:* "file changed since read" + linter notes; todo nudge.
- **Notification** — needs input/permission, or idle.
  - *inner:* permission popup / idle ping.
- **Stop** — main agent finishes; exit `2` forces continue.
  - none (prime spot for a vz hook).
- **SubagentStop** — a subagent finishes; exit `2` forces continue.
  - none (fires when Task agents end).
- **PreCompact** — before context is compacted.
  - none.
- **SessionEnd** — session ends (quit, `/clear`).
  - none.

---

---

### VZ

[.claude/settings.local.json](.claude/settings.local.json) — vz project, personal/gitignored — **permissions + two non-blocking hooks**

  **Permissions:**  

- `permissions.allow` — list of auto-approved calls 
- `WebSearch`, — web search, no prompt 
- `Bash(git commit *)`, — any git commit 
- `Bash(git pull *)`, — any git pull 
- `Read(//c/Users/adoma/.claude/**)`. — read global .claude

### Hooks:

- **PostToolUse** (`Edit|Write`) → `.claude/hooks/version_reminder.py` — non-blocking; editing `template.html` injects the badge/SP/rebuild reminder.
- **UserPromptSubmit** → `.claude/hooks/rule_schema_reminder.py` — non-blocking; a rule-add/change prompt reads this file and injects the hook-vs-context decision framework.

---

---

### Global

 [~/.claude/settings.json](../../../.claude/settings.json) - applies to every project incl. vz (**no hooks**)

- none — removed the "offer git init" SessionStart hook

---

---

## Claude inner — hardcoded, not hooks

You can't change these — only attach hooks alongside them.

- **Memory** — loads `CLAUDE.md` + `MEMORY.md` into context (a hook *runs a command*; memory *loads text*).
- **System reminders** — the `<system-reminder>` notes + todo nudge, injected automatically.
- **Permissions** — the `permissions.allow` list, checked before each tool.

# **Judgment Levels**

 **(and as backup for the rest), strengthen the Context itself** — levers that actually move adherence:

- **Position**: rules at the very top *and* bottom of [CLAUDE.md](http://CLAUDE.md) (primacy + recency); mid-document decays most. The badge/SP rules are currently mid-file.
- **Brevity**: shorter file = each rule weighted more (moving history out already helped).
- **A short "Definition of Done" block** I must satisfy before saying done — badge bumped / SP logged / on `main` / sent deliverable. A checklist self-verifies better than scattered prose.
- **One canonical copy** of each rule (no drift across files).

Let me peek at the build to ground the offer:  
  
  
----

---

---

# hooks vs context

Only two things actually change how this AI behaves, because only two have a distinct **mechanism of effect**. Every other label — rules, principles, constitution, governance — is just text in the window and has **no mechanical effect**. Sort every desired behaviour by its mechanism.

## The two mechanisms (the only real distinction)

- **Hook** — code that runs on an event (SessionStart · UserPromptSubmit · PreToolUse · PostToolUse · Stop). **Executes deterministically → enforces.** The model cannot ignore it. The only *hard* control. Lives in `.claude/settings.json`. (A hook that checks-and-blocks = a *verifier*.)
- **Context** — text injected into the model's window (this file, CLAUDE.md, tool output). **Read, not run → influences only, probabilistically.** Can be forgotten/ignored; effect decays with length and mid-document position. The only *soft* control. Naming it "constitution" or "rule" changes nothing — only the mechanism, and (for context) brevity + position, have any effect.

## `@import` — a Context delivery method (NOT a third mechanism)

`@import` is still **Context** — it doesn't run, it just changes *which file's text* is in the window and *when*. Writing `@path/to/file.md` (relative path) inside CLAUDE.md or any loaded memory file **statically pulls that whole file's text into context every session**, resolved at load time. Always-on, unconditional, full-file — so it costs that context on every turn whether or not it's relevant, and (being Context) can still be forgotten.

Three ways to put text in front of the model, by *when* and *whether* it loads — pick per rule:

- **Plain Context** — text living in CLAUDE.md. Always loaded. Best for a short, always-relevant rule.
- **`@import`** — `@other.md` in CLAUDE.md. Always loaded, whole file, unconditional. Best when a rule needs a *whole reference doc* in context every turn (e.g. `@Schema.md` to keep this governance map always live). Costs that file's length every turn.
- **Hook-injected Context** — a UserPromptSubmit/PostToolUse hook prints `additionalContext`, which loads **only when its condition fires** (e.g. `rule_schema_reminder.py` injects this file *only* on rule-change prompts). Conditional → zero cost when irrelevant, but only as reliable as its trigger.
- **Enforcing Hook** — code that blocks (a *verifier*). The only option when the rule must *not* be ignorable. See the hook test below.

So when adding a rule: short + always-relevant → plain Context; big doc + always-relevant → `@import`; only-sometimes-relevant → hook-injected Context; must-not-be-ignored → enforcing Hook.

## The hook test (sort every desired behaviour)

- **Can a program decide it for certain — binary, no judgment?**
  - **Yes → make it a Hook.** Enforced. (AI-research term: a *verifier* / verifiable check, RLVR.)
  - **No → it can only be Context.** Advisory — accept the model may not follow it. (At most an *LLM-as-judge* can grade it, and judges are biased ~65%.)
- Corollary: a behaviour written only as Context is **not enforced**. If it keeps getting ignored, that *is* the proof it needed to be a Hook.

## Behaviours that CAN be Hooks (a program decides → build in `.claude/settings.json`)

*No hooks exist yet (see HOOKS.md). Until built, these are only Context = advisory.*

- **H1** `index.html` == `build_site.py` output → block
- **H2** `index.html` not hand-edited (diff touches index w/o template) → block
- **H3** version badge == latest `VERSIONS` entry → block
- **H4** `template.html` changed ⇒ badge bumped → block
- **H5** new `VERSIONS` entry has a numeric SP → block
- **H6** embedded JS valid (`node --check`) → block
- **H7** (Stop) at end of turn, working tree clean + `main` pushed to `origin` ("Save"; owner only sees the live site) → block
- **H8** (SessionStart) auto `git fetch origin main` + rebase before work (parallel AIs edit at once)

## Behaviours that can only be Context (need judgment → advisory, never a Hook)

- **C1** is the SP estimate fair? (effort-vs-value)
- **C2** is the design compact / on-brand? (taste)
- **C3** fixed the whole bug *class*, not just the shown case?
- **C4** terminology right? (turnover vs revenue)
- **C5** `template.html` conflicts merged feature-by-feature, never one side wholesale?

## Adding a behaviour

- One line → apply the hook test → **Hook** (build it) or **Context** (advisory, accept the risk).
- A behaviour isn't enforced until its Hook exists. The name you give it never enforces anything.









