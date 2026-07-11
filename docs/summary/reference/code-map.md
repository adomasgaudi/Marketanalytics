# Code Map

> v91.13. Static single-file dashboard: `src/template.html` + injected JSON -> `index.html`.

- Three views: `dashView` (Markets), `companiesView`, and `rekView` (Data Explorer).
- Flat global script, mutable state, `window.*`, and DOM-stashed chart controls.
  Chart.js renders two charts; SVG renders seven with pan/zoom and scrubber.
  `makeSectionsCollapsible()` moves Markets nodes into Companies, hoists controls,
  then requires a refit.
- Build replaces `__DATA__`, `__SHEETS_DATA__`, `__REK_DATA__`, and
  `__DATA_EVENTS__`. Before injecting `__REK_DATA__`, `build_site.py` joins each
  `data/sodra/<jarCode>.json` onto its company via Rekvizitai `Įmonės kodas`.
  Row: `{company,brand,year,activities,city,risk,employees,avgSalary,
  salaryCosts,revenue,profit,nonSalaryCosts,estimatedIncome}`. `revenue` means
  turnover; 2025 is estimated.
- `switchView()` refits revealed charts; active-nav re-tap flips year/all-time.
  Renderers, explorer, SVG, and layout are coupled through globals and strings.
  Rebuild: unresolved `__DATA__` placeholders make the template unrunnable.

Migration: direct components/state, no DOM reparenting; wrap `drawFinSvg`,
`drawBarsSvg`, `drawSDD` first. Chart.js and static JSON loading port directly.
