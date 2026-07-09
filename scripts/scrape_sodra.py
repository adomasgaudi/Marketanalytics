#!/usr/bin/env python3
"""Fetch Sodra monthly data for companies from atvira.sodra.lt's open REST API.

    python3 scripts/scrape_sodra.py <jarCode> [<jarCode> ...]
    e.g. python3 scripts/scrape_sodra.py 304405052
    python3 scripts/scrape_sodra.py --all   # every company code in rek_tabs.json

<jarCode> is the Juridinių asmenų registras (company) code — the same code the
rekvizitai scrape already captures as "Įmonės kodas". For each company we:
  1. search  /imones-rest/solr/page?text=<jarCode>      -> resolve Sodra's
     internal `code` + confirm the jarCode match
  2. fetch   /imones-rest/values/monthly/page?codes=<code>&size=N
     -> the monthly history: avgWage, numInsured, tax, activity, municipality
and write data/sodra/<jarCode>.json (one self-contained file per company = SSOT).

Why direct API, not HTML scraping: atvira.sodra.lt is an open-data portal with a
clean JSON REST API (discovered via its own UI). Far more robust than parsing the
ExtJS DOM. Runs locally — the sandbox can't reach external hosts (CLAUDE.md).

Data caveat: Sodra SUPPRESSES avgWage when a company has a single insured person
(privacy), so 1-employee firms return numInsured but avgWage=null. That's a real
property of the source, not a bug — multi-employee firms return wages.
"""
import asyncio, json, os, sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from playwright.async_api import async_playwright

API = "https://atvira.sodra.lt/imones-rest"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "data", "sodra")
REK = os.path.join(ROOT, "data", "rek_tabs.json")


def all_jar_codes():
    """Every "Įmonės kodas" in rek_tabs.json — the same key build_site.py joins on,
    so --all covers exactly the companies whose Sodra block can reach the page."""
    rek = json.load(open(REK, encoding="utf-8"))
    codes = []
    for block in rek["companies"]:
        for tab in block.get("tabs", {}).values():
            for field, value in tab.get("rows", []):
                if field == "Įmonės kodas":
                    code = str(value).strip()
                    if code and code not in codes:
                        codes.append(code)
    return codes


async def _json(pg, url):
    await pg.goto(url, wait_until="domcontentloaded", timeout=30000)
    return json.loads(await pg.eval_on_selector("body", "e=>e.innerText"))


async def fetch_company(pg, jar):
    """Resolve a jarCode to Sodra's internal code, then pull its monthly history.
    Retries the search a few times — under rapid sequential calls Sodra throttles
    and returns an empty result set, which is NOT the same as 'not in Sodra'."""
    match = None
    for attempt in range(4):
        search = await _json(pg, f"{API}/solr/page?text={jar}&start=0&size=20")
        content = search.get("content", []) if isinstance(search, dict) else []
        match = next((c for c in content if str(c.get("jarCode")) == str(jar)), None)
        if match:
            break
        # empty/odd response -> likely throttled; back off and retry
        await asyncio.sleep(1.5 * (attempt + 1))
    if not match:
        return None
    code = match["code"]
    hist = await _json(pg, f"{API}/values/monthly/page?codes={code}&start=0&size=400")
    rows = hist.get("content", [])
    months = [
        {"month": r["month"], "avgWage": r.get("avgWage"),
         "numInsured": r.get("numInsured"), "tax": r.get("tax")}
        for r in rows
    ]
    return {
        "jarCode": str(jar),
        "sodraCode": code,
        "name": match.get("name"),
        "ecoActName": match.get("evrkName") or match.get("ecoActName"),
        "municipality": match.get("muniName") or match.get("municipality"),
        "latest": {"month": match.get("month"),
                   "avgWage": match.get("lastAvgWage"),
                   "numInsured": match.get("lastNumInsured")},
        "months": months,
        "source": "atvira.sodra.lt (open data)",
    }


async def main(jars):
    os.makedirs(OUT_DIR, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page()
        await pg.route("**/*", lambda r: r.abort()
                       if r.request.resource_type in ("image", "media", "font") else r.continue_())
        for jar in jars:
            try:
                rec = await fetch_company(pg, jar)
            except Exception as e:
                print(f"{jar}: ERROR {str(e)[:70]}")
                continue
            if not rec:
                print(f"{jar}: not found on Sodra")
                continue
            out = os.path.join(OUT_DIR, f"{jar}.json")
            with open(out, "w", encoding="utf-8") as f:
                json.dump(rec, f, ensure_ascii=False, indent=1)
            wages = sum(1 for m in rec["months"] if m["avgWage"] is not None)
            print(f"{jar}: {rec['name']} — {len(rec['months'])} months "
                  f"({wages} with wage, latest insured={rec['latest']['numInsured']}) -> {os.path.relpath(out)}")
            await asyncio.sleep(0.6)   # pace requests so Sodra doesn't throttle
        await b.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit("usage: python3 scripts/scrape_sodra.py <jarCode> [...] | --all")
    if "--all" in args:
        args = all_jar_codes()
        print(f"--all: {len(args)} company codes from rek_tabs.json")
    asyncio.run(main(args))
