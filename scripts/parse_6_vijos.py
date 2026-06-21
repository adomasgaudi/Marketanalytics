#!/usr/bin/env python3
"""Parse the scraped 6 vijos tab pages into data/rek.csv.

scrape_6_vijos.py saves one HTML file per company tab under data/raw/. This
reads them all and writes:
  - data/rek.csv      : flat field,value (rows grouped by source-tab order)
  - data/rek_tabs.json: one field/value sheet per tab (Įmonė, Finansai, …),
                        the data behind the standalone Rekvizitai page

Per tab we run whichever extractors fit that page:
  - label/value rows  : 2/3-column <table> rows (overview contacts/codes, etc.)
  - year table        : the Finansai <table class="finances-table"> — a metric ×
                        year grid, flattened to "<metric> <year>" -> value rows
  - chart series      : the Highcharts time-series behind the diagrams, embedded
                        as `JSON.parse('...')` blobs (financials back to 2017,
                        monthly VMI/Sodra debt history, headcount over time) —
                        these are the numbers the static tables/prose DON'T show
  - prose facts       : targeted regexes for headcount / debt sentences that
                        aren't in tables (Darbuotojai, Skolos)
The Ataskaitos tab is a paywall sales page with no free data — skipped.
"""
import csv
import json
import os
import re
import sys
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8")
from bs4 import BeautifulSoup

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW_DIR = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data", "rek.csv")

# Human label per tab key, in display order.
TAB_LABEL = {
    "imone": "Įmonė",
    "finansai": "Finansai",
    "darbuotojai": "Darbuotojai",
    "skolos": "Skolos",
}

# Value suffixes that are leftover modal/button chrome, not data.
NOISE = [
    "Susisiekti el. paštu su 6 vijos Siųsti Uždaryti",
    "Susisiekti el. paštu", "Uždaryti", "Plačiau ›", "Darbuotojų pokytis ›",
    "Galimas paskolos dydis iki 12 000 € iš „Noviti Finance“ Pildyti paraišką",
    "Pildyti paraišką",
]


def clean(s):
    s = re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip()
    for n in NOISE:
        n = re.sub(r"\s+", " ", n.replace("\xa0", " ")).strip()
        if s.endswith(n):
            s = s[: -len(n)].strip()
    return s.strip()


def text_after(soup, label):
    el = soup.find(string=lambda t: t and label in t)
    if not el:
        return None
    sib = el.parent.find_next_sibling()
    return clean(sib.get_text(" ", strip=True)) if sib else None


def overview_facts(soup, add):
    """Header blocks that aren't in label/value tables (overview tab)."""
    h1 = soup.find("h1")
    if h1:
        add("Pavadinimas", h1.get_text(" ", strip=True))
    add("Kreditavimo rizika", text_after(soup, "Kreditavimo rizika:"))
    slog = soup.find(string=lambda t: t and "strateginis partneris" in t)
    if slog:
        add("Šūkis", slog.strip())
    add("Veiklos sritys", text_after(soup, "Veiklos sritys"))
    add("Įmonės aprašymas", text_after(soup, "Įmonės aprašymas"))


def label_value_rows(soup, add):
    """2/3-column <table> rows: label | value (skip FX widget & finances grid)."""
    for t in soup.find_all("table"):
        cls = " ".join(t.get("class") or [])
        if "currencies-table" in cls or "finances-table" in cls:
            continue
        for tr in t.find_all("tr"):
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
            cells = [c for c in cells if c != ""]
            if len(cells) < 2:
                continue
            label, value = cells[0], " ".join(cells[1:])
            if label == "Įvertinimas":
                m = re.search(r"(\d+\s*/\s*10).*?įvertino\s*(\d+)", value)
                if m:
                    value = f"{m.group(1)} (įvertino {m.group(2)})"
            add(label, value)


