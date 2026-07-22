# data2 — the rebuilt dataset

Everything here is sourced from a public registry and rebuilt from scratch.
Nothing here descends from the original spreadsheet.

`data/` is the legacy set — `data.json` and the workbook it came from, where
figures were typed, pasted or estimated years ago and their origin is no longer
recoverable. It stays until the dashboard is moved over; it is not extended.

| File | What it is |
| --- | --- |
| `companies.json` | Which agencies exist. Hand-maintained: brand, legal name, jarCode, and where the code was found. Adding an agency is one line. The scrapers take their company set from here. |
| `gov_finance.json` | Turnover, net and pre-tax profit per filed year (Registrų centras JAR) plus taxes paid (VMI), both via data.gov.lt. Written by `scripts/data/scrape_gov.py --all`. Rebuildable — delete it and re-scrape. |

## Rules

- **Sourced beats derived.** A figure from a registry is never overwritten by
  one we worked out.
- **Every file says where it came from.** A number with no traceable origin does
  not belong here — that is the problem data2 exists to fix.
- **Data commits stand alone**, and their subject says what was found: how many
  records, which companies, which years.

## Still in `data/`

`sodra/<slug>.json` — monthly headcount and wages. New-pipeline data, but the
legacy `/explore` page reads it in place, so it moves when that page does.
