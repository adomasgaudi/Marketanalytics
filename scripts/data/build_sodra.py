#!/usr/bin/env python3
"""Roll data/sodra/<slug>.json up into one data2/sodra_months.json.

    python3 scripts/data/build_sodra.py

Why: the app cannot import 115 separate JSON files into a client bundle, and
the per-company files carry fields the sheet has no use for. This keeps only
what a wage bill needs — month, insured headcount, average wage — and joins
each company to its jarCode, the key data2 uses everywhere.

Nothing is computed here. The yearly average headcount and the summed wage
bill are worked out in the app, where the arithmetic is visible next to the
figures it produces rather than baked into a file.

Sodra caveat, carried through untouched: avgWage is SUPPRESSED for a company
with a single insured person (privacy), so those months have a headcount and
no wage. A year that leans on such months cannot have a complete wage bill,
which is why monthsWithWage travels alongside the numbers.
"""
import glob
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "data", "sodra")
COMPANIES = os.path.join(ROOT, "data2", "companies.json")
OUT = os.path.join(ROOT, "data2", "sodra_months.json")


def main():
    by_jar = {
        str(c.get("jarCode") or ""): c
        for c in json.load(open(COMPANIES, encoding="utf-8"))
        if c.get("jarCode")
    }

    companies, unmatched = [], []
    for path in sorted(glob.glob(os.path.join(SRC, "*.json"))):
        record = json.load(open(path, encoding="utf-8"))
        jar = str(record.get("jarCode") or "")
        entry = by_jar.get(jar)
        if not entry:
            unmatched.append((os.path.basename(path), jar))
            continue
        months = [
            {
                "month": m["month"],          # YYYYMM
                "insured": m.get("numInsured"),
                "avgWage": m.get("avgWage"),
            }
            for m in record.get("months") or []
            if m.get("month")
        ]
        months.sort(key=lambda m: m["month"])
        companies.append({
            "jarCode": jar,
            "brand": entry.get("brand"),
            "slug": os.path.splitext(os.path.basename(path))[0],
            "months": months,
        })

    payload = {
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "data/sodra/<slug>.json (atvira.sodra.lt), joined to companies.json on jarCode",
        "notes": "monthly only, nothing derived; avgWage is null where Sodra suppresses it "
                 "(a single insured person)",
        "companies": companies,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

    total = sum(len(c["months"]) for c in companies)
    print("wrote %s — %d companies, %d months" % (OUT, len(companies), total))
    for name, jar in unmatched:
        print("  !! %s (jarCode %s) is not in companies.json" % (name, jar or "—"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
