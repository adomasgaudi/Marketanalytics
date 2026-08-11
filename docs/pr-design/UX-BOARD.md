# UX / UI ticket board

27 tickets, all found by rendering the live app in Chromium at **360×780** and
**1280×900** and scoring the screenshots against the rubric in
[UI.md](UI.md) — not by reading code and guessing. Every ticket below names the
render that shows it; the ones with a file:line were then confirmed in source.

**Notion import:** [`ux-board.csv`](ux-board.csv) is shaped as a Notion database
— _Import → CSV_, then group by `Status` for the board view. Columns:
`ID, Name, Status, Priority, Area, Page, Evidence, Fix`.

Method note: screenshots were taken full-page, which paints fixed elements at
their initial viewport position. Anything that looked like "the bottom bar
covers a heading" in those captures was re-checked in a real viewport shot and
is **not** a bug — it is a capture artifact. UX-07 survived that check.

<br />

## Backlog — P1 · broken or shipping a defect

| ID | Ticket | Where |
| --- | --- | --- |
| UX-01 | Debug **`SVG`** badge renders on every chart in production | `LineChart.tsx:257`, `MoneyFlowByYear.tsx:262` |
| UX-03 | Footer text fails contrast at **1.35:1** (AA needs 4.5:1) | `globals.css:457` `.letterpress` |
| UX-04 | Stray `€` glyph floating on the segment line-chart y-axis | `/` |
| UX-05 | Coverage table year headers collapse into `201201201202202` | `/explore` @360 |
| UX-06 | Top-ranked bar loses its value label — reads as missing data | `/companies` |
| UX-07 | `Per employee` clipped to `Per employe` in the fixed bottom bar | `/` @1280 |

**UX-01 — done.** An 8px `SVG` pill sat at the top-left of every chartbox, twice
on the home page alone. Unlike every other non-obvious choice in this codebase
it carried no explaining comment, which is what marked it as leftover. Both
spans removed; re-shot at 1280×900 and confirmed 0 remaining in the DOM with
the charts otherwise unchanged.

**UX-03** — measured, not eyeballed: `srgb(0.150 0.163 0.193)` on
`rgb(10,12,17)`. `.letterpress` tints the line to just under the page floor,
which is the stated intent, but the result is below the legibility floor too.
**Owner's call**, so it is not being auto-fixed: the effect is deliberate and
raising it changes a look you chose. Say the word and it goes to `text-muted`.

**UX-02 was re-filed as P2 after reading the source** — the `"fab"` default is
deliberate (`WorkbookViewer.tsx:535` scopes company sheets to Fabula), not a
leftover. The confusion is real but the fix is a visible "Showing: Fabula ×"
chip, not a deletion. See the CSV.

<br />

## Backlog — P2 · charts that can be misread

| ID | Ticket | Where |
| --- | --- | --- |
| UX-08 | Company pill grid clips its right column, no scroll affordance | `/`, `/companies` |
| UX-09 | Segment and metric pill rows clip at the right edge | `/`, `/companies` |
| UX-10 | End-of-series line labels overlap each other and clip | `/` |
| UX-11 | YoY delta badges float between bars — which year do they belong to? | `/` |
| UX-12 | Payroll labels butt against the revenue bar; 2025's clips | `/` |
| UX-13 | Rankings x-axis ticks collide: `€0.00M€0.50M€1.00M…` | `/companies` @360 |
| UX-14 | Scatter log axis prints duplicate ticks `€1.0M €1.0M` | `/` |
| UX-15 | Scatter metric + scale controls rendered twice on one card | `/` |
| UX-16 | Small rankings bars: name spills out, collides with value | `/companies` |
| UX-17 | Gold highlighted bar labels inside, blue-on-yellow, unlike every row | `/companies` |
| UX-18 | Bar fills don't match the legend swatches | `/` |

These are the ones that cost credibility: a chart whose legend doesn't identify
its own marks (UX-18), or whose #1 row shows no number (UX-06), makes a reader
distrust the figures behind it — which is the whole product.

<br />

## Backlog — P3 · layout, typography, consistency

| ID | Ticket | Where |
| --- | --- | --- |
| UX-19 | ~120px dead band between data-sources and the company strip | `/`, `/companies` |
| UX-20 | Sheets/model controls stagger over 4 ragged rows — ⅓ of the phone viewport | `/explore/*` @360 |
| UX-21 | Provenance wraps mid-token: `scraped 2026-` / `07-22` | `/explore/model` |
| UX-22 | `Every agency` / `2025 · by turnover` wrap atomically | `/`, `/companies` @360 |
| UX-23 | Empty Financials state = full card for one sentence | `/companies` |
| UX-24 | `+1,77%` comma decimal, everywhere else uses `.` | `/explore/model` |
| UX-25 | LT and EN labels mixed while an `English` toggle sits already-on | `/explore` |
| UX-26 | Workbook and model grids show no figures at all at 360px | `/explore/*` |
| UX-27 | Keyboard-hint clusters take ~110px of desktop hero space | `/`, `/companies` |

UX-21 and UX-22 are direct rubric #2 violations (atomic-token wrapping);
UX-19 and UX-20 are rubric #3 (content should get the most room).

<br />

## Checked and _not_ filed

- **Horizontal overflow** — `scrollWidth == clientWidth` on all five routes at
  both widths. Clean.
- **Console errors** — none on any route, either width.
- **`/companies` hero contrast** — the H1 renders at 60% alpha (3.3:1) against
  the Markets H1's 14:1. That passes AA for large text, so it is a hierarchy
  inconsistency rather than a defect. Worth a look, not worth a P1.

<br />

## Reproducing

```
pnpm install && pnpm dev
```

Then drive Chromium at `/opt/pw-browsers/chromium` over `/`, `/companies`,
`/explore`, `/explore/sheets`, `/explore/model` at 360×780 and 1280×900 with
`deviceScaleFactor: 2`. Per UI.md the loop is render → critique → refine, so
re-shoot after each fix rather than trusting the diff.