def finances_grid(soup, add):
    """Finansai metric × year grid -> '<metric> <year>' -> value rows."""
    t = soup.find("table", class_="finances-table")
    if not t:
        return
    trs = t.find_all("tr")
    if not trs:
        return
    head = [c.get_text(" ", strip=True) for c in trs[0].find_all(["th", "td"])]
    years = [h for h in head[1:] if re.fullmatch(r"\d{4}", h)]
    for tr in trs[1:]:
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
        if len(cells) < 2:
            continue
        metric = clean(cells[0])
        vals = cells[1:]
        for i, year in enumerate(years):
            if i < len(vals) and clean(vals[i]):
                add(f"{metric} {year}", vals[i])


# Highcharts series key -> LT label for the CSV.
SERIES_LABEL = {
    "salesRevenue": "Pardavimo pajamos (grafikas)",
    "profitBeforeTaxes": "Pelnas prieš mokesčius (grafikas)",
    "netProfit": "Grynasis pelnas (grafikas)",
    "vmiDebt": "Skola VMI",
    "sodraDebt": "Skola Sodrai",
    "__employees__": "Darbuotojų skaičius (grafikas)",
}


def _ts_to_label(ms, daily):
    """Epoch-ms -> 'YYYY-MM-DD' for dated snapshots, 'YYYY' for annual series."""
    try:
        d = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
        return d.strftime("%Y-%m-%d") if daily else d.strftime("%Y")
    except Exception:
        return str(ms)


def chart_series(html, add):
    """Extract the Highcharts time-series embedded as JSON.parse('...') blobs —
    the data behind the diagrams that the tables/prose don't expose."""
    for m in re.finditer(r"JSON\.parse\('((?:[^'\\]|\\.)*)'\)", html):
        try:
            obj = json.loads(m.group(1).encode("utf-8").decode("unicode_escape"))
        except Exception:
            continue

        # A bare array is the employees headcount series on the Darbuotojai tab.
        named = obj if isinstance(obj, dict) else {"__employees__": obj}
        for key, pts in named.items():
            if not isinstance(pts, list) or not pts:
                continue
            if not all(isinstance(p, list) and len(p) == 2 for p in pts):
                continue
            label = SERIES_LABEL.get(key, key)
            # Debt + headcount are dated snapshots (use full date so points don't
            # collide); financials are annual (year is enough).
            daily = key in ("vmiDebt", "sodraDebt", "__employees__")
            for ts, val in pts:
                if val is None:
                    continue  # no value recorded at this date
                lbl = _ts_to_label(ts, daily)
                # debt values are floats (eur); financials are ints
                v = f"{val} €" if key in ("salesRevenue", "profitBeforeTaxes",
                                           "netProfit", "vmiDebt", "sodraDebt") else str(val)
                add(f"{label} {lbl}", v)


def prose_facts(soup, add):
    """Headcount / debt sentences that live in text, not tables."""
    body = soup.get_text(" ", strip=True)
    body = re.sub(r"\s+", " ", body.replace("\xa0", " "))

    m = re.search(r"dirbo\s+(\d[\d ]*)\s+darbuotoj", body)
    if m:
        add("Darbuotojų (apdraustųjų) skaičius", m.group(1).strip())
    m = re.search(r"Metinis darbuotojų vidurkis yra\s+([\d ,]+)\s*\(\s*([+\-]?\d+%)", body)
    if m:
        add("Metinis darbuotojų vidurkis", f"{m.group(1).strip()} ({m.group(2)})")

    m = re.search(r"Registruotos skolos\s*[–-]\s*(Turi|NETURI[^.]*)", body)
    if m:
        add("Registruotos skolos", clean(m.group(1)))
    m = re.search(r"\(?\s*(\d+)\s+įraš[aių]+\s*\)?\s*nuo\s+(\d{4}-\d{2}-\d{2})", body)
    if m:
        add("Skolų pokyčių įrašai", f"{m.group(1)} įrašai nuo {m.group(2)}")
    m = re.search(r"įmonė yra\s+(neskolinga|skolinga)\s+bendrovei\s+([\w\s,\.\"„“]+?)\s*\.", body)
    if m:
        add("Kreditingumas (Juris LT)", f"{m.group(1)} — {clean(m.group(2))}")


