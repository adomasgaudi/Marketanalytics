# HOOKS.md — what runs automatically in this repo (plain English)

*Written for human eyes, not AIs.* This file explains the **hooks** that fire
automatically when an AI assistant works on the vz repo — so you always know what
the machine does on its own, without anyone asking it to.

---

## What a "hook" is

A hook is a small script the AI's tool (Claude Code) runs **automatically at a
fixed moment** — when a chat starts, when you send a message, or when the AI
finishes replying. Nobody types a command; it just fires. Hooks are used to inject
reminders, run checks, or report things.

Hooks live in a file called `.claude/settings.json` inside the repo.

---

## Hooks in the vz repo right now: **NONE**

**This repo has no hooks at all.** There is:

- ❌ no `.claude/` folder
- ❌ no `.claude/settings.json`
- ❌ no hook scripts

So **nothing runs automatically** when an AI works on vz. Every change here happens
only because the AI was explicitly asked to do it.

### "But I've seen pop-up questions and reminders…"

Those come from the **Data repo** (`adomasgaudi/data`) — a *separate* project that
has its own hooks. When both repos are open in the same chat, Data's hooks can fire
and influence the AI's behaviour (for example, the multiple-choice pop-ups). That
is **not** a vz hook, and it never edits the vz repo. Data's hooks are documented
inside the Data repo, not here.

---

## The three moments a hook *could* fire (for reference)

If we ever add hooks to vz, they can attach to one of these three events. Listed
here so you know the options:

- **SessionStart** — fires **once, when a new chat begins.**
  Typical uses: load the rules into the AI's memory, run a startup check, print a
  reminder of standing permissions.

- **UserPromptSubmit** — fires **every time you send a message,** just before the
  AI reads it.
  Typical uses: inject a per-message reminder (e.g. "prefer pop-up questions").

- **Stop** — fires **when the AI finishes a reply.**
  Typical uses: check for uncommitted changes, verify the version badge is in sync,
  print the cost of the turn, warn if work hasn't been merged/deployed.

---

## If hooks are added to vz later

When that happens, this file gets the list — **one bullet per hook, in plain
English, saying exactly what it does.** For example, it would read like:

> **Stop hook → "check version badge"**
> - Reads the version badge in `template.html`.
> - Compares it to the latest `VERSIONS` entry.
> - If they don't match, prints a warning so the version never ships out of sync.

Until then, the honest answer stays: **vz runs no hooks.**
