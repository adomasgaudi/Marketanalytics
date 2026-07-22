# HANDOFF — workbook viewer → /explore/sheets (2026-07-22)

The standalone `financial-data-viewer` app (sibling folder `Client apps/financial-data-viewer`)
was folded into this repo. It **replaces** the old `/explore/sheets` page: the two source tabs
"📑 Raw Excel sheets" and "🗂️ Organised (my version)" and their component
`src/features/explore/SheetExplorer.tsx` are deleted. The standalone folder still exists on
disk but is retired — work on the copy in this repo.

Untouched by the port: 📊 Data coverage by year (`Coverage.tsx`), 📜 Data changes
(`DataChanges.tsx`), 🔎 Company field data (`ExploreView.tsx` + `FieldData.tsx`) on `/explore`.

## What landed where

| Path                                          | What it is                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| `src/features/explore/WorkbookViewer.tsx`      | The whole viewer, one client component (~1300 lines)                        |
| `src/app/explore/sheets/workbook-viewer.css`   | Its stylesheet, scoped under `.wbv`                                          |
| `src/app/explore/sheets/page.tsx`              | Full-screen route that mounts both                                           |
| `data/workbook.json`                           | The dataset — `{source, sheets[]}`, one sheet `Main` (115×97, `A1:CS115`)     |
| `data/disagreements.json`                      | 102 records the viewer flags in gold on the cells they argue with            |
| `scripts/data/workbook/*.mjs`                  | The 7 one-off transforms that produced `workbook.json`                        |

`data/sheets_data.json` is **not** replaced — `src/features/market-rough/profile.ts` and the
`make-sheets-*.mjs` scripts still read it. Only the old UI died.

## The dataset

`data/workbook.json` is extracted straight from `Komunikacija-konsultacija-konkurentai.xlsx`
(no dependency: an .xlsx is a zip of XML parts). Each sheet carries `values`, `formulas` and
`numberFormats` — the viewer needs all three, which is why it does not read `sheets_data.json`.
Missing values are the literal `\N`.

Everything now lives in one `Main` sheet. The pipeline that got there, in order — each script
takes `--check` to report without writing, and none deletes a value it cannot account for:

1. `extract-workbook.mjs <path.xlsx>` — rebuild from source (re-run first; it drops the merges below)
2. `merge-raw-into-imones.mjs` — Raw folded into Įmonės by Kodas (Įmonės wins conflicts; it is the fuller sheet, 169 companies to 103)
3. `merge-analizei-into-main.mjs` — what Įmonės-analizei alone knew (long → wide), matched by name
4. `dedupe-analizei.mjs` — drops analizei columns Main can now account for
5. `split-analysis-sheets.mjs` — separates the ranking from the hidden staging block ("Vyksta magija >>>>>" marks the seam)
6. `retire-pokyciai.mjs`, `retire-company-year-sheets.mjs` — retire Analizė-pokyčiai / Įmonės-analizei / Kuryba / PR; what they recorded differently becomes `data/disagreements.json`

A disagreement record is `{sheet, company, year, field, theirs, ours, why}`.

## Viewer behaviour worth knowing

- `sheetConfig` at the top of `WorkbookViewer.tsx` decides which columns leave the grid: contacts/registry (1-16), links/risk tail (77-82), the Raw carry-over (83-91) and activity categories (92-96) are hidden and surface in the company cell's hover popup instead.
- `sheetDefaultQuery` opens `Main` pre-filtered to `fab` (Fabula). Non-matching rows stay listed but veiled; clicking one opens it.
- Freeze panes and column widths persist in `localStorage` under `financial-data-viewer:layout` (key kept as-is).
- Columns named `… Pokytis …` never render as columns — they ride along as the little ±% next to the year they belong to.
- `ƒ Formulas` outlines formula cells; the dot on one traces its inputs with arrows drawn on an SVG overlay.

## Port decisions (don't undo these by accident)

- **Theme.** The viewer's own light/dark toggle was removed. Its palette is defined as
  `.wbv { … }` + `[data-theme="dark"] .wbv { … }`, so it follows the app's own theme switcher
  (`TopNav`), which owns the `data-theme` attribute on `<html>`.
- **CSS, not Tailwind.** `workbook-viewer.css` is hand-written CSS, against the repo norm. It is
  a verbatim port of a spreadsheet grid whose sticky panes, z-index ladder and hover popups are
  the component. Every rule is nested under `.wbv` so it cannot reach the rest of the app —
  keep it that way.
- **`CellStyle`, not `CSSProperties`.** `tsconfig.preserveSymlinks: true` (needed for the
  `@adomas/dev-tools` symlink) stops TS resolving `csstype` through pnpm, so `React.CSSProperties`
  is an empty type repo-wide. The grid's inline styles use a local `CellStyle` type instead.
  Adding `csstype` would fix the root cause but turn full CSS type-checking on everywhere at once.
- **Changelog dropped.** The viewer's own `changelog.ts` and its "What's new" dialog did not come
  across; version history lives in `docs/pr-project-state/VersionHistory.md`.
- Its `mainMirror` / `derivedFromTurnover` / `changeMirror` tables lint as unused — they are the
  scripts' reasoning kept beside the data. Left in place deliberately.

## Verified 2026-07-22

`pnpm build` passes (static export emits `out/explore/sheets.html`). Live on dev: 115 rows,
search pre-filled `fab`, disagreements gold, no console errors; palette follows `data-theme`
both ways; `/explore` unchanged. `pnpm lint` — the viewer adds warnings only; the remaining
errors are pre-existing (`TopNav`, `MoneyFlowByYear`).
