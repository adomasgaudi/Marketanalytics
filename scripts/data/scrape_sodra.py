#!/usr/bin/env python3
"""Fetch Sodra monthly data for companies from atvira.sodra.lt's open REST API.

    python3 scripts/data/scrape_sodra.py <jarCode> [<jarCode> ...]
    e.g. python3 scripts/data/scrape_sodra.py 304405052
    python3 scripts/data/scrape_sodra.py --all   # every company code in rek_tabs.json

<jarCode> is the Juridinių asmenų registras (company) code — the same code the
rekvizitai scrape already captures as "Įmonės kodas". For each company we:
  1. search  /imones-rest/solr/page?text=<jarCode>      -> resolve Sodra's
     internal `code` + confirm the jarCode match
  2. fetch   /imones-rest/values/monthly/page?codes=<code>&size=N
     -> the monthly history: avgWage, numInsured, tax, activity, municipality
and write data/sodra/<jarCode>.json (one self-contained file per company = SSOT).

Why direct API, not HTML scraping: atvira.sodra.lt is an open-data portal with a
clean JSON REST API (discovered via its own UI). Far more robust than parsing the
ExtJS DOM. No bot check, so this also runs from a CI datacenter IP.

Why stdlib HTTP, not Playwright: this used to drive headless Chromium and read
`body.innerText`. Chromium renders an application/json response into an EMPTY body
(no JSON viewer in headless), so every parse died with "Expecting value: line 1
column 1" — on GitHub Actions all 117 companies failed while the job stayed green.
The endpoint returns plain JSON; urllib reads it directly, needs no 100 MB browser,
and cannot be broken by a renderer quirk.

Data caveat: Sodra SUPPRESSES avgWage when a company has a single insured person
(privacy), so 1-employee firms return numInsured but avgWage=null. That's a real
property of the source, not a bug — multi-employee firms return wages.
"""
import json, os, sys, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_events import append_sodra_batch, diff_sodra, sodra_meta

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

API = "https://atvira.sodra.lt/imones-rest"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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


UA = "Mozilla/5.0 (compatible; marketanalytics.lt data refresh)"


def _json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_company(jar):
    """Resolve a jarCode to Sodra's internal code, then pull its monthly history.
    Retries the search a few times — under rapid sequential calls Sodra throttles
    and returns an empty result set, which is NOT the same as 'not in Sodra'."""
    match = None
    for attempt in range(4):
        search = _json(f"{API}/solr/page?text={jar}&start=0&size=20")
        content = search.get("content", []) if isinstance(search, dict) else []
        match = next((c for c in content if str(c.get("jarCode")) == str(jar)), None)
        if match:
            break
        # empty/odd response -> likely throttled; back off and retry
        time.sleep(1.5 * (attempt + 1))
    if not match:
        return None
    code = match["code"]
    hist = _json(f"{API}/values/monthly/page?codes={code}&start=0&size=400")
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
    rec["_meta"] = sodra_meta()
    return rec


def main(jars):
    """Returns the number of companies successfully written.

    The caller turns 0-of-many into a non-zero exit. Without that, a total failure
    (every request erroring) printed 117 ERROR lines and still exited 0 — the CI job
    went green and reported "nothing to commit", which reads as "data is current"."""
    os.makedirs(OUT_DIR, exist_ok=True)
    fetched = 0
    written = 0
    changes = []
    for jar in jars:
        try:
            rec = fetch_company(jar)
        except Exception as e:
            print(f"{jar}: ERROR {str(e)[:70]}", flush=True)
            continue
        if not rec:
            print(f"{jar}: not found on Sodra", flush=True)
            continue
        fetched += 1
        out = os.path.join(OUT_DIR, f"{jar}.json")
        old = None
        if os.path.exists(out):
            with open(out, encoding="utf-8") as f:
                old = json.load(f)
        ch = diff_sodra(old, rec)
        if ch is None and old is not None:
            print(f"{jar}: unchanged", flush=True)
            continue
        with open(out, "w", encoding="utf-8") as f:
            json.dump(rec, f, ensure_ascii=False, indent=1)
        written += 1
        if ch:
            changes.append(ch)
        wages = sum(1 for m in rec["months"] if m["avgWage"] is not None)
        print(f"{jar}: {rec['name']} — {len(rec['months'])} months "
              f"({wages} with wage, latest insured={rec['latest']['numInsured']}) -> {os.path.relpath(out)}",
              flush=True)
        time.sleep(0.6)   # pace requests so Sodra doesn't throttle
    if changes:
        append_sodra_batch(changes, written=written, scanned=len(jars))
    if jars and fetched == 0:
        sys.exit("FATAL: every company failed — endpoint down, blocked, or shape changed")
    return written


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit("usage: python3 scripts/data/scrape_sodra.py <jarCode> [...] | --all")
    if "--all" in args:
        args = all_jar_codes()
        print(f"--all: {len(args)} company codes from rek_tabs.json")
    ok = main(args)
    print(f"\n{ok}/{len(args)} companies written")
    # Fail loudly when nothing could be fetched at all — broken endpoint or blocked IP.
    # All-fetched-but-unchanged is fine (ok=0, no FATAL).
