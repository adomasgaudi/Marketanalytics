# Events Hooks Rules Context

Hook-vs-context framework + full events/hooks/permissions map → [Schema.md](Schema.md).







##

## Tags

Shorthands the owner may type; mostly inherited from the Data repo. Unknown tag → search for the closest, act on it, confirm (DATA-25).

- **`#remember`** — persist a rule/preference durably, then confirm where saved- **`#co-work`** — other AIs editing at once: don't camp on hot files, merge often
- **`#careful`** — risky/many-part work: split, plan first, one part per turn
- **`#senior`** — reason like the long-term owner: SSOT, invariants, root cause, blast radius
- **`#prune`** — fix the whole class, not just the shown case; sweep every sibling
- **`#debug`** — a MODE, not a strong word: ABANDON/simplify the current task, 10× the ON-SCREEN logging (DATA-51, fixed-position panel, version-stamped — owner has no phone devtools), smallest increments one step at a time, leave diagnostics in until the ROOT is proven (enforced by `debug_reminder.py` hook)
- **`#persistent`** / **`#repeating`** — a recurring bug; log it, fix the root not the symptom
- **`#super-persistent`** — defied many fixes: bisect history + on-screen diagnostic
- **`#max-debug`** / **`#max`** — escalate debugging effort
- <br />
- **`#research`** — research best practices inline, grade each source
- **`#design`** — a look/feel choice to remember + apply everywhere (sweep siblings)
- **`#ui`** — think extra about a control's purpose/frequency/placement before building
- **`#cram`** / **`#cramp`** — make UI maximally compact; drop redundant labels
- **`#ai-only`** — owner won't touch backend; automate it, don't hand off chores
- <br />
- <br />
* **`#tokens`** — analyse token/model efficiency, give one recommended action
- **`#joy-of-less`** — the reach ladder: more-used controls closer to hand
- **`#toggle`** — use pressable pills, not checkboxes/segmented rows

## Rules

Each rule = two rows: **description**, then *kind · type*. Sorted by theme, then TOP → MED → LOW → Unclear within each.

---

### Build & Git

| Rule | Description / mechanics |
| --- | --- |
| **BULD-01** Edit source | Edit `src/template.html`, never `index.html`; rebuild `python3 src/build_site.py` |
| <br /> | Context · verifiable · TOP |
| **REPO-01** Save | commit + push to `main` after every change — owner only sees the live site; then send rebuilt `index.html` |
| <br /> | Context · verifiable · TOP |
| **REPO-03** Sync first | before work, `git fetch origin main` + rebase/merge (parallel AIs edit at once) |
| <br /> | Context · verifiable · TOP |
| **REPO-04** Merge conflicts | never take one `template.html` side wholesale — merge feature-by-feature (badge, SP modal, My-company, turnover/revenue, Data Explorer), keep all |
| <br /> | Context · judgment · TOP |
| **BULD-02** Version badge | one continuous counter everywhere — bump the patch digit (C in vA.B.C) on **every commit/deploy**, and sync all four spots: `<title>` tag, `.nav-version` badge, `<h1> .version` badge, top `VERSIONS` entry = git commit `vN`; A/B owner-only |
| <br /> | Hook [`version_reminder.py`](.claude/hooks/version_reminder.py) · verifiable · MED |
| **BULD-03** Story points | 0.5–10 per update, effort/time not LOC; logged in `VERSIONS` array, shown via "📋 SP history" modal |
| <br /> | Hook [`version_reminder.py`](.claude/hooks/version_reminder.py) · mixed · MED |
| **GIT-01** Commit format | `vN RULE-ID \| short description \| N sp` — `vN` is the patch digit only (e.g. `v41`), not the full `vA.B.C`; RULE-ID is the primary rule driving the change; sp = story points. Off-format subjects trigger a loud ⛔ reminder from two layers (see HOOK-01) — fix the subject and re-commit. |
| <br /> | Hooks [`commit_message_check.py`](.claude/hooks/commit_message_check.py) (Claude) + [`.githooks/commit-msg`](.githooks/commit-msg) (git) · verifiable · TOP |
| **HOOK-01** Scripted checks, never gates | Back every strong warning with a **scripted, deterministic check** (a program decides pass/fail), but it only ever **emits data — it must not block or force** (always `exit 0`); an AI may need to bypass. Enforce **identically across Claude Code CLI, VS Code, Cursor and a plain terminal**: clients obey differently when a check lives only in an editor's `.claude/settings.json` (a client may not load it) or calls a missing interpreter (`python3` is absent on Windows → it silently never runs). So put git-detectable checks in a **git hook under `.githooks/`** (shared via `core.hooksPath`, fires for all clients), pick the interpreter portably (`py`→`python`→`python3`), and keep the Claude `settings.json` hook as the early in-chat nudge. |
| <br /> | Hook [`.githooks/`](.githooks/) + SessionStart sets `core.hooksPath` · verifiable · TOP |
| **REPO-02** Branch | work from `main`; merge back immediately — never strand work on a side branch |
| <br /> | Hook [`guard_main_push.py`](.claude/hooks/guard_main_push.py) · verifiable · MED |
| **DATA-10** Removing code — git is net | default DELETE (history has it); park only big refactors in attic/warehouse |
| <br /> | Context · judgment · Unclear |
| **DATA-06** Two AIs at once | each desktop-editor AI gets own folder + branch; web-session AIs exempt |
| <br /> | Context · verifiable · Unclear |

