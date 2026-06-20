# Rules and context

Hook-vs-context framework + full events/hooks/permissions map → [Schema.md](Schema.md).

## Events & the hooks on them

- **SessionStart** — chat opens/resumes; stdout is injected into context.
  - **Hook** (global ): if the project has no `.git`, tell the AI to offer `git init` + a first commit. Silent in vz (already has git).
- **UserPromptSubmit** — your message, before the AI reads it; exit `2` blocks it.
  - **Hook** (vz): `rule_schema_reminder.py` — when your message is about adding/changing a rule, it reads `Schema.md` and injects its hook-vs-context decision framework, so the AI decides *how* to add the rule before writing it. Non-blocking.
- **Stop** — the AI finishes responding; a hook here can block until conditions are met.
  - No hook (would be **H7**: block unless working tree is clean + `main` pushed to `origin` — i.e. "Save"; the owner only ever sees the live site).

*(Three hooks touch vz: the global SessionStart one above, and vz's own two in `.claude/settings.local.json` — **PostToolUse** `version_reminder.py` (version-badge rule below) and **UserPromptSubmit** `rule_schema_reminder.py` (rule-change → Schema.md guide). Full map → [Schema.md](Schema.md).)*

- **EVENT a new rule:** apply the hook test (Schema.md) — a program can verify it → **Hook** (`.claude/settings.json`; non-blocking injects context, or a blocking script/pre-commit enforces); needs judgment → **Context** (advisory). `rule_schema_reminder.py` now auto-injects that framework whenever you ask for a rule.

## Rules/hooks/ect


| Name                        | Description                                                                                                | Type       | Hook                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------ |
| **Edit source, not output** | Edit `template.html`, never `index.html`; rebuild `python3 build_site.py`                                  | verifiable | → H2                                                         |
| **Save**                    | commit + push to `main` after every change — owner only sees the live site; then send rebuilt `index.html` | verifiable | → H7                                                         |
| **Version badge**           | `<h1>` badge every change. `vA.B.C`: bump **C**; **B** owner-only; **A** owner-only                        | verifiable | ✅ `version_reminder.py` (reminder); enforce → H3/H4          |
| **SP**                      | 0.5–10 per update, effort/time not LOC; logged in `VERSIONS` array, shown via "📋 SP history" modal        | mixed      | reminder via `version_reminder.py`; numeric → H5, fair? → C1 |
| **Terminology**             | `revenue` = turnover/apyvarta · `estimatedIncome` = revenue/spėjamos pajamos                               | judgment   | — (C4)                                                       |
| **Branch**                  | work from `main`; merge back immediately — never strand work on a side branch                              | verifiable | → H7                                                         |
| **Sync first**              | before work, `git fetch origin main` + rebase/merge (parallel AIs edit at once)                            | verifiable | → H8                                                         |
| **Merge conflicts**         | never take one `template.html` side wholesale — merge feature-by-feature (badge, SP modal, My-company, turnover/revenue, Data Explorer), keep all | judgment   | — (C5)                                                       |

---

---

# Project context

## Project idea

- Self-contained HTML competitor dashboard: **113 LT** communication/marketing/consulting agencies, financials **2019–2024**.
- Built by **Adomas** working under ([g@cool.lt](mailto:g@cool.lt)) account for a company **Fabula**. 
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
- Branches: `main` (canonical) + historical `claude/`*.

## Open / deferred

- "Key insights" texts still quote **turnover** figures (€362M etc.) — rewrite to spėjamos pajamos only if asked.
- Old `claude/`* branches not deleted.

## Prompt & version history

- Moved to [VersionHistory.md](VersionHistory.md) to keep SessionStart context lean. Append new entries there.

