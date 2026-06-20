# AGENTS.md — Project context for AI assistants

Read this file fully before making changes. It captures the project's purpose, data
semantics, working conventions, and the full prompt/decision history.

## What this project is

A **self-contained HTML competitor dashboard** of 113 Lithuanian communication,
marketing and consulting agencies (financials 2019–2024), built for **Adomas**
(g@cool.lt) on behalf of his company **Fabula**. Data originates from a
rekvizitai.vz.lt export (`Komunikacija-konsultacija-konkurentai.xlsx`).

**Key fact:** the owner's company is **Fabula ir partneriai, UAB** — formerly
*Viešųjų ryšių partneriai (VRP)*, company code **124099127**, founded 1997-07-03.
Same legal entity, rebranded. In the data its `brand` is `Fabula`. It gets special
treatment throughout the dashboard (own section at top, gold highlight in charts,
pinned row in the explorer table).

## Files & build

| File | Purpose |
|---|---|
| `template.html` | Source of truth for all HTML/CSS/JS. Has `__DATA__` placeholder. **Edit this, never index.html.** |
| `data.json` | 660 records: per-company per-year (2019–2024), 113 brands. |
| `build_site.py` | `python3 build_site.py` injects data.json into template → `index.html`. |
| `index.html` | Generated, self-contained output (Chart.js from CDN). The deliverable. |

Workflow after any change: edit `template.html` → `python3 build_site.py` →
syntax-check the embedded JS (`node --check`) → commit & push to `main` →
**send the rebuilt `index.html` file to the user** (standing instruction).

## Data dictionary (data.json record)

`company` (legal name), `brand` (display name, used as key everywhere), `year`,
`activities` (segments: Media, Digital media, Kūryba, PR, PA, BTL, Production house,
Konsultantai, Renginiai), `city`, `risk` (credit risk, Lithuanian labels:
Žemiausia/Žema/Vidutinė/…), `employees`, `avgSalary` (€/mo), `salaryCosts`,
`revenue`, `profit` (net profit / grynasis pelnas), `nonSalaryCosts`, `estimatedIncome`.

### CRITICAL terminology (decided in v0.1.2.0)

- `revenue` field = **turnover / apyvarta** (includes pass-through media ad spend).
- `estimatedIncome` field = **revenue / spėjamos pajamos** (estimated fee income,
  pass-through excluded). 625/660 records have it. 2024 totals: €362M turnover vs
  €100M estimated income.
- In all UI labels: "Turnover (apyvarta)" = `revenue`; "Revenue (spėjamos pajamos)"
  = `estimatedIncome`. **Margins are computed from `estimatedIncome`**, labelled
  "margin from revenue".

## Standing instructions from the owner

1. **Version badge** in the header `<h1>` (e.g. `v0.1.2.1`), updated after every change.
   Scheme `vA.B.C.D`: bump **C** for normal changes, **D** for small patches.
   **B only when the owner says so**; A reserved.
2. **Story points (SP)** per update, 0.5–10, reflecting **effort/time, not lines of
   code** (a big template dump scores low; a small edit in convoluted code can score
   high). Logged in the `VERSIONS` array inside `template.html`, displayed via the
   "📋 SP history" button/modal in the dashboard.
3. **Always send the rebuilt `index.html` to the user after every change.**
4. **Every change must end up in `main`** — commit directly to `main` (or merge your
   working branch into `main` immediately). Never leave work stranded on a side branch.
5. Footer must keep: "Created by **Adomas** on behalf of **Fabula** · © 2026 Fabula
   ir partneriai, UAB. All rights reserved."

## ⚠️ Parallel sessions warning