---

### Conversation & Response

| Rule | Description / mechanics |
| --- | --- |
| **CONV-03** Asks → AskUserQuestion | needs owner to do/check/pick → pop a question, never bury it in prose |
| <br /> | Context · judgment · TOP |
| **DATA-04** Reply format | details first (2-5w titles + 5-15w desc), summary last with one-line titles only |
| <br /> | Context · judgment · TOP |
| **DATA-48** Short release titles | a release title is a 2–5-word label, not a sentence; detail goes in the note |
| <br /> | Context · verifiable · TOP |
| **CONV-02** Never claim unseen visuals | can't see the live site; say "I changed X, please check", never "it's fixed" |
| <br /> | Context · judgment · MED |
| **CONV-04** No "what's next" asks | done + nothing mid-stream → say so in one line and stop; don't manufacture a prompt |
| <br /> | Context · judgment · MED |
| **DATA-26** Quote rule, not number | tell the owner the rule's wording, not "per rule N"; numbers are AI-only |
| <br /> | Context · judgment · MED |
| **DATA-43** Nested informative bullets | bold 2–5-word takeaway label + 5–15-word desc + optional detail nested |
| <br /> | Context · judgment · MED |
| **WORD-01** Terminology | `revenue` = turnover/apyvarta · `estimatedIncome` = revenue/spėjamos pajamos |
| <br /> | Context · judgment · MED |
| **CONV-01** Brevity | answer simple conversational questions in 5–15 words; no preamble |
| <br /> | Context · judgment · LOW |
| **WORD-02** Explanation length | keep explanatory blurbs 5–15 words; doesn't apply to deliberately long docstrings |
| <br /> | Context · judgment · LOW |
| **DATA-11** Severity-tagged options | every suggestion gets a code + severity (🔴🟠🟢); say when not worth doing |
| <br /> | Context · judgment · Unclear |

---

### Debugging & Process

| Rule | Description / mechanics |
| --- | --- |
| **DBG-01** Fix fails once → debug | stop guessing; log the whole path, smallest increments, one step at a time |
| <br /> | Context · judgment · TOP |
| **DBG-02** Debug by contrast | start from a sibling that already works; ask how the broken one differs |
| <br /> | Context · judgment · TOP |
| **DATA-25** Unknown tag → search first | grep memories/notes for the closest rule, act on that; never silently skip |
| <br /> | Context · judgment · TOP |
| **DATA-33** Super-persistent → bisect | bug surviving many fixes → git bisect + on-screen diagnostic, fix the root |
| <br /> | Context · judgment · TOP |
| **DATA-51** On-screen debug console | phones have no devtools; instrument every step of a failing flow on-screen |
| <br /> | Context · judgment · TOP |
| **PROC-01** Forgotten rule → hook it | a rule that keeps slipping gets a machine check, not more prose |
| <br /> | Context · judgment · TOP |
| **PROC-05** Fix root, not symptom | ask why the bug is possible until the design flaw; fix the whole class |
| <br /> | Context · judgment · MED |
| **PROC-04** Question the premise | before solving, ask if it's the right problem or worth doing at all |
| <br /> | Context · judgment · LOW |

