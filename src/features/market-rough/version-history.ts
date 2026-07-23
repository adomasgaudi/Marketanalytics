export type VersionEntry = {
  v: string;
  date: string;
  sp?: number;
  title: string;
  desc?: string;
};

/** Next.js-era history (newest first). The legacy dashboard and its changelog were
 *  removed in v3.41.0; the pre-v3 history lives in git only. */
export const VERSIONS: VersionEntry[] = [
  {
    v: "v3.42.4",
    date: "2026-07-23",
    title: "Company ring restored",
    desc: "All Segments again includes the inner company donut, while its labels stay off to keep the full market readable and stable.",
  },
  {
    v: "v3.42.3",
    date: "2026-07-23",
    title: "All-segments donut fix",
    desc: "Dropped the inner company ring at whole-market scope (~150 micro-slices collapsed Chart.js) and hardened on-slice label guards.",
  },
  {
    v: "v3.42.2",
    date: "2026-07-23",
    title: "Persistent segment positions",
    desc: "Year and metric changes now animate the existing segment slices in place; only a segment-scope change rebuilds the donut structure.",
  },
  {
    v: "v3.42.1",
    date: "2026-07-23",
    title: "Stable market chart switching",
    desc: "Made donut updates atomic and ignored transient Chart.js teardown frames, so rapid segment and year changes no longer break either market view.",
  },
  {
    v: "v3.41.0",
    date: "2026-07-21",
    sp: 2,
    title: "Legacy dashboard removed",
    desc: "Deleted the generated legacy HTML dashboard, its Python builder, the /v2 route and menu link; the build is now plain `next build`.",
  },
  {
    v: "v3.40.11",
    date: "2026-07-20",
    title: "Company hover names",
    desc: "Added company names to inner donut slice tooltips without adding static labels.",
  },
  {
    v: "v3.40.10",
    date: "2026-07-20",
    title: "Stable thin company ring",
    desc: "Fixed company slice positions across updates and made the inner donut half as thick.",
  },
  {
    v: "v3.40.9",
    date: "2026-07-20",
    title: "Company donut ring",
    desc: "Added an unlabeled inner ring that subdivides each segment by its reporting companies.",
  },
  {
    v: "v3.40.8",
    date: "2026-07-20",
    title: "Gradient-aligned segments",
    desc: "Unified segment colours into a blue–violet tonal gradient matching the dark page accent.",
  },
  {
    v: "v3.40.7",
    date: "2026-07-20",
    title: "Restore scatter depth",
    desc: "Restored desktop chart height so the scatter axes, legend, and bubbles remain readable.",
  },
  {
    v: "v3.40.6",
    date: "2026-07-20",
    title: "Theme-rich segment colours",
    desc: "Recast the default segment palette in richer blue, indigo, and teal theme tones.",
  },
  {
    v: "v3.40.5",
    date: "2026-07-20",
    title: "Tonal segment harmony",
    desc: "Retuned segment colours into a quieter, related dusk palette with tonal variety.",
  },
  {
    v: "v3.40.4",
    date: "2026-07-20",
    title: "Custom segment menu",
    desc: "Replaced the native segment selector with a fully custom, icon-led mobile menu.",
  },
  {
    v: "v3.40.3",
    date: "2026-07-20",
    title: "Compact segment picker",
    desc: "Made the mobile segment selector a custom icon control, freeing room for year choices.",
  },
  {
    v: "v3.40.2",
    date: "2026-07-20",
    title: "Taller navigation feedback",
    desc: "Expanded mobile icon targets and made change confirmations visible above the navigation bar.",
  },
  {
    v: "v3.40.1",
    date: "2026-07-20",
    title: "Halve scatter height",
    desc: "Reduced the mobile size-versus-profitability chart height from 900px to 450px.",
  },
  {
    v: "v3.39.0",
    date: "2026-07-20",
    sp: 5,
    title:
      "DSGN-01 | refined skin (data-skin, one-tap kill switch): rebuilt tokens across all 4 theme×palette combos, 5 new accent palettes (7 total, cycling), SVG icon set replaces emoji + hand-drawn cog, Segoe UI Variable + tabular figures + 12px small-type floor, hidden scrollbars, 150ms motion system + focus rings, nav/footer aligned to the content column, settings right-anchored, chip × → right-quarter hover zone, rankings open by default, scatter 50% taller",
    desc: "Chart palettes rebuilt on a spectral wheel. The previous segment palette failed 4 of 5 machine checks (two hues read as gray; PA↔Production house ΔE 12.6). Current palette is beauty-first by explicit choice — measured trade-off: adjacent violet↔blue ΔE 1.3 under deuteranopia, normal-vision floor 9.6 vs 15 target.",
  },
  {
    v: "v3.38.1",
    date: "2026-07-20",
    sp: 1,
    title:
      "DEVX-03 | npm → pnpm (packageManager pin, lockfile, onlyBuiltDependencies); `pnpm lan` prints the Wi-Fi URL + opens a scannable QR PNG; allowedDevOrigins unblocks phone testing (page loaded but never hydrated, so nothing was clickable)",
  },
  {
    v: "v3.38.0",
    date: "2026-07-18",
    sp: 5,
    title:
      "EXPL-01 (WIP) | /explore — v2 rekView ported: coverage grid, data-changes log, company field data (4 source modes, EN toggle, CSV), raw-sheet explorers; explore buttons repointed. KNOWN ISSUE: ~2min dev SSR, see HANDOFF.md",
  },
  {
    v: "v3.37.0",
    date: "2026-07-18",
    sp: 2,
    title:
      "DEVX-02 | the real Pepper dev corner, as a shared package: @adomas/dev-tools (file:../Meta apps/dev-tools) mounts in Dev mode — edit/view trays, x-ray, depth, history; /api/design-note appends design-notes.jsonl; Pepper consumes the same package",
  },
  {
    v: "v3.36.0",
    date: "2026-07-18",
    sp: 1,
    title:
      "DEVX-01 | x-ray upgraded to Pepper's current toolkit: inspect tints the hovered box + its whole ancestor stack, readout lists the ancestor boxes, Ctrl+F flips all toggles (dev mode only)",
  },
  {
    v: "v3.35.0",
    date: "2026-07-18",
    sp: 3,
    title:
      "COPA-04 | picker parity + page polish: chips toggle on/off (dashed = hidden, × removes, order stable), pills-only sticky bar lifted to page level, vs-market metric headings + gaps, scatter Fabula de-starred, bottom-bar height var clears the footer, inset footer",
  },
  {
    v: "v3.34.0",
    date: "2026-07-18",
    sp: 2,
    title:
      "INSI-01 | key insights recomputed per selected year with interpretive verdicts: growth regime, pass-through segment, scale-vs-margin, loss-making growers, wage pressure, winner clustering",
  },
  {
    v: "v3.33.0",
    date: "2026-07-18",
    sp: 3,
    title:
      "COPA-03 | multi-company compare: picker multi-select w/ source cubes, compare chips, company tabs, grouped vs-market bars in chip colours",
  },
  {
    v: "v3.32.0",
    date: "2026-07-18",
    sp: 3,
    title:
      "COPA-02 | company picker is the legacy dropdown: Fabula ▾ button, segment multi-select, metric-threshold filters, clear-filters, hint, search + results list",
  },
  {
    v: "v3.31.0",
    date: "2026-07-18",
    sp: 5,
    title:
      "COPA-01 | companies per-year parity vs v2: profile card, legacy KPI cards + 8s auto-flip, money-flow empty states, vs-market & rankings on the BarsSvg engine, deep-dive folded into all-time, year row hidden in all-years",
  },
  {
    v: "v3.30.0",
    date: "2026-07-18",
    sp: 2,
    title:
      "LINE-01 | line engine: year gridlines, 3-step ghost metric switch, axis glide; version-history backfilled v3.4→v3.29",
  },
  {
    v: "v3.29.0",
    date: "2026-07-17",
    sp: 3,
    title:
      "MKTA-04 | financial-metrics-by-segment on the line engine: bands, ranked series, unit axis, tooltip/fit/pan",
  },
  {
    v: "v3.28.0",
    date: "2026-07-17",
    sp: 1,
    title:
      "MKTA-03 | money-flow chart exact fit math: 1.22 label headroom, ±10% zoom-out both axes, slot×0.7 bars, unclipped year row",
  },
  {
    v: "v3.27.0",
    date: "2026-07-17",
    sp: 0.5,
    title: "MKTA-02 | segment-trends metric row is the joined .seg control",
  },
  {
    v: "v3.26.0",
    date: "2026-07-17",
    sp: 3,
    title:
      "MKTA-01 | all-years money-flow is the drawFinSvg engine: segment labels, 0-based axis w/ headroom, tooltip, fit, pan/zoom",
  },
  {
    v: "v3.25.0",
    date: "2026-07-17",
    sp: 3,
    title:
      "SEGC-03 | bars are the real drawBarsSvg engine: view state, tooltip, fit, pan/zoom, resize",
  },
  {
    v: "v3.24.0",
    date: "2026-07-17",
    sp: 1,
    title:
      "SEGC-02 | segment bars match drawBarsSvg: names in-bar, values at bar end, 1/2/5 tick gridlines",
  },
  {
    v: "v3.23.0",
    date: "2026-07-17",
    sp: 3,
    title:
      "SEGC-01 | by-segment card parity: joined .seg toggles, eng-tag, SVG bars mode, chart-bg slice borders, legacy mobile density",
  },
  {
    v: "v3.22.0",
    date: "2026-07-17",
    sp: 1,
    title:
      "MKTD-01 | market-data section parity: 19px group heading, 6px flow-bar radius, legacy #/% buttons",
  },
  {
    v: "v3.21.3",
    date: "2026-07-17",
    sp: 0.5,
    title:
      "INTR-01 | intro parity: hero 22px bottom margin, view-word hover .82, top cards stay 2-up on phones",
  },
  {
    v: "v3.21.2",
    date: "2026-07-17",
    sp: 1,
    title: "NAVX-03 | dev-gate CSS x-ray tools; Companies re-tap toggles its view",
  },
  {
    v: "v3.21.1",
    date: "2026-07-17",
    sp: 1,
    title:
      "NAVX-02 | version label is the secret dev key (8 clicks, hint at 5); menu labels name the target mode",
  },
  {
    v: "v3.21.0",
    date: "2026-07-17",
    sp: 3,
    title:
      "NAVX-01 | nav 1:1: logo view-toggle + back chevron, split mkt/co view modes, clickable version, Dev-gated menu",
  },
  {
    v: "v3.20.0",
    date: "2026-07-17",
    sp: 5,
    title:
      "PORT-15 | parity pass vs legacy: default/dev mode, chart labels, segment picker",
  },
  {
    v: "v3.19.0",
    date: "2026-07-17",
    sp: 2,
    title: "PORT-14 | clickable per-year/all-years hero word synced with tabs + nav subs",
  },
  {
    v: "v3.18.0",
    date: "2026-07-17",
    sp: 5,
    title:
      "PORT-13 | full-parity restructure: Markets + /companies views, tabbed group cards, fixed bottom bar",
  },
  {
    v: "v3.17.0",
    date: "2026-07-17",
    sp: 3,
    title: "PORT-12 | size-vs-profitability year scrubber (interpolated bubbles)",
  },
  {
    v: "v3.16.0",
    date: "2026-07-17",
    sp: 2,
    title: "PORT-11 | vs-the-market percentile rank bars in company section",
  },
  {
    v: "v3.15.0",
    date: "2026-07-17",
    sp: 3,
    title: "PORT-10 | segment trends, company deep-dive, explore-btn + footer",
  },
  {
    v: "v3.14.0",
    date: "2026-07-17",
    sp: 2,
    title: "PORT-09 | company rankings top10/bottom10 with metric + segment pills",
  },
  {
    v: "v3.13.0",
    date: "2026-07-17",
    sp: 3,
    title: "PORT-08 | money-flow-by-year SVG stacked bars (company + market all-time)",
  },
  {
    v: "v3.12.1",
    date: "2026-07-17",
    sp: 0.5,
    title: "HOOK-03 | Claude commit-format hook accepts semver subjects",
  },
  {
    v: "v3.12.0",
    date: "2026-07-17",
    sp: 2,
    title: "PORT-07 | company money-flow card with rank chip + basis scaling",
  },
  {
    v: "v3.11.2",
    date: "2026-07-17",
    sp: 0.5,
    title: "HOOK-02 | commit-msg hook accepts semver subjects (v3.x.x)",
  },
  {
    v: "v3.11.1",
    date: "2026-07-17",
    sp: 0.5,
    title: "VERS-02 | sync package version to renamed history",
  },
  {
    v: "v3.11.0",
    date: "2026-07-17",
    sp: 2,
    title: "PORT-06 | size-vs-profitability bubble chart (log x, Fabula gold)",
  },
  {
    v: "v3.10.0",
    date: "2026-07-17",
    sp: 3,
    title: "PORT-05 | segment chart: Chart.js doughnut + bars, metric & %/€ toggles",
  },
  {
    v: "v3.9.0",
    date: "2026-07-17",
    sp: 1,
    title: "PORT-04 | key insights collapsible card (6 analyst notes)",
  },
  {
    v: "v3.8.0",
    date: "2026-07-17",
    sp: 2,
    title: "PORT-03 | market KPI #/% mode toggle + formula folds",
  },
  {
    v: "v3.7.0",
    date: "2026-07-17",
    sp: 2,
    title:
      "PORT-02 | market money-flow card (stacked bar + gold revenue bracket + legend)",
  },
  {
    v: "v3.6.0",
    date: "2026-07-17",
    sp: 1,
    title: "PORT-01 | top cards: companies tracked + data sources",
  },
  {
    v: "v3.5.1",
    date: "2026-07-17",
    sp: 0.5,
    title: "VERS-01 | v2 page carries 2.x versioning (v2.91)",
  },
  {
    v: "v3.5.0",
    date: "2026-07-17",
    sp: 2,
    title:
      "STYL-02 | replicate legacy topnav 1:1 (logo sub, 2-line Companies, settings cog)",
  },
  {
    v: "v3.4.1",
    date: "2026-07-17",
    sp: 1,
    title:
      "ROUT-01 | rough is now the root page, legacy moved to /v2, old landing removed",
  },
  {
    v: "v3.4.0",
    date: "2026-07-17",
    sp: 2,
    title: "STYL-01 | fix unlayered CSS reset killing Tailwind spacing; legacy-look pass",
  },
  {
    v: "v3.3.0",
    date: "2026-07-17",
    sp: 5,
    title: "Finish rough-page migration",
    desc: "Rough page completes the migration with a sortable Explorer table.",
  },
  {
    v: "v3.2.1",
    date: "2026-07-12",
    sp: 3,
    title: "Prettier auto-format hook",
    desc: "Repo hook auto-formats on save with loop-safe hook laws.",
  },
  {
    v: "v3.1.3",
    date: "2026-07-12",
    sp: 3,
    title: "Hoist Next app to repo root",
    desc: "Moved the app from next-app/ to the repository root.",
  },
  {
    v: "v3.1.2",
    date: "2026-07-12",
    sp: 1,
    title: "Version from package metadata",
    desc: "App version label is generated from package metadata.",
  },
  {
    v: "v3.1.1",
    date: "2026-07-12",
    title: "Checkpoint migration tracks",
  },
  {
    v: "v3.0",
    date: "2026-07-12",
    title: "Scaffold Next.js migration app",
    desc: "New Next.js track alongside the legacy dashboard (kept at /ugly).",
  },
];
