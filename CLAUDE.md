# Events Hooks Rules Context

Hook-vs-context framework + full events/hooks/permissions map → [Schema.md](Schema.md).







##

## Tags

Shorthands the owner may type; mostly inherited from the Data repo. Unknown tag → search for the closest, act on it, confirm (DATA-25).

- **`#remember`** — persist a rule/preference durably, then confirm where saved
- **`#co-work`** — other AIs editing at once: don't camp on hot files, merge often
- **`#careful`** — risky/many-part work: split, plan first, one part per turn
- **`#senior`** — reason like the long-term owner: SSOT, invariants, root cause, blast radius
- **`#prune`** — fix the whole class, not just the shown case; sweep every sibling
- **`#debug`** — stop guessing; log the whole path, smallest increments, one step at a time
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




Each rule = two rows: **description**, then *kind · type*.

### TOP

| Rule | Description / mechanics |
| --- | --- |
| **BULD-01** Edit source | Edit `template.html`, never `index.html`; rebuild `python3 build_site.py` |
| <br /> | Context - verifiable |
| **REPO-01** Save | commit + push to `main` after every change — owner only sees the live site; then send rebuilt `index.html` |
| <br /> | Context - verifiable |
| **REPO-03** Sync first | before work, `git fetch origin main` + rebase/merge (parallel AIs edit at once) |
| <br /> | Context - verifiable |
| **REPO-04** Merge conflicts | never take one `template.html` side wholesale — merge feature-by-feature (badge, SP modal, My-company, turnover/revenue, Data Explorer), keep all |
| <br /> | Context - judgment |
| **PROC-01** Forgotten rule → hook it | a rule that keeps slipping gets a machine check, not more prose |
| <br /> | Context - judgment |
| **DBG-01** Fix fails once → debug | stop guessing; log the whole path, smallest increments, one step at a time |
| <br /> | Context - judgment |
| **DBG-02** Debug by contrast | start from a sibling that already works; ask how the broken one differs |
| <br /> | Context - judgment |
| **CONV-03** Asks → AskUserQuestion | needs owner to do/check/pick → pop a question, never bury it in prose |
| <br /> | Context - judgment |
| **DATA-05** Commit subject format | `CODE (SP:n) version kebab`; body has model + cost; date is git-logged |
| <br /> | Context - verifiable |
| **DATA-46** Loading states everywhere | every async op + heavy re-render shows an immediate indicator; never frozen |
| <br /> | Context - judgment |
| **DATA-25** Unknown tag → search first | grep memories/notes for the closest rule, act on that; never silently skip |
| <br /> | Context - judgment |
| **DATA-04** Reply format | details first (2-5w titles + 5-15w desc), summary last with one-line titles only |
| <br /> | Context - judgment |
| **DATA-33** Super-persistent → bisect | bug surviving many fixes → git bisect + on-screen diagnostic, fix the root |
| <br /> | Context - judgment |
| **DATA-40** Model + version line | end each reply with the model and `v.x -> v.y` shift, read not guessed |
| <br /> | Context - verifiable |
| **DATA-48** Short release titles | a release title is a 2–5-word label, not a sentence; detail goes in the note |
| <br /> | Context - verifiable |
| **DATA-51** On-screen debug console | phones have no devtools; instrument every step of a failing flow on-screen |
| <br /> | Context - judgment |

### MED

| Rule | Description / mechanics |
| --- | --- |
| **BULD-02** Version badge | one continuous counter everywhere — `<h1>` badge = top `VERSIONS` entry = git `vN`; bump the last digit every change; A/B owner-only |
| <br /> | Hook - [`version_reminder.py`](.claude/hooks/version_reminder.py) - verifiable |
| **BULD-03** Story points | 0.5–10 per update, effort/time not LOC; logged in `VERSIONS` array, shown via "📋 SP history" modal |
| <br /> | Hook - [`version_reminder.py`](.claude/hooks/version_reminder.py) - mixed |
| **REPO-02** Branch | work from `main`; merge back immediately — never strand work on a side branch |
| <br /> | Context - verifiable |
| **WORD-01** Terminology | `revenue` = turnover/apyvarta · `estimatedIncome` = revenue/spėjamos pajamos |
| <br /> | Context - judgment |
| **PROC-05** Fix root, not symptom | ask why the bug is possible until the design flaw; fix the whole class |
| <br /> | Context - judgment |
| **CONV-02** Never claim unseen visuals | can't see the live site; say "I changed X, please check", never "it's fixed" |
| <br /> | Context - judgment |
| **CONV-04** No "what's next" asks | done + nothing mid-stream → say so in one line and stop; don't manufacture a prompt |
| <br /> | Context - judgment |
| **DATA-20** Custom dropdown | never native `<select>` picker; use the custom styled dropdown |
| <br /> | Context - verifiable |
| **DATA-43** Nested informative bullets | bold 2–5-word takeaway label + 5–15-word desc + optional detail nested |
| <br /> | Context - judgment |
| **DATA-28** Colours from one set | use the shared palette tokens; never ad-hoc bright green/purple/red |
| <br /> | Context - verifiable |
| **DATA-26** Quote rule, not number | tell the owner the rule's wording, not "per rule N"; numbers are AI-only |
| <br /> | Context - judgment |
| **DATA-35** Token-efficiency check | on request, judge new-chat-vs-continue, model fit, cache hits, one action |
| <br /> | Context - judgment |

