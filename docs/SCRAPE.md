# Scraping rekvizitai.vz.lt

> **Status: done (v51).** Scraper + parser live in `scripts/`, output in `data/rek.csv`.
> Kept as a reference for re-running or scraping another company.

## Task for local Claude (VS Code)

Run the scraper for `6 vijos, MB`, parse the output, build a structured CSV, and commit it.

## Steps

### 1. Install dependencies
```bash
pip install playwright beautifulsoup4
playwright install chromium
```

### 2. Run the scraper
```bash
python3 scripts/scrape_6_vijos.py
```
This saves `6_vijos_raw.html` in the repo root (gitignored — a 4.8MB intermediate).

### 3. Parse the HTML and build a CSV

`scripts/parse_6_vijos.py`:
- Reads `6_vijos_raw.html`
- Extracts every label/value field on the page (financials, contacts, employees, addresses, risk, activities, etc.)
- Saves the result as `data/rek.csv`
- Prints a summary of what was extracted

The HTML structure of rekvizitai.vz.lt company pages puts every fact in 2/3-column `<table>` rows (no `<dt>`/`<dd>`). The parser pulls all of them — don't cherry-pick.
```bash
python3 scripts/parse_6_vijos.py
```

### 4. Commit and push
```bash
git add data/rek.csv scripts/parse_6_vijos.py
git commit -m "vN REPO-01 | scrape 6_vijos from rekvizitai.vz.lt into rek.csv | N sp"
git push origin main
```

## Goal
Once `data/rek.csv` exists and looks good, the web Claude session will add a "Rek" tab to the Data Explorer in `src/template.html` that renders it.
