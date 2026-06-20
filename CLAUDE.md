# vz — project context

**This whole file is _context_** — text injected into the model's window. It *influences* behaviour; it does not *enforce* anything. The only thing that enforces is a **hook** (code that runs — none yet, see [HOOKS.md](HOOKS.md)). Which behaviours can be hooks vs must stay context → [GOVERNANCE.md](GOVERNANCE.md).

Single source of truth: purpose, data, conventions, history.

## Non-negotiables
*(All four are currently context = advisory. The ones a program could check are hooks H1–H6 in GOVERNANCE.md — build those to actually enforce them.)*
- Edit **`template.html`**, never `index.html`; rebuild: `python3 build_site.py`. *(→ H2)*
- Every change: bump version badge + add a `VERSIONS` entry (with SP). *(→ H3–H5)*
- Push to `main`, then send the rebuilt `index.html` to the user.
- `revenue` = turnover/apyvarta · `estimatedIncome` = revenue/spėjamos pajamos. *(context only)*

## What this is
- Self-contained HTML competitor dashboard: **113 LT** communication/marketing/consulting agencies, financials **2019–2024**.
- Built for **Adomas** (g@cool.lt) for his company **Fabula**. Source: rekvizitai.vz.lt export `Komunikacija-konsultacija-konkurentai.xlsx`.
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

## Standing instructions
- **Version badge** in header `<h1>` (e.g. `v0.1.2.1`), every change. Scheme `vA.B.C.D`: bump **C** normal, **D** small patch; **B** only when owner says; **A** reserved.
- **SP** per update, 0.5–10, **effort/time not LOC** (a big template dump = low; a small edit in gnarly code = high). Logged in the `VERSIONS` array in `template.html`, shown via the "📋 SP history" modal.
- **Always send the rebuilt `index.html`** after every change.
- **Every change lands in `main`** — commit direct or merge immediately; never strand work on a side branch.
- **Footer must keep:** "Created by **Adomas** on behalf of **Fabula** · © 2026 Fabula ir partneriai, UAB. All rights reserved."

## Git
- Work from `main`; merge to `main` after finishing.

