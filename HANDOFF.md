# HANDOFF — /explore port (v2 rekView → v3) — RESOLVED 2026-07-18

All open items below are done: the 2-min SSR was `structuredClone` on the
Turbopack JSON-module namespace + the module-scope rek_tabs.json import (now
`readFileSync` + `JSON.parse`, ~1s); /explore verified headless; layout matched
to v2 (1500px wrap, legacy section order via ExploreView children slot);
coverage-grid click-through opens the company in the field explorer
(window CustomEvent `explore:company`). Original notes kept for history:

_2026-07-18. Branch `stacked`, committed as v3.38.0 (WIP)._

## What was done

The "Explore the raw data & sources →" buttons (Markets + Companies, Dev-mode-only)
now link to a new **/explore** page — a faithful port of the legacy v2 rekView
(`legacy-src/template.html` ~lines 899-1001):

- `src/app/explore/page.tsx` — server page: hero, sections, and
  `loadRekTabsWithSodra()` which attaches `data/sodra/<jarCode>.json` to each
  rek_tabs company (what legacy build_site.py did at build time).
- `src/features/explore/ExploreView.tsx` — client shell: single-select company
  picker (reuses `CompanySelector` with a 1-item pool) driving FieldData.
- `src/features/explore/Coverage.tsx` — 📊 coverage grid (COV_FIELDS n/7
  classification, search, legend, sticky company column).
- `src/features/explore/DataChanges.tsx` — 📜 data-changes log from
  `data/data_events.json` (source filter, search, expandable detail rows).
- `src/features/explore/FieldData.tsx` + `rek-en.ts` — 🔎 per-company field
  table: tab strip, Merged/Initial/Rekvizitai/Sodra modes with provenance cubes
  and conflict flags, search, CSV export, 🌐 English toggle (legacy dicts
  copied verbatim).
- `src/features/explore/SheetExplorer.tsx` — 📑/🗂️ raw Excel sheet explorers
  (sheet tabs, sort, search, pager, CSV, English toggle) from
  `data/sheets_data.json`.

All files pass `pnpm exec tsc --noEmit` and eslint.

## OPEN PROBLEM — /explore takes ~2 min to server-render in dev

`GET /explore 200 in 119s (application-code: 117s)` on every request, not just
the first. Bisection so far (temporarily `{false && ...}`-ing sections):

- Without `<ExploreView>` (no `tabs` prop serialized): **156s** — not it.
- With ONLY `<Coverage>` (+header): **158s** — the sections are NOT the cost.

So the cost is page-level. Prime suspects, in order:

1. `loadRekTabsWithSodra()` — it still ran in both bisections. Next test:
   comment out the call itself (`const tabs = rekTabs as ...` direct) and
   re-time. `structuredClone` on a Turbopack JSON-module namespace may be the
   pathological bit; if so, `JSON.parse(JSON.stringify(rekTabs))` or reading
   the file with `readFileSync` instead of importing may fix it.
2. The 1.5MB `data/rek_tabs.json` import at page module scope under Turbopack
   dev (imported even in the bisections).
3. `loadProfiles()` — unlikely; /companies uses it and is fast.

How to reproduce: `pnpm dev`, then
`Measure-Command { Invoke-WebRequest http://localhost:3000/explore -UseBasicParsing -TimeoutSec 300 }`.
Watch out for STALE dev servers holding :3000 (`⚠ Port 3000 is in use` in the
log means requests hit an old process — `taskkill /PID <pid> /F`).

## Not yet done

- Headless verification of /explore rendering (blocked on the perf issue).
- Visual comparison against /v2's rekView.
- The Coverage agent noted the legacy's click-company-to-open-in-explorer
  behavior was omitted (depends on legacy state that has no v3 counterpart).

## Session context (other work, already committed)

- v3.34.0–v3.37.0: per-year interpretive insights; picker pool/off chips +
  sticky pills bar; grouped vs-market headings; Fabula de-starred from
  scatters; bottom-bar `--bb-h`; new footer; Pepper dev corner extracted to a
  SHARED package `@adomas/dev-tools` at `..\Meta apps\dev-tools` (own git repo;
  Pepper consumes it too — its src/dev was deleted; edit the package, never
  fork copies).
- Branch is ahead of origin/stacked by ~8 commits, NOT pushed.