Multiple AI sessions have worked on this repo simultaneously and once produced two
diverged `main` histories (one overwrote the other's template features). Before any
work: `git fetch origin main` and rebase/merge. **Never resolve a template.html
conflict by taking one side wholesale** — check both sides feature-by-feature
(version badge, SP history modal, My-company section, turnover/revenue split,
Data Explorer view) and keep all of them.

## Environment notes

- `rekvizitai.vz.lt` is **blocked** by the sandbox network allowlist (WebFetch and
  curl both fail). Company facts were verified via web search instead.
- Repo is **private**, so GitHub Pages can't deploy on the free plan. Owner decided
  not to deploy; the dashboard is used as a local file.
- Remote branches: `main` (canonical), plus two historical `claude/*` branches.

## Prompt & version history

| Version | SP | Owner's request (paraphrased) | What was done |
|---|---|---|---|
| v0.0.0.0 | 5 | (Initial) Build competitor dashboard from the Excel data. | 113-agency dashboard: KPI strip, insights, market/segment/ranking/salary charts, explorer table. |
| v0.0.1.0 | 5 | "https://rekvizitai.vz.lt/imone/viesuju_rysiu_partneriai/ — I want to see my company data in my personal html dashboard." | Discovered VRP→Fabula rebrand (same code 124099127, already in data). Added "My company" section: KPI cards with market ranks, 2019–24 trend chart, percentile-vs-market chart, gold scatter marker, pinned explorer row. |
| — | — | "Create a new branch called main, merge and push changes from all branches, index not nested for GitHub Pages." | `main` created from the combined tip (one branch contained the other); index.html confirmed at repo root. Later: "nevermind, can't deploy private repo." |
| v0.1.0.0 | 0.5 | "Write the version number at the top after every change. v0.1.0.0 now. Update 3rd num, or 4th for small patches; I'll say when to bump the 2nd." | Version badge in header. |
| — | — | "Always give html after updating." | Standing instruction #3 above. |
| v0.1.1.0 | 3 | "Evaluate each update with SP (0.5–10, effort-based, not LOC). Create a button to see SP/version history." | SP evaluation done retroactively; "📋 SP history" button + modal with `VERSIONS` log. |
| v0.1.2.0 | 4 | (Lithuanian) Reorder top KPIs: Market turnover, Turnover CAGR, then Market revenue = spėjamos pajamos, Revenue CAGR; profit % from revenue not turnover ("margin from revenue") + YoY. Market overview: revenue primary but show turnover too. Doughnut, segment trend, rankings (add), growth leaders, size-vs-profitability (and net profit), revenue-per-employee, explorer (add) → all to spėjamos pajamos. Footer: created by Adomas on behalf of Fabula, copyright. | Turnover/revenue split across every chart; thresholds and tooltips recalibrated; explorer got both columns; My-company section aligned; footer credit added. |
| v0.1.2.1 | 1 | "Save the info about this project and my prompts in an md file so other AIs can read it." | This file + CLAUDE.md pointer. |
| v0.1.2.2 | 0.5 | "Merge changes with main always." | Standing instruction #4 made explicit: all work lands in `main` immediately. |
| — | 3 | (Parallel AI session) Data explorer page from all Excel sheets, merged into single-page app. | Top-nav SPA: Dashboard + Data Explorer views; `sheets_data.json` (5 sheets) embedded via `__SHEETS_DATA__`; search/sort/pagination/CSV export. **But it overwrote all features from the other session's template.** |
| v0.1.3.0 | 4 | "Two AIs both saying the index is from main and both are different." | Real merge of the two diverged mains: full-featured template kept as base, Data Explorer SPA ported into it (top-nav, dataView, explorer JS). Everything from both lines now coexists. |
| — (off-dashboard) | 1 | "Create a CSV from my company page on rekvizitai.vz.lt." | User pasted page text; `fabula_ir_partneriai.csv` created with 65 fields: company info, 4-year financials, debts, workforce, ESG. |
| — (off-dashboard) | 2 | "Create an HTML based just on this data alone." | `fabula.html` — standalone company profile page: header, contact card, rating, workforce, full financial table, debts, ESG. |
| — (off-dashboard) | 0.5 | "Keep a score of SP points even when working off the main dashboard, in AGENTS.md." | This SP tracking section added; AGENTS.md updated on working branch. |
| — (off-dashboard) | 1.5 | "Fix fabula.html for mobile — out of bounds on smartphone. Deploy properly on GitHub Pages." | Added media queries: single-column grid on ≤640px, header wraps, table wrapped in overflow-x:auto div, font/padding tweaks. Pushed to main. |
| v0.1.3.1 | 1 | "Not looking great on phone" (main dashboard at adomasgaudi.github.io/vz/). | Mobile nav fix: hide nav-sub on ≤600px, shrink logo/btn padding, add content padding tweaks. Bumped version badge. |
| v0.1.3.2 | 2 | "All derived values should show formulas how they are calculated." | Added inline formula lines below each My-company KPI card sub-label: YoY % with actual values, margin formula, CAGR formula, rank explanation. Monospace styled, muted. |
| — (off-dashboard) | 2 | "Hard-enforce what a dumb computer can check; nag what needs judgment. We need better names and the first principle written." | Founded the **vz Codex** (`GOVERNANCE.md`): the **Gate Test** meta-principle, plus the two named kinds — **Gate** (deterministic → hook, hard-stop) and **Nudge** (judgment → reminder only). Seeded the Gates/Nudges tables; hooks still TODO. |

## Open / deferred items

- "Key insights" texts still quote **turnover-based** figures (€362M market, etc.) —
  owner was told; rewrite to spėjamos pajamos only if asked.
- Old `claude/*` branches not deleted (owner never answered).
