# Map (brief) — Marketanalytics

Competitor-benchmarking dashboard for **Fabula** (LT PR/marketing agency) vs \~132 peers, 2019–2025 financials.

## Views (3)
- **Markets** — whole industry: KPI totals, by-segment, rankings, size-vs-profit scatter
- **Companies** — one/multiple companies compared: profile, money-flow, percentile rank, metric deep-dive.
- **Data Explorer** (dev-mode) — raw source tables, coverage grid, change log, CSV export.

## Must-keep functionality
Year ⇄ all-time toggle · 

full-company ⇄ per-employee ⇄ whole market basis · 

multi-select compare (search + chips + segment/size filters) · 

9 charts (7 on a bespoke SVG engine w/ pan-zoom + year-scrubber) · 

EN/LT · source traceability · mobile-first · self-contained.

## Data (5 sources, \~3MB, all baked into the HTML today)

- `data/data.json` — core financials, **906 rows** (132 brands × 2019–2025). Fields: company, brand, year, activities\[], city, risk, employees, avgSalary, salaryCosts, revenue(=turnover), profit, nonSalaryCosts, estimatedIncome(=fee revenue).
- `data/sheets_data.json` — 7 raw Excel sheets (Explorer source).
- `data/rek_tabs.json` — scraped Rekvizitai profiles per company.
- `data/sodra/*.json` — **115 files**, monthly Sodra payroll/headcount per company.
`data/data_events.json` — track the data-change audit log.

## Build
Edit `src/template.html` → `python3 src/build_site.py` injects the JSONs → `index.html` (deliverable). No backend; all compute is client-side JS.

## Future plans

### Stack suggestions (Next.js-native — don't DIY if better solutions exist)
- **Next.js (App Router) + TypeScript (strict)** — framework, routing, server + API in one. Replaces Vite + React Router (built-in file routing) and gives us the backend the future features need. alternatives?
- **Tailwind v4 + shadcn/ui (on Radix)** — styling + prebuilt accessible components; don't hand-build dropdowns/dialogs. rebuilding similar components creates a drift of ui and logic, design and functionality should try to follow clean code principles of single source. 
- **Server Components + Server Actions** — data fetching & mutations (scraping triggers, form posts) without a separate API layer?
- **Auth.js (NextAuth)** — sign-in/roles. Alternatives?
- **Postgres + Drizzle ORM** (e.g. Supabase/Neon) — the DB; Drizzle for typed queries + migrations?
- **TanStack Query** — client cache for interactive filters/compares. Alternatives?
- **Zustand** — only for pure client UI state (toggles, open panels); most state moves server-side. Alternatives?
- **Recharts/visx** *considered* for the 2 Chart.js charts;

### ideas
All future features may need a **server + DB** the current static file lacks. 

Possible dependency order: **auth → database → private API (raw data off-client) → in-UI scraping → notifications/emails**.
Rewrite hotspots: `makeSectionsCollapsible()` reparents DOM Markets→Companies at load (no clean page boundary); all rendering is innerHTML/SVG strings + global mutable state.

SVG engine is battle-tested (succeeded where charts.js or three.js failed not sure which). Possible to keep diy if you keep the string-generating functions as-is, wrap them in one thin React component that injects their output + wires pan/zoom. However, better, 3rd party solutions might copmlete all the requirements too. unknown.

###


### data history
Track data's exact past state.
**Opt 1 (interim):** separate JSONL data repo for clean `git diff`.


**Opt 2 (preferred, w/ migration):** DB temporal rows (`valid_from`) — query "as of date X".

---

Full detail: [code-map.md](docs/reference/code-map.md).
