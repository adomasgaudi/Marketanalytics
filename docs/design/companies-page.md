# Companies page → mirror the Market page

Goal: rework the **Companies** page (for the *selected company*) to follow the **Market** page pattern
built in v122–v154, without deviating from it. Source of truth for the pattern = the Market dashboard.

## What the Market page has (v122–v154) and the Companies equivalent

| # | Market feature (version) | Companies equivalent | Tag |
|---|---|---|---|
| 1 | Two tabs: **Market \<year\>** + **Market all time** (v127) | **\<Company\> \<year\>** + **\<Company\> all time** | 🔴 CMP-1 |
| 2 | Scrollable **year row** 2019–2026 + **sticky** basis bar, synced both tabs (v137/140/141) | Same year row; basis = **Total / Per-employee** (no "per company" — it's one company) | 🔴 CMP-2 |
| 3 | Basis toggle drives **every** graph (v140/141) | Same: Total/Per-employee drives company money-flow + all-years graphs | 🟠 CMP-3 |
| 4 | Single-year **money-flow inverted** (profit bottom) + **YoY badge on each item** (v146/151) | Company already has an (inverted) money-flow → add YoY badges, move into \<year\> tab | 🔴 CMP-4 |
| 5 | KPIs **year-over-year** "23→24" + **formula dropdowns** (v134/144/151) | Company KPIs: Turnover/Revenue/Profit YoY, Employees, Avg salary, market rank — all YoY + formulas | 🟠 CMP-5 |
| 6 | **All-years money-flow** = stacked SVG, profit bottom, totals + YoY % between bars (v150/152/153) | Company turnover per year decomposed into profit/costs/pass-through, same engine | 🔴 CMP-6 |
| 7 | All-time **employees-by-year**, **salary-by-year** charts (v130/147) | Company headcount-by-year + company avg-salary-by-year | 🟠 CMP-7 |
| 8 | Chart polish: animated **auto-fit**, **nice ticks**, **soft label shadow**, dark-mode legend (v149/152/154) | Inherited via drawFinSvg — verify the company charts use it (chMine → SVG money-flow) | 🟢 CMP-8 |
| 9 | **Top cards** (companies tracked + data sources) (v145/148) | Top card = selected company's key facts (name, founded, type, website, segments, sources) | 🟢 CMP-9 |
| 10 | **English-only**, **descs removed**, decluttered (v142/143/154) | Remove company-chart descs; segment names already English | 🟢 CMP-10 |
| 11 | Segment doughnut/bars metric×basis (%/€) (v135–139) | **N/A** — a single company isn't split by segment; skip the segment charts | — |

## Keep (not part of the mirror, leave as separate cards/tabs)
- **Company rankings** tab (Top 20, Growth leaders, Size-vs-profit scatter) — cross-company, stays.
- **Company deep-dive** collapsible (per-source SDD charts) — stays.
- The **company picker** (sticky, hoisted) — stays.

## Build order (one part per turn)
1. ✅ **CMP-1/2 structure** (v155): \<year\> + all-time tabs, sticky year-row + Full/Per-employee bar, picker hoisted.
2. ✅ **CMP-4/5 single-year** (v155): profile + money-flow (YoY badges on every item) + KPI grid; follows year + basis; rank is per-year.
3. ✅ **CMP-6 all-time money-flow** (v156): company turnover→profit/costs/pass-through stacked SVG, synced Full/Per-employee toggle (#coFlowMode2). Sticky stacking fixed (v157).
4. ✅ **CMP-3 basis drives every graph** (v158): Full/Per-employee now switches the "vs market" percentile ranks (revenue/turnover/profit ÷ headcount) AND the chMine trajectory (€k/employee bars + avg pay), not just the money-flow.
5. ⬜ **CMP-7 all-time charts**: avg-salary-by-year line (chMine already shows revenue/turnover/profit/employees).
5. ⬜ **CMP-9/10 polish**: company top-facts card, verify descs/English/auto-fit inherited, empty-states for unreported years.

## UI/UX extra tasks (don't deviate from Market)
- 🟢 UX-1: tab labels show the live company name + year ("Fabula 2024" / "Fabula all time"), like "Market 2024".
- 🟢 UX-2: gold Fabula highlight preserved (Fabula is the owner's company).
- 🟢 UX-3: empty-states for years a company didn't report (mirror Market's "no data" pattern).
- 🟢 UX-4: keep one basis source-of-truth so Company & Market basis don't fight (separate state, since Company has no "per company").
- 🟢 UX-5: consistent card chrome — always-visible groups plain, collapsible = card (rule from v125).

## Open questions for the owner
- Q1: Company basis options — **Total / Per-employee** only (recommended), or also "vs market average"? 
- Q2: Keep **Company rankings** + **deep-dive** as-is, or also fold them under the new tab structure?
