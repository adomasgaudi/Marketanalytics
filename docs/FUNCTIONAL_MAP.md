# Market Analytics — Complete Functional Map

> Snapshot of `src/template.html` at **v0.2.89** (4,996 lines, 435 KB). Captured to inform a possible Next.js migration. A single self-contained HTML file: `<head>` pre-paint script + ~2,300 lines of CSS + HTML body + one ~4,000-line `<script>` block. Profiles ~113 Lithuanian marketing/PR/creative agencies, with **Fabula** as the "my company" focus (gold-highlighted everywhere).

---

## 1. Tabs / Pages / Views

There are only **three top-level views** (`div.view`, toggled by `switchView()` at line 999). Crucially, the HTML for two of them is largely **assembled at runtime** — see §3.

| View | id | Nav entry | What it shows |
|---|---|---|---|
| **Markets** (Dashboard) | `dashView` (line 684) | Logo `#navHome` (line 666) — clicking the logo when already on dash toggles per-year/all-years | Market-wide KPIs, segment charts, rankings, scatter, market money-flow |
| **Companies** | `companiesView` (line 880) | `.nav-btn[data-view=companiesView]` (line 668) | Per-company profile, money-flow, vs-market ranking, deep-dive time series |
| **Data Explorer** ("Rekvizitai") | `rekView` (line 888) | `.explore-btn` "Explore the raw data & sources →" (Dev-mode only) | Raw per-company Rekvizitai/Sodra/Initial tables, coverage grid, data-changes log, raw Excel sheets |

**Nav mechanics:** `switchView(viewId)` (line 999) toggles `.view.active`, updates `.nav-btn.active`, and calls `refitSvg()` to re-fit charts revealed by the switch. `NAV_TOGGLE` (line 1010) maps a view to a per-year/all-years toggle: **re-tapping an already-active nav button flips the mode** (`toggleMktView`/`toggleCoView`, lines 4990/4970).

**Per-year ⇄ all-years** is a second axis of navigation on both dash and companies, driven by a clickable coloured word in the page title (`#mktViewWord` line 686, `#coViewWord` line 882) and mirrored as a sub-label under the nav buttons (`#mktNavMode`, `#coNavMode`). Toggling it hides the year row and clicks the underlying grp-tab (lines 4954–4993).

**Important:** `companiesView`'s body (lines 880–886) is nearly **empty** — just a header + explore button + footer. Its entire content is **moved out of `dashView`** at load by `makeSectionsCollapsible()` (see §3/§4).

---

## 2. Interactive Features

### Global chrome
- **Settings cog menu** (`#settingsCog`/`#settingsMenu`, lines 673–680): Theme toggle (`#themeToggle` dark/light), Palette toggle (`#paletteToggle` classic/ocean), View toggle (`#viewToggle` default/dev), Graph-pan toggle (`#graphPanToggle`), Refresh Sodra (`#sodraRefresh`, GitHub-API-backed, lines 1118–1175). Last three are Dev-only.
- **Version badge / Dev-mode unlock** (`#navVersion` line 671): clicking it 7× in the default view unlocks Dev mode (`verClickN`, hint at 4 clicks "Click 3 more times", lines 1189–1197). Dev mode reveals formula disclosures, debug overlays, the changelog FAB, and the explore buttons (CSS gating at lines 256–260).
- **On-screen JS-error banner** (`#errBanner`, lines 981–989) — Dev-only, for phones without devtools.
- **Version-history FAB + modal** (`#histBtn` line 959, `#histModal` lines 961–976): shows total SP effort (`#spTotal`), version count, and a collapsible **era → SP-chunk → release** tree (`renderHistTree` line 3516, `histBucketBySp` line 3482). Pagination exists (`#histPrev/#histNext`) but is hidden once the tree renders. Closable via ✕, backdrop click, or Escape.

