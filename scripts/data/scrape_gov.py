#!/usr/bin/env python3
"""Fetch revenue/profit (Registrų centras) and paid taxes (VMI) from data.gov.lt.

    python3 scripts/data/scrape_gov.py <jarCode> [<jarCode> ...]
    python3 scripts/data/scrape_gov.py --all    # every company code in rek_tabs.json

Writes data/gov_finance.json — one record per company, joined on jarCode.

Why this exists: rekvizitai's "Pardavimo pajamos / Grynasis pelnas / Sumokėti
mokesčiai VMI" blocks are not rekvizitai's own numbers. They are republished
state registry data, and the same data is free on the Lithuanian open-data
portal's Spinta API (https://get.data.gov.lt) — no key, no bot check, no
paywall. Scraping rekvizitai for them is strictly worse: paginated HTML, a
Cloudflare check, and a "Ataskaitos" tab that is paywalled anyway.

Two sources, two shapes:

  datasets/gov/rc/jar/pelno_ataskaitos/PelnoAtaskaita
    Registrų centras JAR — the raw lines of every filed pelno (nuostolių)
    ataskaita. Annual, one filing per financial year, published ~May-June of
    the following year. This is where revenue and net profit come from.

  datasets/gov/vmi/ja_mokesciai/Moketojas
    VMI — taxes actually PAID into the state budget (cash, not accrued).
    `suma` is CUMULATIVE from January: menuo=12 is a full year, and the
    current year holds exactly one row at the latest closed month. That is
    literally rekvizitai's "282 641 € (sausis - gegužė)".

Data caveats, both real properties of the source rather than bugs:

  * VMI keeps NO monthly history. Each month overwrites the current year's row,
    so a per-month series can only be built by snapshotting over time — which
    is how rekvizitai derives its "42 753 € (gegužė)" figure. We record
    `ytd` plus the previous years' totals and leave the differencing to
    whoever accumulates snapshots.
  * RC returns each P&L line MORE THAN ONCE — the same figure appears under
    several template_id/statusas combinations. We dedupe on (year, metric) and
    keep the newest reg_date, so a later corrected filing wins.
  * `line_name` depends on which filing template the company used (a labai maža
    įmonė files a different form than an asociacija), so we key on the stable
    `line_type_id` code, not the human label. LINE_TYPES below covers every
    variant seen across the rek_tabs company set.
  * RC data lags harder than VMI: most companies file in May-June, and the
    portal snapshot itself trails by months. Expect the newest complete year to
    be ~18 months behind for a chunk of the set.
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_events import brand_for_jar, slug_for_jar

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

API = "https://get.data.gov.lt"
RC_MODEL = "datasets/gov/rc/jar/pelno_ataskaitos/PelnoAtaskaita"
VMI_MODEL = "datasets/gov/vmi/ja_mokesciai/Moketojas"

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "gov_finance.json")
COMPANIES = os.path.join(ROOT, "data", "companies.json")

# line_type_id -> our metric. Several ids per metric because each filing
# template names the same line differently ("PARDAVIMO PAJAMOS" on a company
# form, "PAJAMOS" on a non-profit one).
LINE_TYPES = {
    "ISLT00345": "revenue",   # PARDAVIMO PAJAMOS
    "ISLT00001": "revenue",   # PARDAVIMO PAJAMOS (long form)
    "ISLT00293": "revenue",   # PAJAMOS (asociacijos / VšĮ)
    "ISLT00019": "profit",    # GRYNASIS PELNAS (NUOSTOLIAI)
    "ISLT00350": "profit",    # GRYNASIS PELNAS (NUOSTOLIAI) (trumpa)
    "ISLT00310": "profit",    # GRYNASIS VEIKLOS REZULTATAS
    "ISLT00017": "pretax",    # PELNAS (NUOSTOLIAI) PRIEŠ APMOKESTINIMĄ
    "ISLT00365": "pretax",
    "ISLT00309": "pretax",    # VEIKLOS REZULTATAS PRIEŠ APMOKESTINIMĄ
}


def get(model, query):
    """One Spinta read. The query keeps literal parens — limit(500), select(...)
    and sort(...) are syntax to Spinta, so percent-encoding them 400s."""
    url = "%s/%s/:format/json?%s" % (API, model, query)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r).get("_data", [])
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503, 504) and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            raise
        except urllib.error.URLError:
            if attempt < 3:
                time.sleep(2 ** attempt)
                continue
            raise
    return []


def fetch_financials(jar):
    """Annual revenue/profit for one company code, newest year first."""
    rows = get(RC_MODEL, "juridinis_asmuo.ja_kodas=%s&limit(500)"
                         "&select(line_type_id,reiksme,laikotarpis_nuo,laikotarpis_iki,reg_date)" % jar)
    # (year, metric) -> row, newest reg_date wins so a corrected refiling replaces
    # the original instead of both surviving as duplicates.
    best = {}
    for r in rows:
        metric = LINE_TYPES.get(r.get("line_type_id"))
        end = r.get("laikotarpis_iki") or ""
        if not metric or len(end) < 4:
            continue
        year = int(end[:4])
        key = (year, metric)
        prev = best.get(key)
        if prev is None or (r.get("reg_date") or "") >= (prev.get("reg_date") or ""):
            best[key] = r

    years = {}
    for (year, metric), r in best.items():
        y = years.setdefault(year, {"year": year, "revenue": None, "profit": None,
                                    "pretax": None, "periodEnd": r.get("laikotarpis_iki"),
                                    "filedAt": r.get("reg_date")})
        y[metric] = r.get("reiksme")
        if (r.get("reg_date") or "") > (y["filedAt"] or ""):
            y["filedAt"] = r.get("reg_date")
    return [years[y] for y in sorted(years, reverse=True)]


def fetch_taxes(jar):
    """VMI paid-tax rows, newest first. Each row is cumulative-from-January."""
    rows = get(VMI_MODEL, "mm_kodas.ja_kodas=%s&limit(200)&sort(-metai,-menuo)"
                          "&select(pavadinimas,metai,menuo,suma,atnaujinta)" % jar)
    name = rows[0].get("pavadinimas") if rows else None
    out = []
    for r in rows:
        out.append({
            "year": r.get("metai"),
            "throughMonth": r.get("menuo"),   # 12 = full year, else year-to-date
            "ytd": r.get("suma"),
            "updatedAt": r.get("atnaujinta"),
        })
    return name, out


def all_jar_codes():
    """Every jarCode in companies.json — the one hand-maintained list of which
    agencies we track. It replaced rek_tabs.json as the source of the company
    set: rek_tabs only ever held the 117 with a rekvizitai page, and 14 more
    codes were found by hand (their registered names look nothing like their
    brands, e.g. Convo is UAB "Sėkmingi"). Adding an agency is one line there."""
    companies = json.load(open(COMPANIES, encoding="utf-8"))
    codes = []
    for company in companies:
        code = str(company.get("jarCode") or "").strip()
        if code and code not in codes:
            codes.append(code)
    return codes


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    codes = all_jar_codes() if argv[0] == "--all" else [str(c).strip() for c in argv]

    companies = []
    for i, jar in enumerate(codes, 1):
        try:
            financials = fetch_financials(jar)
            vmi_name, taxes = fetch_taxes(jar)
        except Exception as e:
            print("  !! %s failed: %s" % (jar, e))
            continue
        latest = financials[0] if financials else None
        companies.append({
            "jarCode": jar,
            "slug": slug_for_jar(jar),
            "brand": brand_for_jar(jar),
            "name": vmi_name,
            "latestYear": latest["year"] if latest else None,
            "revenue": latest["revenue"] if latest else None,
            "profit": latest["profit"] if latest else None,
            "financials": financials,
            "taxes": taxes,
        })
        print("[%d/%d] %s %s — %d fin years, %d tax rows"
              % (i, len(codes), jar, brand_for_jar(jar) or "", len(financials), len(taxes)))

    payload = {
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sources": {
            "financials": "Registrų centras JAR via data.gov.lt (%s)" % RC_MODEL,
            "taxes": "VMI via data.gov.lt (%s)" % VMI_MODEL,
        },
        "notes": "financials are annual filings; taxes.ytd is cumulative from January "
                 "(throughMonth=12 means full year).",
        "companies": companies,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print("\nwrote %s (%d companies)" % (os.path.relpath(OUT, ROOT), len(companies)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
