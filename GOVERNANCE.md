# GOVERNANCE.md — the vz Codex

The standing rules for how this repo is kept correct. Every entry here is exactly
one of two kinds — a **Gate** or a **Nudge** — and the kind is decided by the
**Gate Test** below. There is no third kind, and the word "rule" is not used:
"rule" is too vague (a typo-fix is a rule, a hook is a rule), so we name things by
*how they bite*.

This file is the root of the Codex. New entries are appended as Gates or Nudges.

---

## Principle 0 — the Gate Test (the meta-principle)

Everything else is derived from this. It is not itself a Gate or a Nudge; it is the
law that *classifies* every other entry.

> **Can a dumb computer decide it for certain — yes or no, no judgment?**
> - **Yes → it is a Gate.** Write a hook that blocks. Never let it slip; a machine
>   can prove it, so there is no excuse for it to pass broken.
> - **No → it is a Nudge.** It needs a mind to judge, so a machine *cannot* prove
>   it. Surface it as a reminder; never pretend a script can enforce it.

The two failure modes this prevents:
1. **A Gate left as a Nudge** — a thing a computer could have proven for certain,
   left to memory, so it slips. (Was the bug: "forgot to rebuild" treated as soft.)
2. **A Nudge dressed up as a Gate** — a judgment call (taste, fairness, "is this
   the right design") wired into a script that then enforces something dumb.

When you add anything to this Codex, **first apply the Gate Test out loud**, then
file it under Gates or Nudges accordingly.

---

## Definitions

- **Gate** — a check a dumb computer can decide for certain (a string matches a
  string, a diff touches a file, a number is greater than another, a pattern
  matches). **Enforcement: a hook** (e.g. a `Stop`/pre-commit script) that *blocks*.
  Binary. No judgment. If it ever requires a human or an AI to "look and decide,"
  it is not a Gate — it is a Nudge.
- **Nudge** — a check that needs intelligence to judge (is this compact? is this
  the right abstraction? is this SP estimate fair? did you fix the *whole* class of
  bug?). **Enforcement: a reminder only** — printed, surfaced, asked. Never
  auto-blocked, because no script can decide it correctly.

---

## Gates (machine-enforced, hard-stop)

*A dumb computer proves each of these. Each should become a hook.*

| # | Gate | The certain check | Hook status |
|---|---|---|---|
| G1 | `index.html` is in sync with `template.html` | run `build_site.py`, diff the output against committed `index.html` — any difference blocks | TODO |
| G2 | `index.html` is never hand-edited | the commit diff touches `index.html` without a matching `template.html` change | TODO |
| G3 | Version badge matches the latest `VERSIONS` entry | extract both strings, compare | TODO |
| G4 | Version was bumped on a template change | compare badge to previous commit's badge; `template.html` changed ⇒ badge changed | TODO |
| G5 | New `VERSIONS` entry has an SP number | the SP field is present and is a number | TODO |
| G6 | Embedded JS is syntactically valid | `node --check` on the built file | TODO |

(Status `TODO` = the Gate is *agreed* but the hook is not written yet. A Gate with
no hook is just a Nudge in disguise — wiring the hooks is the next job.)

## Nudges (judgment, reminder-only)

*No script can decide these correctly. Surface them; never auto-block.*

| # | Nudge | Why it needs a mind |
|---|---|---|
| N1 | Is the SP estimate fair? | effort-vs-value, not a measurable quantity |
| N2 | Is the design compact / readable / on-brand? | taste — only a mind judges it |
| N3 | Did you fix the whole *class* of bug, not just the shown case? | requires understanding siblings that aren't in front of you |
| N4 | Are the labels/terminology correct (turnover vs revenue split)? | semantic correctness, not a string match |

---

## How to add to the Codex

1. State the candidate in one line.
2. **Apply the Gate Test** (Principle 0) out loud — can a dumb computer decide it?
3. File it: **Gate** → add a row to the Gates table and open a hook TODO;
   **Nudge** → add a row to the Nudges table.
4. A Gate is not "done" until its hook exists. Until then it stays `TODO`.