### Markets (dashView)
- **Company selector** (`#ovCompanySelect`, lines 698–734): a **custom (non-native) dropdown** with a search box (`#ovCoSearch`), a listbox, multi-company compare **chips** (`#ovCoChips`), and a nested **filter panel**: segment multi-select (`#ovSegSelect`), and threshold dropdowns for Turnover / Revenue / Employees / Salary (`ovMinTurnover` etc.), plus "Clear filters". Filtering logic: `ovPassesFilter` (1679), `buildOvList` (1760), `ovHasActiveFilters` (1678).
- **Year row** (`#coYearRow` / `#mktYearRow`) + **basis toggles**: `#coFlowMode` (Full company / Per employee), `#marketMode` & `#marketMode2` (Average per company / Per employee / Whole market). These are **lifted into a fixed bottom bar** (`ensureBottomBar`, line 4897).
- **KPI display toggle** (`#coKpiMode`, `#marketKpiMode`): `#` value vs `%` change, with an auto-revert timer (`stopKpiAuto`/`resetKpiAuto`, 1348/1353).
- **Key insights** collapsible (`#insCard`, line 776).
- **Segment chart controls** (lines 783–787): chart type `#segType` (Doughnut/Bars), metric `#segMetric` (Revenue/Turnover/Profit), display `#segShow` (% / €).
- **Rankings toolbar** (`renderRankToolbar` 2152): metric pills (`#rankMetricRow` — Revenue/Turnover/Net profit/Employees/Avg salary/Profit margin) + segment multi-select pills (`#rankSegRow`, with Select/Clear all).
- **All-time segment metric picker** (`#revAllMetric`, lines 824–831) + segment multi-select (`#revAllSectorSelect`/`#revAllSegs`).
- **Year scrubber** (`#scrubRange` range input, line 842) animating the size-vs-profit scatter across years (`buildScatterScrub` 2295, requestAnimationFrame-driven).

### Companies (companiesView)
Same company selector/chips/filters (hoisted here), same year row + Full/Per-employee, a **per-company tab strip** shown only when >1 company selected (`#coCompanyTabs`/`#coCompanyTabsAll`, `renderCompanyTabs` 1398), and grp-tabs (per-year / all-time / Compare financials).

### Data Explorer (rekView)
- **Company picker** (`#rekCompanySelect`, custom dropdown + search).
- **Coverage grid** (`#covGrid`, `renderCoverage` 4423) with a filter box + Full/Partial/Headcount-only/No-data legend.
- **Data-changes panel** (`#chgList`, `renderDataChanges` 4503): source `<select>` (All/Sodra/Rekvizitai/Initial/Mixed) + text filter, expandable change cards (`chgDetailRows` 4457).
- **Per-company table** (`#rekTableWrap`, `renderRek` 4706) with a **source mode toggle** (`#rekMode`: Merged/Initial/Rekvizitai/Sodra), **EN/LT translation button** (`#rekLangBtn`, `tField`/`tTab`/`tVal`/`tCol` 4665–4705), field+value search (`#rekSearch`), row count badge, and **Export CSV** (`#rekCsvBtn`).
- **Raw Excel sheet explorers** (two, lines 945–955): reusable `mountSheetExplorer` (3577) — tabbed sheets (`SHEET_ORDER` 3543), search (`filterRows` 3603), column sorting, pagination, CSV export. One "sourced" copy, one "organised" copy.

### Charts (all listed)
Two rendering engines: **Chart.js** (only 2 charts) and a **hand-written SVG engine** (everything else — `drawFinSvg` 3770 for line/area, `drawBarsSvg` 4021 for bars). `.eng-tag` labels show which engine ("Chart.js" tag at lines 788, 791).

