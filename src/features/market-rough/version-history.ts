export type VersionEntry = {
  v: string;
  date: string;
  sp?: number;
  title: string;
  desc?: string;
};

/** Next.js-era history (newest first). The full legacy changelog lives in /ugly. */
export const VERSIONS: VersionEntry[] = [
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