## ⚠️ Parallel sessions
- Multiple AIs have edited this repo at once and once diverged `main` (one overwrote the other's features).
- Before work: `git fetch origin main` + rebase/merge.
- **Never resolve a `template.html` conflict by taking one side wholesale** — merge feature-by-feature (badge, SP modal, My-company section, turnover/revenue split, Data Explorer) and keep them all.

## Environment
- `rekvizitai.vz.lt` blocked by the sandbox (WebFetch + curl fail); company facts verified via web search.
- Repo private → no free GitHub Pages deploy; used as a local file.
- Branches: `main` (canonical) + historical `claude/*`.

## Open / deferred
- "Key insights" texts still quote **turnover** figures (€362M etc.) — rewrite to spėjamos pajamos only if asked.
- Old `claude/*` branches not deleted.

## Prompt & version history (archive — AI reference, skip when scanning)

| Version | SP | Owner's request (paraphrased) | What was done |
|---|---|---|---|
| v0.0.0.0 | 5 | (Initial) Build competitor dashboard from the Excel data. | 113-agency dashboard: KPI strip, insights, market/segment/ranking/salary charts, explorer table. |
| v0.0.1.0 | 5 | "I want to see my company data in my personal html dashboard." | Discovered VRP→Fabula rebrand (code 124099127, already in data). Added "My company" section: KPI cards with market ranks, 2019–24 trend, percentile-vs-market chart, gold scatter marker, pinned explorer row. |
| — | — | "Create a branch main, merge all branches, index not nested for Pages." | `main` created from combined tip; index.html at repo root. Later: "can't deploy private repo." |
| v0.1.0.0 | 0.5 | "Write the version number at the top after every change." | Version badge in header. |
| — | — | "Always give html after updating." | Standing instruction #3. |
| v0.1.1.0 | 3 | "Evaluate each update with SP; button to see SP/version history." | SP done retroactively; "📋 SP history" button + modal with `VERSIONS` log. |
| v0.1.2.0 | 4 | (LT) Turnover vs revenue split across KPIs/charts; margins from revenue; footer credit. | Turnover/revenue split everywhere; thresholds + tooltips recalibrated; explorer got both columns; My-company aligned; footer added. |
| v0.1.2.1 | 1 | "Save project info + my prompts in an md file for other AIs." | Created `AGENTS.md` + a `CLAUDE.md` pointer. (Merged into this single `CLAUDE.md` later.) |
| v0.1.2.2 | 0.5 | "Merge changes with main always." | Standing instruction #4 made explicit. |
| — | 3 | (Parallel session) Data Explorer page from all Excel sheets. | Top-nav SPA: Dashboard + Data Explorer; `sheets_data.json` via `__SHEETS_DATA__`; search/sort/pagination/CSV. **But it overwrote the other session's template.** |
| v0.1.3.0 | 4 | "Two AIs both say index is from main and both differ." | Real merge of the two diverged mains: full template kept as base, Data Explorer ported in. Both lines coexist. |
| — (off) | 1 | "Create a CSV from my company page on rekvizitai.vz.lt." | `fabula_ir_partneriai.csv` (65 fields). |
| — (off) | 2 | "Create an HTML based just on this data alone." | `fabula.html` — standalone company profile page. |
| — (off) | 0.5 | "Keep SP score even when working off the main dashboard." | SP tracking section added. |
| — (off) | 1.5 | "Fix fabula.html for mobile." | Media queries: single-column ≤640px, header wraps, table overflow-x, font/padding. |
| v0.1.3.1 | 1 | "Not looking great on phone." | Mobile nav fix: hide nav-sub ≤600px, shrink logo/btn padding. |
| v0.1.3.2 | 2 | "All derived values should show their formulas." | Inline formula lines under each My-company KPI (YoY, margin, CAGR, rank). Monospace, muted. |
| v0.1.3.3 | 2 | "Tabs to view other companies we'll add later." | `MY_COMPANIES` array drives a tab strip; `renderCompany(brand)` redraws on click. Add a company = one array push. |
| — (off) | 2 | "Hard-enforce what a computer can check; nag what needs judgment. Better names + first principle." | Founded the **vz Codex** (`GOVERNANCE.md`): the **Gate Test** + **Gate** (deterministic → hook) and **Nudge** (judgment → reminder). Gates/Nudges seeded; hooks TODO. |
| — (off) | 0.5 | "Merge AGENTS.md into CLAUDE.md and delete AGENTS.md." | Folded `AGENTS.md` into this single `CLAUDE.md`; deleted it. One source, no drift. |
| — (off) | 0.5 | "Human-readable MD listing the vz hooks." | Added `HOOKS.md`: vz has no hooks; explains the 3 events; pop-ups seen in chats are Data's, not vz. |
| — (off) | 1 | "Docs too long to read; make them succinct without hurting AI comprehension." | Reformatted CLAUDE/GOVERNANCE/HOOKS to tight bold-lead bullets (one file each, no AI/human split — avoids drift). Same facts, less prose. |
| — (off) | 1 | "Rewrite the rules system with the researched AI-control + eng vocabulary, not our coined terms." | Recast the Codex as the **vz constitution**: Gate→**deterministic guardrail (verifier)**, Nudge→**guideline (LLM-as-judge)**, Gate Test→**verifiability test**. Terms from RLVR / guardrails / LLM-as-judge / Constitutional AI. |
| — (off) | 1 | "Name things by their real mechanism of effect on the AI (hook vs context), not cosmetic labels (governance/constitution)." | Recast the rules system around the two mechanisms that actually differ — **Hook** (code that runs → enforces) vs **Context** (text the model reads → advisory only). verifier→hook-able (H1–H6), guideline→context-only (C1–C4); test is "can it be a hook?". CLAUDE.md now states it is itself context. |