| Chart | id | Engine | Plots |
|---|---|---|---|
| vs-the-market | `#chMineRank` | SVG bars | Selected company's percentile rank per metric (grouped bars when multi-select) |
| Money-flow by year | `#chCoFlowAll` | SVG | Stacked revenue/cost/profit columns per year, one company |
| Revenue by segment | `#chSegments` (+ `#chRevPerEmp`) | **Chart.js** | Doughnut/bars of revenue/turnover/profit by segment |
| Size vs profitability | `#chScatter` | **Chart.js** | Bubble scatter: revenue × margin, size = headcount |
| Total market money-flow | `#mfaAll` | SVG | Stacked market totals per year (`renderMoneyFlowAll` 2056) |
| Financial metrics by segment | `#chRevSegAll` | SVG lines | Per-segment metric trend over time, optional 25/75 & 5/95 percentile bands (`renderRevSegAll` 2400) |
| Size vs profitability by year | `#scrubChart` | SVG | Scrubber-animated bubble scatter (`buildScatterScrub` 2295) |
| Top-10 vs bottom-10 | `#chTop` | SVG bars | Ranked companies for chosen metric/segments (`drawTop` 2191) |
| Company deep-dive | `#sddChart` | SVG | Single-metric multi-company time series w/ Sodra monthly overlay (`drawSDD` 4191) |

The SVG engine supports **pan/zoom** (mouse + touch, `zoomAbout`/`applyPan` at 3955/3965 and 4109/4115) — gated behind the Graph-pan toggle so the page scrolls over charts by default.

---

## 3. Data Flow

Four build-time placeholders injected as JS consts (lines 990–993):
```js
const DATA        = __DATA__;         // data/data.json — flat array, one row per {company, brand, year}
const SHEETS      = __SHEETS_DATA__;  // data/sheets_data.json — raw Excel sheets {sheet:{columns,rows}}
const REK_DATA    = __REK_DATA__;     // data/rek_tabs.json — per-company {slug,brand,tabs{},sodra}
const DATA_EVENTS = __DATA_EVENTS__;  // data/data_events.json — data-change log
```
A build pipeline (the Python scripts in `scripts/`: `parse_company.py`, `scrape_*`, `estimate_2025.py`, `data_events.py`) produces those JSONs and string-substitutes them into `template.html` to make the deployed page. **The template is not directly runnable** — the `__X__` tokens must be replaced first.

**Row shape (`data.json`):** `{company, brand, year, activities[], city, risk, employees, avgSalary, salaryCosts, revenue, profit, nonSalaryCosts, estimatedIncome}`. `revenue` = turnover; `estimatedIncome` = fee-based revenue.

**Client-side computation (all in-browser, no backend):**
- **Indexing:** `byBrand` (line 1214), `BRANDS`, `SEGMENTS`, `YEARS`, `LAST` (latest complete financial year = 2024), `FIN_YEARS`.
- **2025 estimation** is done in Python (`estimate_2025.py`, per the DEV NOTE at lines 10–19): `salaryCosts = avgSalary·employees·12`, `nonSalaryCosts = revenue − profit − salaryCosts`, `estimatedIncome = revenue·feeRatio`.
- **Aggregations:** `marketAgg(y)` (1848), `sodraYearAgg` (1866), `medianSalary` (1856), `segTotals`/`segMetricVal`/`segMetricPct` (2076/2031/2040).
- **Ranking/percentile:** `rankOf` (1296), `rankMetricValue` (2183).
- **Margins:** `profit/estimatedIncome` (with a >€50k floor), computed inline throughout.
- **Per-employee basis:** `pe = fn => d => fn(d)/d.employees` (line 1423) threads through every company chart.
- **Profile enrichment** merges sources at load: `FOUNDED`/`WEBSITE` from the Excel `Įmonės` sheet, `REK_CEO`/`REK_DESC`/`REK_WEB`/`REK_HAS` from `REK_DATA` (lines 1273–1292).
- Explorer transforms: `pivotRows` (4365), `rowsForMode` (4316), `splitYear` (4341), `covInfo` (4415).

---

## 4. JS Architecture

**Not an IIFE, not a module.** It's **one flat `<script>` block** (978–4994) executing top-to-bottom in global scope. ~145 top-level `function` declarations plus many `const`-assigned closures. Almost everything hangs off global functions and module-scope `let` variables.