### LOW

| Rule | Description / mechanics |
| --- | --- |
| **WORD-02** Explanation length | keep explanatory blurbs 5–15 words; doesn't apply to deliberately long docstrings (e.g. the mechanistic hook headers) |
| <br /> | Context - judgment |
| **PROC-04** Question the premise | before solving, ask if it's the right problem or worth doing at all |
| <br /> | Context - judgment |
| **CONV-01** Brevity | answer simple conversational questions in 5–15 words; no preamble |
| <br /> | Context - judgment |
| **DATA-16** Cram tight | match the tightest existing UI; drop redundant labels; one scrolling row |
| <br /> | Context - judgment |
| **DATA-22** Small rounding | no full/pill rounding on buttons/chips/inputs; use a small-radius token |
| <br /> | Context - verifiable |
| **META-01** Rate the rules | on first read of this list each AI appends a 1-word verdict (good/unclear/…) by each rule |
| <br /> | Context - judgment |
| **META-02** Tasks aren't rules | a one-off task that doesn't shape the page or future work is not a rule — keep it out of AI context |
| <br /> | Context - judgment |

### Unclear *(grade TBD)*

| Rule | Description / mechanics |
| --- | --- |
| **DATA-17** Snappy clicks | a tap updates its own control instantly; defer heavy re-renders, coalesced |
| <br /> | Context - judgment |
| **DATA-24** Popout keeps open state | read previous open state from live DOM before rebuilding innerHTML |
| <br /> | Context - verifiable |
| **DATA-06** Two AIs at once | each desktop-editor AI gets own folder + branch; web-session AIs exempt |
| <br /> | Context - verifiable |
| **DATA-10** Removing code — git is net | default DELETE (history has it); park only big refactors in attic/warehouse |
| <br /> | Context - judgment |
| **DATA-30** Composite natural PK | DB tables key on real columns (e.g. user+date+name), no surrogate `id` — *PK = primary key* |
| <br /> | Context - verifiable |
| **DATA-11** Severity-tagged options | every suggestion gets a code + severity (🔴🟠🟢); say when not worth doing |
| <br /> | Context - judgment |
| **DATA-34** Cost block each turn | print real cost (rate-limit based, not API list price) after every turn |
| <br /> | Context - verifiable |
| **DATA-47** Graded values = popup | a graded / list-reordering control opens a menu rather than cycling on tap |
| <br /> | Context - judgment |
| **DATA-27** UI layout is yours | decide size/placement yourself; don't punt it to the owner |
| <br /> | Context - judgment |
| **DATA-36** Default model | use the cheapest capable model for routine work; escalate only on failure |
| <br /> | Context - verifiable |

### Not-active rules

Parked rules + specs/tasks (considered, not in force) moved to [notactiverules.md](notactiverules.md).


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

- `template.html` — source of all HTML/CSS/JS; placeholders `__DATA__` + `__SHEETS_DATA__`. **Edit this.**
- `data.json` — 660 records (113 brands × 2019–2024).
- `sheets_data.json` — 7 raw Excel sheets (Data Explorer source).
- `build_site.py` — injects both JSONs into template → `index.html`.
- `index.html` — generated, self-contained (Chart.js CDN). **The deliverable; never hand-edit.**
- `fabula.html` — standalone Fabula profile page (off-dashboard one-off; not linked from the app).
- Workflow: edit template → `python3 build_site.py` → `node --check` the JS → commit + push `main` → send `index.html`.

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

- Moved to [VersionHistory.md](VersionHistory.md) to keep SessionStart context lean. Append new entries there.