def parse_tab(key, path):
    html = open(path, encoding="utf-8").read()
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    seen = set()

    def add(field, value):
        value = clean(value)
        if not value:
            return
        k = (field, value)
        if k in seen:
            return
        seen.add(k)
        rows.append((TAB_LABEL.get(key, key), field, value))

    if key == "imone":
        overview_facts(soup, add)
        label_value_rows(soup, add)
    elif key == "finansai":
        finances_grid(soup, add)
        chart_series(html, add)
        label_value_rows(soup, add)
    elif key in ("darbuotojai", "skolos"):
        prose_facts(soup, add)
        chart_series(html, add)
        label_value_rows(soup, add)
    return rows


SHEETS_JSON = os.path.join(ROOT, "data", "sheets_data.json")
REK_TABS_JSON = os.path.join(ROOT, "data", "rek_tabs.json")


def drop_rek_from_sheets():
    """Remove the old combined 'Rek' sheet from the Data Explorer's
    sheets_data.json — Rek now lives in its own top-level page."""
    if not os.path.exists(SHEETS_JSON):
        return
    with open(SHEETS_JSON, encoding="utf-8") as f:
        sheets = json.load(f)
    if "Rek" in sheets:
        del sheets["Rek"]
        with open(SHEETS_JSON, "w", encoding="utf-8") as f:
            json.dump(sheets, f, ensure_ascii=False)
        print("  removed stale 'Rek' sheet from sheets_data.json")


def write_rek_tabs(final_rows):
    """Write one field/value sheet per scraped tab to rek_tabs.json — the data
    behind the new Rekvizitai page (one sub-tab per source tab). The CSV stays
    SSOT; this is the per-tab view of the same rows."""
    order, tabs = [], {}
    for tab, field, value in final_rows:
        if tab not in tabs:
            tabs[tab] = {"columns": ["field", "value"], "rows": []}
            order.append(tab)
        tabs[tab]["rows"].append([field, value])
    payload = {"order": order, "tabs": tabs}
    with open(REK_TABS_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    counts = ", ".join(f"{t}:{len(tabs[t]['rows'])}" for t in order)
    print(f"  wrote rek_tabs.json ({counts})")


def main():
    if not os.path.isdir(RAW_DIR):
        sys.exit(f"No {RAW_DIR} — run scripts/scrape_6_vijos.py first.")

    all_rows = []
    for key in ["imone", "finansai", "darbuotojai", "skolos"]:
        path = os.path.join(RAW_DIR, f"6_vijos_{key}.html")
        if not os.path.exists(path):
            print(f"  (skip {key}: no file)")
            continue
        tab_rows = parse_tab(key, path)
        all_rows.extend(tab_rows)
        print(f"  {TAB_LABEL.get(key, key):12} -> {len(tab_rows)} fields")

    # Global de-dup on (field, value): the same contact/code appears on every
    # tab's header; keep the first (overview) occurrence only.
    seen, final = set(), []
    for tab, field, value in all_rows:
        if (field, value) in seen:
            continue
        seen.add((field, value))
        final.append((tab, field, value))

    # CSV: flat field,value (tab column dropped). Rows stay grouped by tab order.
    with open(OUT, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["field", "value"])
        w.writerows((field, value) for _tab, field, value in final)

    write_rek_tabs(final)
    drop_rek_from_sheets()

    print(f"\nExtracted {len(final)} fields across {len(set(r[0] for r in final))} tabs -> {os.path.relpath(OUT)}\n")
    cur = None
    for tab, field, value in final:
        if tab != cur:
            print(f"\n[{tab}]")
            cur = tab
        v = value if len(value) <= 70 else value[:67] + "..."
        print(f"  {field:34} | {v}")


if __name__ == "__main__":
    main()
