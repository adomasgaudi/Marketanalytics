#!/usr/bin/env python3
"""Reshape data/rek_tabs.json into data2/rek_finance.json, stamped with WHEN.

    python3 scripts/data/build_rek_finance.py

Why: Registrų centras' open-data snapshot lags ~5 months, so gov_finance.json
has almost no 2025 filings. Rekvizitai resells the same registry on a direct
feed and already carries 2025. Using it means the sheet mixes two sources, so
every figure has to say which one it came from and when it was taken.

rek_tabs.json carries no timestamp. The only record of when a company was
scraped is the commit that last changed its Finansai rows, so scrape dates are
reconstructed from git history and grouped into numbered instances, oldest
first: instance 1 is the earliest scrape run, 2 the next, and so on.
"""
import hashlib, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REK = os.path.join(ROOT, "data", "rek_tabs.json")
OUT = os.path.join(ROOT, "data2", "rek_finance.json")

# Rekvizitai's label -> our metric. The "(grafikas)" duplicates of these lines
# are the same figures redrawn for a chart, so they are ignored.
LABELS = {
    "Pardavimo pajamos": "turnover",
    "Pelnas (nuostoliai) prieš mokesčius": "pretax",
    "Grynasis pelnas (nuostoliai)": "profit",
}


def sh(*args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True,
                          encoding="utf-8", check=True).stdout


def scrape_dates():
    """slug -> ISO date of the commit that last changed that company's figures."""
    log = sh("git", "log", "--reverse", "--format=%H %aI", "--", "data/rek_tabs.json")
    last, seen = {}, {}
    for line in log.strip().splitlines():
        sha, when = line.split(" ", 1)
        doc = json.loads(sh("git", "show", "%s:data/rek_tabs.json" % sha))
        # The file's shape changed over its life: one company object early on,
        # a {"companies": [...]} envelope later.
        entries = doc.get("companies", []) if isinstance(doc, dict) else doc
        for c in entries:
            if not isinstance(c, dict) or "slug" not in c:
                continue
            rows = c.get("tabs", {}).get("Finansai", {}).get("rows", [])
            digest = hashlib.sha1(json.dumps(rows, ensure_ascii=False, sort_keys=True)
                                  .encode("utf-8")).hexdigest()
            if seen.get(c["slug"]) != digest:
                seen[c["slug"]] = digest
                last[c["slug"]] = when
    return last


def amount(text):
    """'-29 378 €' -> -29378. Rekvizitai spaces its thousands and may use a
    non-breaking space, so strip everything that is not sign or digit."""
    clean = re.sub(r"[^\d\-]", "", (text or "").replace("−", "-"))
    return int(clean) if clean not in ("", "-") else None


def financials(rows):
    """Finansai rows -> [{year, turnover, pretax, profit}], newest year first."""
    years = {}
    for key, value in rows:
        match = re.match(r"^(.*?) (\d{4})$", key)
        metric = LABELS.get(match.group(1)) if match else None
        if not metric:
            continue
        year = int(match.group(2))
        entry = years.setdefault(year, {"year": year, "turnover": None,
                                        "pretax": None, "profit": None})
        entry[metric] = amount(value)
    return [years[y] for y in sorted(years, reverse=True)]


def main():
    dates = scrape_dates()
    # Instances are numbered by date, oldest first, so a lower number always
    # means older data no matter how many scrapes accumulate later.
    order = {day: i + 1 for i, day in enumerate(sorted({d[:10] for d in dates.values()}))}
    companies = []
    for c in json.load(open(REK, encoding="utf-8"))["companies"]:
        fields = dict(tuple(r) for r in c["tabs"].get("Įmonė", {}).get("rows", [])
                      if len(r) == 2)
        at = dates.get(c["slug"])
        companies.append({
            "slug": c["slug"],
            "brand": c.get("brand"),
            "jarCode": fields.get("Įmonės kodas"),
            "scrapedAt": at,
            "scrapeInstance": order.get((at or "")[:10]),
            "financials": financials(c["tabs"].get("Finansai", {}).get("rows", [])),
        })
    out = {
        "source": "rekvizitai.lt company pages (Finansai tab), via data/rek_tabs.json",
        "note": "Scrape dates are reconstructed from git history — rek_tabs.json "
                "stores no timestamp of its own.",
        "scrapes": [{"instance": n, "date": day,
                     "companies": sum(1 for d in dates.values() if d[:10] == day)}
                    for day, n in sorted(order.items(), key=lambda kv: kv[1])],
        "companies": companies,
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("%s: %d companies, %d scrape instances"
          % (OUT, len(companies), len(order)), file=sys.stderr)


if __name__ == "__main__":
    main()
