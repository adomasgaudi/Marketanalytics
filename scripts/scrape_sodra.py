#!/usr/bin/env python3
"""Fetch Sodra monthly data for companies from atvira.sodra.lt's open REST API.

    python3 scripts/scrape_sodra.py <jarCode> [<jarCode> ...]
    e.g. python3 scripts/scrape_sodra.py 304405052

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
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "sodra")


async def _json(pg, url):
    await pg.goto(url, wait_until="domcontentloaded", timeout=30000)
    return json.loads(await pg.eval_on_selector("body", "e=>e.innerText"))


async def fetch_company(pg, jar):
    """Resolve a jarCode to Sodra's internal code, then pull its monthly history."""
    search = await _json(pg, f"{API}/solr/page?text={jar}&start=0&size=20")
    match = next((c for c in search.get("content", []) if str(c.get("jarCode")) == str(jar)), None)
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
        await b.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit("usage: python3 scripts/scrape_sodra.py <jarCode> [<jarCode> ...]  (e.g. 304405052)")
    asyncio.run(main(args))