---

### UI & Design

| Rule | Description / mechanics |
| --- | --- |
| **UI-01** Screenshot-first design | UI change → ask owner for a screenshot via AskUserQuestion, score it against the [UI.md](UI.md) rubric, then render → critique → refine (never one-shot); fix the space-wasting *class*, not the shown case |
| <br /> | Hook [`ui_design_reminder.py`](.claude/hooks/ui_design_reminder.py) · judgment · TOP |
| **DATA-46** Loading states everywhere | every async op + heavy re-render shows an immediate indicator; never frozen |
| <br /> | Context · judgment · TOP |
| **DATA-20** Custom dropdown | never native `<select>` picker; use the custom styled dropdown |
| <br /> | Context · verifiable · MED |
| **DATA-28** Colours from one set | use the shared palette tokens; never ad-hoc bright green/purple/red |
| <br /> | Context · verifiable · MED |
| **DATA-16** Cram tight | match the tightest existing UI; drop redundant labels; one scrolling row |
| <br /> | Context · judgment · LOW |
| **DATA-22** Small rounding | no full/pill rounding on buttons/chips/inputs; use a small-radius token |
| <br /> | Context · verifiable · LOW |
| **DATA-17** Snappy clicks | a tap updates its own control instantly; defer heavy re-renders, coalesced |
| <br /> | Context · judgment · Unclear |
| **DATA-24** Popout keeps open state | read previous open state from live DOM before rebuilding innerHTML |
| <br /> | Context · verifiable · Unclear |
| **DATA-27** UI layout is yours | decide size/placement yourself; don't punt it to the owner |
| <br /> | Context · judgment · Unclear |
| **DATA-47** Graded values = popup | a graded / list-reordering control opens a menu rather than cycling on tap |
| <br /> | Context · judgment · Unclear |

---

### Meta / AI ops

| Rule | Description / mechanics |
| --- | --- |
| **DATA-40** Model + version line | end each reply with the model and `v.x -> v.y` shift, read not guessed; ALWAYS name the version AND one line of what that version changed — never a bare number the owner can't decode (if nothing shipped this turn, say which version the live file is at) |
| <br /> | Context · verifiable · TOP |
| **DATA-35** Token-efficiency check | on request, judge new-chat-vs-continue, model fit, cache hits, one action |
| <br /> | Context · judgment · MED |
| **META-01** Rate the rules | on first read of this list each AI appends a 1-word verdict (good/unclear/…) by each rule |
| <br /> | Context · judgment · LOW |
| **META-02** Tasks aren't rules | a one-off task that doesn't shape the page or future work is not a rule — keep it out of AI context |
| <br /> | Context · judgment · LOW |
| **DATA-30** Composite natural PK | DB tables key on real columns (e.g. user+date+name), no surrogate `id` |
| <br /> | Context · verifiable · Unclear |
| **DATA-34** Cost block each turn | print real cost (rate-limit based, not API list price) after every turn |
| <br /> | Context · verifiable · Unclear |
| **DATA-36** Default model | use the cheapest capable model for routine work; escalate only on failure |
| <br /> | Context · verifiable · Unclear |

### Not-active rules

Parked rules + specs/tasks (considered, not in force) moved to [notactiverules.md](docs/notactiverules.md).

Planned-but-unbuilt features (state-registry sourcing, LT i18n, Supabase) → [future-features.md](docs/future-features.md).