**State = scattered module-scope globals**, e.g.: `coYear`/`coViewMode` (1294/1295), `ovBrands`/`ovBrand`/`ovActive` Set (1617–1618), `coFlowMode`, `rankMetricVal`/`rankSegments` (2143/2144), `revAllSegs`, `rekCo`/`rekLang`, `graphPan`. A few functions are exported onto `window` (`window.setBasis`, `window.setMarketKpiDisplay`, `window.toggleCoView`, `window.toggleMktView`) so cross-section callers and re-tap-nav can reach them. Charts stash their controller on the DOM node (`el.__fin`, `el.__bar`, `Chart.instances`).

**The load sequence mutates the DOM structurally** (this is the migration-critical part):
1. Charts render inside `dashView`.
2. `makeSectionsCollapsible()` (4834) **scrapes `h2.section` blocks out of dashView, deletes the headings, and re-parents their sibling nodes** into freshly-built `.group-card` containers — some placed into `companiesView`, some kept in `dashView` (lines 4885–4888). This is why `companiesView` is empty in source.
3. `ensureBottomBar()` lifts year rows / basis toggles into fixed bottom bars (4897–4939).
4. Company pills are lifted into a sticky top bar (4918–4930).
5. Charts are **re-fit** (`fitActiveCharts`, 4948) because reparenting changed their container widths.

**Rough function clusters (~145):**
- **View/theme/mode/settings** (~20): `switchView`, `applyTheme`, `applyPalette`, `retintCharts`, `applyMode`, `applyGraphPan`, `refitSvg`, GitHub/Sodra-refresh API (1118–1175).
- **Company rendering** (~15): `renderCompany` (1409, ~190 lines), `renderFinFlow` (nested 1475), `renderCompanyTabs`, `ovChanged`, `buildOvList`, `renderOvSegUI`, `renderOvChips`.
- **Market rendering** (~15): `renderMarket`, `marketAgg`, `renderMoneyFlowAll`, `renderSegView`, `renderRevSegAll`, `syncMarketTabTitle`.
- **Rankings/scatter** (~10): `renderRankToolbar`, `drawTop`, `renderScatterYear`, `buildScatterCfg`, `buildScatterScrub`.
- **SVG chart engine** (~20): `drawFinSvg`, `drawBarsSvg`, `drawSDD`, `sddSpec`, `svgMarker`, `barLuma`, series builders (`rekYearSeries`, `initSeries`, `sodraSeries`, `ddPerEmpAdjust`).
- **Version history** (~8): `renderHistTree`, `histBucketBySp`, `histLeaf`, `histSummaryHtml`, `fmtHistDay`.
- **Data explorer** (~30): `mountSheetExplorer`, `renderRek`, `renderCoverage`, `renderDataChanges`, `pivotRows`, `rowsForMode`, translation helpers (`tField`/`tTab`/`tVal`/`tCol`), `buildRekTabs`, `buildSodraTabs`, `selectCompany`, CSV export.
- **Layout/init** (~10): `makeSectionsCollapsible`, `ensureBottomBar`, `syncBottomBarH`, `fitActiveCharts`, `redrawDashSvg`.
- **Formatters/utils** (~15): `fmtM`, `fmtEur`, `fmtPct`, `E`, `esc`, `cssVar`, `dtFmtMoney`, `isNumCol`, `normVal`, `canonBase`.

---

## 5. External Dependencies

- **Chart.js 4.4.3** via CDN (`cdn.jsdelivr.net`, line 35) — the **only** runtime dependency. Used for just 2 charts (`#chSegments`, `#chScatter`); all other charts use the bespoke inline SVG engine.
- **GitHub REST API** (`api.github.com`, lines 1127+) — Dev-only "Refresh Sodra" workflow trigger; not needed for normal viewing.
- No frameworks, no CSS libraries, no fonts loaded (uses system `'Segoe UI', system-ui`).

