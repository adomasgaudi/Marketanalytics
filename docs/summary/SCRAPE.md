# Rekvizitai Pipeline

> v91.13. `data.json` defines companies; `rek_tabs.json` stores their scraped detail.

Setup once: `pip install playwright beautifulsoup4`, then
`playwright install chromium`.

```bash
python3 scripts/autoscrape.py --dry-run
python3 scripts/autoscrape.py
python3 src/build_site.py
```

`autoscrape.py` finds missing brands, resolves historical slugs, scrapes/parses
all tabs with a forced brand, and writes `rek_tabs.json` once.

```bash
python3 scripts/scrape_company.py <slug>
python3 scripts/parse_company.py <slug> --brand "Name"
python3 src/build_site.py
```

Scrape `/`, `/apyvarta/`, `/darbuotoju-skaicius/`, and `/skolos/`; annual
statements are paywalled. Raw HTML: `data/raw/<slug>_<tab>.html`; parsed records
upsert by slug. Tabs yield legal/contact, finance, headcount, and VMI/Sodra debt;
slugs are not inferable (`Fabula` = `viesuju_rysiu_partneriai`).

Cloudflare uses persistent Chrome profile `data/.pwprofile/`; solve once, then
`REK_HEADLESS=1` reuses the cookie.
