# Scraping rekvizitai.vz.lt

> **Status: live (v67).** Generic per-company pipeline in `scripts/`; combined
> output in `data/rek_tabs.json`, rendered by the standalone **Rekvizitai** page.
> Currently holds **6 vijos** and **Adell reklama**.

## What it covers

A company on rekvizitai.vz.lt is split across separate tab URLs, not in-page
panels. The pipeline scrapes the four data tabs (Ataskaitos is a paywall, skipped):

| Tab | URL suffix | Yields |
| --- | --- | --- |
| Įmonė | `/` | codes, contacts, manager, address, LinkedIn, risk, export |
| Finansai | `/apyvarta/` | year-by-year statement + the chart series back to ~2013–2017 |
| Darbuotojai | `/darbuotoju-skaicius/` | headcount + annual average + dated chart points |
| Skolos | `/skolos/` | registered-debt status, dated VMI/Sodra debt history, credit check |

## Add a company (the whole flow)

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
