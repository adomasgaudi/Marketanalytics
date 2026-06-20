# vz — control mechanisms (hook vs context)

Only two things actually change how this AI behaves, because only two have a
distinct **mechanism of effect**. Every other label — rules, principles,
constitution, governance — is just text in the window and has **no mechanical
effect**. Sort every desired behaviour by its mechanism.

## The two mechanisms (the only real distinction)
- **Hook** — code that runs on an event (SessionStart · UserPromptSubmit · PreToolUse · PostToolUse · Stop). **Executes deterministically → enforces.** The model cannot ignore it. The only *hard* control. Lives in `.claude/settings.json`. (A hook that checks-and-blocks = a *verifier*.)
- **Context** — text injected into the model's window (this file, CLAUDE.md, tool output). **Read, not run → influences only, probabilistically.** Can be forgotten/ignored; effect decays with length and mid-document position. The only *soft* control. Naming it "constitution" or "rule" changes nothing — only the mechanism, and (for context) brevity + position, have any effect.

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

## Behaviours that can only be Context (need judgment → advisory, never a Hook)
- **C1** is the SP estimate fair? (effort-vs-value)
- **C2** is the design compact / on-brand? (taste)
- **C3** fixed the whole bug *class*, not just the shown case?
- **C4** terminology right? (turnover vs revenue)

## Adding a behaviour
- One line → apply the hook test → **Hook** (build it) or **Context** (advisory, accept the risk).
- A behaviour isn't enforced until its Hook exists. The name you give it never enforces anything.