---

## 6. UI/UX Patterns

- **Custom dropdowns** everywhere instead of `<select>` (`.co-select` + `.co-select-panel` + search + listbox + multi-select pills), because native selects couldn't do multi-select segment filters, chips, and per-option colour dots. Only the data-changes source filter and sheet-explorer use a native `<select>`.
- **Cards vs tables:** dashboard = `.card` + `.chartbox` (charts) and `.kpi` grids; explorer = dense scrollable `<table>` (sortable sticky headers, zebra striping, `.tablebox` max-height 92vh). The explorer deliberately **breaks out of the width cap** (`#rekView .wrap` max-width 1500px, line 384) while dashboard/companies stay a centred 840px column.
- **Colour tokens (CSS custom properties, lines 39–63):** `--bg --panel --panel2 --border --text --muted --accent --green --red --amber --purple --gold --cost --grid --hover`, plus money-flow `--mf-rev --mf-turn`. Themed by `[data-theme="dark"]` and re-palette by `[data-palette="ocean"]`. `--app-w:840px` is the layout cap. Fabula's identity colour is `--gold` throughout (gold KPI borders, gold table rows `tr.mine`, gold ranking bars). **Segment palette** is a separate JS map `SEG_PALETTES` (1218) with classic/ocean variants — Chart.js reads `cssVar('--text')` at render so charts re-tint on theme switch (`retintCharts` 1057).
- **Mobile constraints:** single-column grid everywhere (`.grid` line 173 — desktop deliberately matches the iPad/mobile layout). Extensive `@media(max-width:600px)` block (321–337): compact nav with a horizontally-scrolling button row, reduced padding, 300px chart height. Horizontally-scrolling pill strips with **hidden scrollbars** (`.yr-row`, `.seg-scroll`, `.grp-tabs`, `.data-tabs`, `.ov-chips`, lines 493–494). Fixed bottom control bar keeps year/basis toggles reachable while scrolling; JS measures its wrap-aware height into `--bottom-bar-h` (`syncBottomBarH` 4905). Charts default to page-scroll (pan off) so touch-drag scrolls the page, not the chart.

---

## Migration verdict (Next.js)

**Genuinely dynamic / interactive (must be rebuilt as React state/components):** every chart (9 charts, 2 engines), all custom dropdowns + multi-select filters, year/basis/KPI toggles, per-year⇄all-time mode, the scrubber animation, pan/zoom SVG interactions, the full Data Explorer (source modes, EN/LT translation, search, sort, CSV export), coverage grid, data-changes panel, version-history tree, theme/palette/dev-mode.

**Static-ish:** the changelog `VERSIONS` array (~280 entries, lines 2512–3442) and the sheet-description metadata — pure data.

**Coupling / risk hotspots:**
1. **`makeSectionsCollapsible()` (4834)** — the app **physically reparents DOM nodes from dashView into companiesView at runtime**. There is no clean per-page component boundary in the source; "Companies" literally *is* dashboard sections moved after load. In React each of those sections must be re-authored as a component and placed on the correct route directly.
2. **Rendering is HTML-string-coupled** — most renderers build `innerHTML` strings (`renderCompany`, `moneyFlowHtml`, `renderRek`, the whole SVG engine emits raw SVG markup strings). None of it is declarative; porting means rewriting each as JSX (charts especially — the custom SVG engine is ~500 lines of string-built SVG with manual pan/zoom/animation that would map more naturally to a charting lib or SVG-in-JSX).
3. **Global mutable state + `window.*` functions + DOM-stashed controllers (`el.__fin`)** must become React state/context.
4. **Build-time `__DATA__` substitution** cleanly maps to Next.js data loading (import the JSON / server component / `getStaticProps`) — the easiest part to migrate.
5. Chart.js is the only real dep and ports directly; the bespoke SVG engine is the largest single rewrite.
