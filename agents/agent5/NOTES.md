# agent5 — 2026-07-24 — restaurants branch: full pivot from marketing agencies to food service

Repivoted the repo to 4497 EVRK-56 companies: scraped RC bulk + gov + Sodra,
built the segment dashboard at `/`, deleted every marketing-era page, script
and data file.

## What the repo can't tell you

- **RC bulk files exist only for registration years 2023–2026.** `PLNA_2022_n.csv`
  and older answer HTTP 200 with an HTML page. The scrape doc's "fetch year N+1
  for fiscal N" still holds, but history before FY2022 comes only from the
  data.gov.lt Spinta API (`scrape_gov.py`), which carries 2015–2024.
- **Coverage numbers on 2026-07-24:** 3626/4497 companies have ≥1 filed year
  (gov+rc merged), 3648 have VMI tax rows, and only **866 exist on Sodra at
  all** — the scraper's "not found" is usually real (no insured staff, IĮ with
  owner only, or dissolved), but a small share may be throttle false-negatives;
  a retry pass over the missing 3631 was never done.
- **`data_events.py` survives the legacy deletion** — every legacy read is
  guarded by `os.path.exists`, and `slug_for_jar` now resolves from
  `data2/companies.json`'s `slug` field. Sodra files are named by that slug.
- **The dashboard is one page** (`src/app/restaurants/`, re-exported as `/`).
  It merges gov→rc gap-fill style (gov wins a year, rc only fills gaps) — the
  precedence rule from SCRAPE-registry-data.md. VMI taxes column shows the
  newest FULL year (`throughMonth === 12`); partial years mislead.
- **Marketing history lives on `main`.** Nothing was lost — this branch
  (`restaurants`) deleted it from its own tree only. Deleted: /companies,
  /explore, market-rough + explore features, rekvizitai + workbook scripts,
  data/data.json and friends, classification/rek_finance.
- `version-history.ts` moved to `src/lib/` because DevCornerMount needs it and
  market-rough is gone.
