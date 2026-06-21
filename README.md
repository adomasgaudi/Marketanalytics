# LT Communication Agencies — Competitor Dashboard

Analytical dashboard of 113 Lithuanian communication, marketing and consulting agencies,
built from `Komunikacija-konsultacija-konkurentai.xlsx` (rekvizitai.vz.lt data, 2019–2024).

## Usage

Open **`index.html`** in any browser — it is fully self-contained (data embedded inline,
Chart.js loaded from CDN). No server needed.

## What's inside

- **My company (Fabula ir partneriai)** — your own company surfaced at the top: KPI cards
  with YoY change and market rank, a 2019–2024 trend chart, and a percentile-vs-market chart.
  Also highlighted (gold) in the scatter plot and pinned to the top of the explorer table.
  Note: *Viešųjų ryšių partneriai (VRP)*, code 124099127, rebranded to *Fabula ir partneriai*
  and is the same legal entity.
- **KPI strip** — market revenue, CAGR, profit, headcount, median salary
- **Key insights** — six analytical findings written from the data
- **Market overview** — revenue/profit/headcount trend, segment breakdown & segment trends
- **Rankings** — top-20 companies by any metric/year/segment, growth leaders vs laggards,
  size-vs-profitability bubble chart
- **People & pay** — salary quartile trends, revenue-per-employee by segment
- **Company explorer** — searchable, sortable, filterable table of all 113 brands

## Files

| File | Purpose |
|---|---|
| `index.html` | The dashboard (generated, self-contained). Stays at repo root for GitHub Pages. |
| `src/template.html` | HTML/JS template with `__DATA__` / `__SHEETS_DATA__` placeholders |
| `src/build_site.py` | Injects the JSON data into the template → `index.html` |
| `data/data.json` | Cleaned per-company per-year records extracted from the Excel file |
| `data/sheets_data.json` | Raw Excel sheets backing the Data Explorer |
| `data/rek.csv` | Scraped rekvizitai.vz.lt fields (see `scripts/`) |
| `scripts/` | rekvizitai.vz.lt scraping pipeline (scrape + parse) |
| `docs/` | Project docs and the standalone `fabula.html` profile |

To rebuild after editing the template or data: `python3 src/build_site.py`
(paths are repo-root-relative, so it runs from anywhere).
