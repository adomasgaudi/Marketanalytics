# LT Communication Agencies — Competitor Dashboard

Analytical dashboard of 113 Lithuanian communication, marketing and consulting agencies,
built from `Komunikacija-konsultacija-konkurentai.xlsx` (rekvizitai.vz.lt data, 2019–2024).

## Usage

Open **`index.html`** in any browser — it is fully self-contained (data embedded inline,
Chart.js loaded from CDN). No server needed.

## What's inside

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
| `index.html` | The dashboard (generated, self-contained) |
| `template.html` | HTML/JS template with `__DATA__` placeholder |
| `data.json` | Cleaned per-company per-year records extracted from the Excel file |
| `build_site.py` | Injects `data.json` into the template → `index.html` |

To rebuild after editing the template or data: `python3 build_site.py`
