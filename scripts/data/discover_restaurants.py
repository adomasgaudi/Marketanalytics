#!/usr/bin/env python3
"""Discover every Lithuanian restaurant's JAR code from the VMI tax-payer registry.

    python3 scripts/data/discover_restaurants.py            # 561000 (restaurants)
    python3 scripts/data/discover_restaurants.py 561000 563000  # + bars

Writes data2/companies.json — the company set the financial scrapers read.

Why this source: the free JAR company registry (gov/rc/jar/iregistruoti) carries
NO activity code, so restaurants cannot be filtered there. VMI's tax-payer
registry (gov/vmi/mm_registras/MokesciuMoketojas) does: every payer row links to
an EVRK economic-activity classifier via `ekonomine_veikla.kodas` (6-digit, e.g.
561000 = "Restoranų ir pagaminto valgio teikimo veikla") and carries `ja_kodas`.

Scope taken here, each a deliberate narrowing of the raw ~6k rows:
  * `pagrindine=1`  — restaurants as the company's MAIN activity, not a sideline
    (a builder that also runs a canteen has a 561000 row with pagrindine=0).
  * `isreg_data=null` — still active; a non-null value is the deregistration date.
  * dedupe on ja_kodas — one company files several rows (per tax group/branch).
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

API = "https://get.data.gov.lt"
MODEL = "datasets/gov/vmi/mm_registras/MokesciuMoketojas"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data2", "companies.json")

# EVRK 2 (NACE Rev.2) division 56 — food & beverage service activities.
EVRK_LABELS = {
    "561000": "Restaurants",
    "562100": "Event catering",
    "562900": "Other food service",
    "563000": "Bars",
}


def get(query):
    url = "%s/%s/:format/json?%s" % (API, MODEL, query)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r).get("_data", [])
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503, 504) and attempt < 3:
                time.sleep(2 ** attempt); continue
            raise
        except urllib.error.URLError:
            if attempt < 3:
                time.sleep(2 ** attempt); continue
            raise
    return []


def slugify(name):
    keep = "".join(c.lower() if c.isalnum() else " " for c in name)
    return "_".join(keep.split())[:60] or "n_a"


def fetch(code):
    expr = 'ekonomine_veikla.kodas="%s"&pagrindine=1&isreg_data=null' % code
    q = urllib.parse.quote(expr, safe='=()."&')
    return get("%s&select(ja_kodas,pavadinimas)&sort(ja_kodas)&limit(20000)" % q)


def main(argv):
    codes = argv or ["561000"]
    by_jar = {}
    for code in codes:
        rows = fetch(code)
        print("EVRK %s (%s): %d rows" % (code, EVRK_LABELS.get(code, "?"), len(rows)))
        for r in rows:
            jar = str(r.get("ja_kodas") or "").strip()
            if not jar or jar in by_jar:
                continue
            name = (r.get("pavadinimas") or "").strip()
            by_jar[jar] = {
                "brand": name,
                "name": name,
                "slug": slugify(name),
                "jarCode": jar,
                "evrk": code,
                "found": "vmi/mm_registras",
            }
    companies = sorted(by_jar.values(), key=lambda c: c["jarCode"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(companies, f, ensure_ascii=False, indent=1)
    print("\nwrote %s — %d distinct companies" % (os.path.relpath(OUT, ROOT), len(companies)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
