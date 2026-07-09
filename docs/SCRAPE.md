# Scraping rekvizitai.vz.lt

> **Status: live.** Generic per-company pipeline in `scripts/`; combined output
> in `data/rek_tabs.json`, rendered by the standalone **Rekvizitai** page.
> `scripts/autoscrape.py` keeps it in sync with `data/data.json` on its own.

## What it covers

A company on rekvizitai.vz.lt is split across separate tab URLs, not in-page
panels. The pipeline scrapes the four data tabs (Ataskaitos is a paywall, skipped):

| Tab | URL suffix | Yields |
| --- | --- | --- |
| Įmonė | `/` | codes, contacts, manager, address, LinkedIn, risk, export |
| Finansai | `/apyvarta/` | year-by-year statement + the chart series back to ~2013–2017 |
| Darbuotojai | `/darbuotoju-skaicius/` | headcount + annual average + dated chart points |
| Skolos | `/skolos/` | registered-debt status, dated VMI/Sodra debt history, credit check |

## The one command (auto-scrape)

`data/data.json` decides *which* companies exist; `data/rek_tabs.json` holds the
scraped detail. To close the gap between them:

```bash
python3 scripts/autoscrape.py --dry-run   # list brands with no scraped block
python3 scripts/autoscrape.py             # resolve slugs, scrape, parse, write
python3 src/build_site.py                 # then rebuild the site
```

It diffs the two files, resolves each missing brand's slug through the site's
search API (slugs are historical registry names — `Fabula` lives at
`viesuju_rysiu_partneriai`, so they can't be guessed), scrapes every tab, parses
with the brand forced, and writes `rek_tabs.json` once at the end.

### The Cloudflare check

rekvizitai now gates pages behind a Cloudflare interstitial ("Luktelėkite…") that
no throwaway browser clears. `scripts/browser_session.py` keeps a **persistent
Chrome profile** in `data/.pwprofile/` (gitignored): a visible window opens, you
click the check **once**, the clearance cookie is stored, and every later page —
and every later run — reuses it. Nothing reloads while you are solving it.
Once a cookie exists, `REK_HEADLESS=1` runs the whole thing without a window.

## Add one company by hand

`<slug>` is the path segment in `https://rekvizitai.vz.lt/imone/<slug>/`.

### 1. Install dependencies (once)
```bash
pip install playwright beautifulsoup4
playwright install chromium
```

### 2. Scrape all tabs
```bash
python3 scripts/scrape_company.py <slug>          # e.g. adell_reklama
```
Saves one HTML file per tab to `data/raw/<slug>_<tab>.html` (gitignored — multi-MB intermediates).

### 3. Parse → combined JSON
```bash
python3 scripts/parse_company.py <slug>           # add --brand "Name" to override
```
`scripts/parse_company.py`:
- Reads every `data/raw/<slug>_<tab>.html`
- Runs the right extractor per tab — label/value `<table>` rows, the Finansai
  metric×year grid, the Highcharts time-series behind the diagrams, and prose facts
- Auto-detects the matching `data/data.json` **brand** (so Original/Merge work);
  pass `--brand` if the name doesn't match
- **Upserts** the company block into `data/rek_tabs.json`
  (`{"companies":[{slug,name,brand,order,tabs}]}`) — the single source of info,
  keyed by slug, so re-running refreshes just that company

### 4. Rebuild, commit, push
```bash
python3 src/build_site.py
git add data/rek_tabs.json scripts/ index.html src/template.html
git commit -m "vN REPO-01 | scrape <slug> into rek_tabs.json | N sp"
git push origin main
```

## Result
The **Rekvizitai** page (`src/template.html`) shows a company pill row; each
company has Įmonė/Finansai/Darbuotojai/Skolos sub-tabs with an Original / Scrape /
Merge toggle. Re-run the pipeline for a slug to refresh that company.
