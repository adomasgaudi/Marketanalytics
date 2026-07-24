# agent5 — 2026-07-24

**30w:** Migrated the whole dashboard off `data/` onto `data2/` + a new
`data2/classification.json`. `data/` is NOT deleted — `/explore` still pins it.
Also: spectral-only segment palette, nav/theme refactor, money-flow readability.

**300w:**

**The migration (the big one).** The dashboard model (`market-rough/data.ts`
`loadMarketData`) now builds entirely from data2: registry financials via
`explore/model-data.ts` `COMPANIES`, Sodra via `sodra-data.ts`, and every
NON-registry field — company name, `activities`/segments, `mainSegment`, `city`,
`risk`, plus all profile/contact fields — from **`data2/classification.json`**.
That file is a ONE-TIME snapshot lifted out of the legacy `data/` set by
`scripts/data/build_classification.mjs`; it deliberately breaks data2's
registry-only rule (segments etc. come from the owner's spreadsheet, not a
registry) — the owner approved this to unblock deleting `data/`. Its
`_meta.source` records that. The generator can't be re-run once `data/` is gone;
that's fine, the data it captures is frozen. Verified: activities/city/risk are
constant per brand in data.json, and the 132 brands match companies.json exactly.

**Load-bearing trap — the year cap.** data2 registry filings reach back to
**2015**, but Sodra payroll starts **2017**, and the dashboard's headline metric
(agency revenue = `estimatedIncome`/`netRevenue`) is DERIVED from the Sodra wage
bill. So pre-2017 years render totally empty and made the site look broken. Fix:
`SODRA_FLOOR` in data.ts caps the model at Sodra's first year. Don't remove it.

**`data/` is still here.** The owner PAUSED retiring `/explore` (a legacy-data
browser: WorkbookViewer/FieldData/RawJson/DataChanges pin `workbook.json`,
`rek_tabs.json`, `data_events.json`, `disagreements.json`, `sheets_data_kv.json`,
`data.json`, sodra). To delete `data/`, retire those first. `WorkbookViewer` is
BOTH the legacy viewer and the shared grid `ModelSheet` reuses — extract the grid
before deleting it. `data2/README.md` still says "stays until the dashboard is
moved over" — stale now; update when `/explore` goes.

**Removed:** the legacy/rebuilt `src` toggle (`useSourcedModel` is now a
passthrough — single dataset); the harmony + line segment palettes (spectral
only). **Trap I hit:** `taskkill //IM node.exe` kills the owner's own dev server —
use a targeted PID/port kill.
