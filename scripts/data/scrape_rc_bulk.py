#!/usr/bin/env python3
"""Registrų centras' OWN bulk filings dump — the fresh channel, not data.gov.lt.

    python3 scripts/data/scrape_rc_bulk.py            # this year's filings
    python3 scripts/data/scrape_rc_bulk.py 2026 2025  # named registration years

Writes data2/rc_bulk.json.

Why this exists: data.gov.lt's Spinta mirror of the JAR profit-and-loss
statements runs months behind — as of 2026-07-23 its newest reg_date was
2026-03-03 and it held no FY2025 periods at all. Registrų centras publishes the
same filings itself, regenerated daily, and that file HAS FY2025: 127 of our
131 companies, against 107 from the rekvizitai scrape. Free, no key, no auth.
See docs/research/fresher-company-data-sources.md.

The filename year is the year a statement was REGISTERED, not the year it
covers. JAR_FA_RODIKLIAI_PLNA_2026_n.csv is everything filed during 2026, which
is 415k FY2025 statements plus a long tail of late filings going back to 2015.
So to reach a fiscal year you fetch the year after it, and one file is enough
for one filing season. Only the _n names exist; a bare year 200s with an HTML
error page rather than 404ing, which is why fetch() checks the payload.

Each file is ~138 MB, so rows are streamed and matched against our company set
as they arrive — nothing is held but the ~370 rows that are ours.
"""
import csv, io, json, os, sys, urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data2", "rc_bulk.json")
COMPANIES = os.path.join(ROOT, "data2", "companies.json")

URL = ("https://www.registrucentras.lt/aduomenys/?byla="
       "JAR_FA_RODIKLIAI_PLNA_%s_n.csv")

# Keyed on line_type_id, never line_name: the same line appears in the file
# under two spellings — "PELNAS (NUOSTOLIAI) PRIEŠ APMOKESTINIMĄ" (77,612 rows)
# and a mis-cased "PRIEš … APMOKESTINIMą" (34,372) — so matching on the label
# silently drops a third of the pre-tax figures. The codes are the same ones
# scrape_gov.py maps off the Spinta API; both read the same registry.
LINE_TYPES = {
    "ISLT00345": "turnover",  # PARDAVIMO PAJAMOS
    "ISLT00001": "turnover",  # PARDAVIMO PAJAMOS (long form)
    "ISLT00293": "turnover",  # PAJAMOS (asociacijos / VšĮ)
    "ISLT00019": "profit",    # GRYNASIS PELNAS (NUOSTOLIAI)
    "ISLT00350": "profit",    # GRYNASIS PELNAS (NUOSTOLIAI) (trumpa)
    "ISLT00310": "profit",    # GRYNASIS VEIKLOS REZULTATAS
    "ISLT00222": "profit",    # ATASKAITINIŲ METŲ PELNAS (NUOSTOLIAI)
    "ISLT00017": "pretax",    # PELNAS (NUOSTOLIAI) PRIEŠ APMOKESTINIMĄ
    "ISLT00365": "pretax",
    "ISLT00309": "pretax",    # VEIKLOS REZULTATAS PRIEŠ APMOKESTINIMĄ
}


def fetch(year):
    """Stream one registration year's file. Yields csv rows as dicts."""
    request = urllib.request.Request(URL % year,
                                     headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=300) as response:
        # A missing file answers 200 with an HTML page, so the status says
        # nothing. The header row is the only honest signal that this is data.
        stream = io.TextIOWrapper(response, encoding="utf-8", newline="")
        first = stream.readline()
        if not first.startswith("ja_kodas|"):
            raise SystemExit("%s: not a data file — got %r" % (year, first[:60]))
        header = first.rstrip("\r\n").split("|")
        for row in csv.DictReader(stream, fieldnames=header, delimiter="|"):
            yield row


def collect(years, wanted):
    """(jarCode, fiscal year, metric) -> the row that should win.

    A company can appear several times for one year and metric: a filing gets
    corrected and refiled, and small companies file on a template that repeats
    lines. Newest reg_date wins, so a correction replaces the original rather
    than both surviving."""
    best = {}
    for year in years:
        rows = kept = 0
        for row in fetch(year):
            rows += 1
            if row["ja_kodas"] not in wanted:
                continue
            metric = LINE_TYPES.get(row["line_type_id"])
            end = row["turning_date"] or ""
            if not metric or len(end) < 4 or not row["reiksme"]:
                continue
            key = (row["ja_kodas"], int(end[:4]), metric)
            prev = best.get(key)
            if prev is None or (row["reg_date"] or "") >= (prev["reg_date"] or ""):
                best[key] = row
                kept += 1
        print("  %s: %d rows scanned, %d ours" % (year, rows, kept), file=sys.stderr)
    return best


def number(text):
    """reiksme is an integer euro amount, but it arrives as text and can be
    negative or empty."""
    try:
        return int(float(text))
    except (TypeError, ValueError):
        return None


def main():
    years = sys.argv[1:] or [str(datetime.now(timezone.utc).year)]
    entries = json.load(open(COMPANIES, encoding="utf-8"))
    wanted = {e["jarCode"] for e in entries if e.get("jarCode")}
    print("%d companies, registration years %s" % (len(wanted), ", ".join(years)),
          file=sys.stderr)
    best = collect(years, wanted)

    # (jarCode, year) -> one filing carrying all three metrics.
    filings = {}
    for (jar, year, metric), row in best.items():
        filing = filings.setdefault((jar, year), {
            "year": year, "turnover": None, "profit": None, "pretax": None,
            "periodEnd": row["turning_date"], "filedAt": row["reg_date"],
        })
        filing[metric] = number(row["reiksme"])
        if (row["reg_date"] or "") > (filing["filedAt"] or ""):
            filing["filedAt"] = row["reg_date"]

    companies = []
    for entry in entries:
        mine = [f for (jar, _), f in filings.items() if jar == entry.get("jarCode")]
        if not mine:
            continue
        companies.append({
            "jarCode": entry["jarCode"],
            "brand": entry.get("brand"),
            "financials": sorted(mine, key=lambda f: -f["year"]),
        })

    json.dump({
        "scrapedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "Registrų centras bulk dump, %s" % (URL % "<year>"),
        "note": "The year in the filename is when a statement was REGISTERED, "
                "not the period it covers. Regenerated daily by RC; months "
                "fresher than the same registry on data.gov.lt.",
        "registrationYears": years,
        "companies": sorted(companies, key=lambda c: c["brand"] or ""),
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("%s: %d companies, %d filings" % (OUT, len(companies), len(filings)),
          file=sys.stderr)


if __name__ == "__main__":
    main()