---

---

# Project context

## Project idea

- Self-contained HTML competitor dashboard: **113 LT** communication/marketing/consulting agencies, financials **2019–2024**.
- Built by **Adomas** working under (<g@cool.lt>) account for a company **Fabula**.
- Source: rekvizitai.vz.lt export `Komunikacija-konsultacija-konkurentai.xlsx`.
- **Fabula = Fabula ir partneriai, UAB** — formerly *Viešųjų ryšių partneriai (VRP)*, code **124099127**, founded 1997-07-03; same entity, rebranded. Its `brand` = `Fabula`.
- Fabula gets special treatment: own section at top, gold highlight in charts, pinned explorer row.

## Files & build

Folder layout (v51 reorg). Root keeps only files that *must* live there:
`index.html` (GitHub Pages serves root), `CLAUDE.md` + `Schema.md` (Claude
auto-load / hook reads them), `README.md`, `.claude/`.

- `src/template.html` — source of all HTML/CSS/JS; placeholders `__DATA__` + `__SHEETS_DATA__`. **Edit this.**
- `src/build_site.py` — injects the JSONs (`__DATA__`, `__SHEETS_DATA__`, `__REK_DATA__`) into template → `index.html` at repo root. Paths are repo-root-relative, so run it from anywhere (`python3 src/build_site.py`).
- `data/data.json` — 660 records (113 brands × 2019–2024).
- `data/sheets_data.json` — 7 raw Excel sheets (Data Explorer source).
- `data/rek_tabs.json` — scraped rekvizitai.vz.lt data, one block per company (`{companies:[{slug,name,brand,order,tabs}]}`); source for the Rekvizitai page.
- `scripts/scrape_company.py <slug>` + `scripts/parse_company.py <slug>` — the generic rekvizitai pipeline (run locally; add a company = run both for its slug). See `docs/SCRAPE.md`. `scrape_discover.py` is the endpoint-discovery helper.
- `index.html` — generated, self-contained (Chart.js CDN). **The deliverable; never hand-edit.** Stays at repo root for GitHub Pages.
- `docs/` — `SCRAPE.md`, `VersionHistory.md`, `notactiverules.md`, `dataclaude.md`, `fabula.html` (standalone Fabula profile, off-dashboard one-off).
- Workflow: edit `src/template.html` → `python3 src/build_site.py` → `node --check` the JS → commit + push `main` → send `index.html`.

## Data dictionary (data.json record)

- Fields: `company`, `brand` (the key everywhere), `year`, `activities` (Media, Digital media, Kūryba, PR, PA, BTL, Production house, Konsultantai, Renginiai), `city`, `risk` (LT labels: Žemiausia/Žema/Vidutinė/…), `employees`, `avgSalary` (€/mo), `salaryCosts`, `revenue`, `profit` (net / grynasis pelnas), `nonSalaryCosts`, `estimatedIncome`.
- **Terminology (decided v0.1.2.0):**
  - `revenue` = **turnover / apyvarta** (incl. pass-through media ad spend).
  - `estimatedIncome` = **revenue / spėjamos pajamos** (fee income, pass-through excluded); 625/660 records have it. 2024: €362M turnover vs €100M est. income.
  - UI labels: "Turnover (apyvarta)" = `revenue`; "Revenue (spėjamos pajamos)" = `estimatedIncome`.
  - **Margins computed from `estimatedIncome`**, labelled "margin from revenue".

## Environment

- `rekvizitai.vz.lt` blocked by the sandbox (WebFetch + curl fail); company facts verified via web search.
- Repo private → no free GitHub Pages deploy; used as a local file.
- Branches: `main` (canonical) + historical `claude/`\*.

## Open / deferred

- "Key insights" texts still quote **turnover** figures (€362M etc.) — rewrite to spėjamos pajamos only if asked.
- Old `claude/`\* branches not deleted.

## Prompt & version history

- Moved to [VersionHistory.md](docs/VersionHistory.md) to keep SessionStart context lean. Append new entries there.

