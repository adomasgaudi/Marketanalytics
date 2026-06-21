#!/usr/bin/env python3
"""Parse 6_vijos_raw.html (scraped from rekvizitai.vz.lt) into rek.csv.

The company page has no <dt>/<dd> pairs — every fact lives in a 2/3-column
<table> row (label | value) plus a few labelled <div>/<h3> blocks. We pull all
of them generically rather than cherry-picking, then drop the one unrelated
widget (the site-wide currency-rate table) and obvious UI chrome.
"""
import csv
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
from bs4 import BeautifulSoup

RAW = "6_vijos_raw.html"
OUT = "rek.csv"

# Value suffixes that are leftover modal/button chrome, not data.
NOISE = [
    "Susisiekti el. paštu su 6 vijos Siųsti Uždaryti",
    "Susisiekti el. paštu",
    "Uždaryti",
    "Plačiau ›",
    "Darbuotojų pokytis ›",
    "Galimas paskolos dydis iki 12\xa0000\xa0€ iš „Noviti Finance“ Pildyti paraišką",
    "Pildyti paraišką",
]


def clean(s: str) -> str:
    """Collapse whitespace and strip trailing UI chrome from a value."""
    s = re.sub(r"\s+", " ", s.replace("\xa0", " ")).strip()
    for n in NOISE:
        n = re.sub(r"\s+", " ", n.replace("\xa0", " ")).strip()
        if s.endswith(n):
            s = s[: -len(n)].strip()
    return s.strip()


def text_after(soup, label, tags=("h2", "h3", "div")):
    """Find an element whose text contains `label`, return its next-sibling text."""
    el = soup.find(string=lambda t: t and label in t)
    if not el:
        return None
    sib = el.parent.find_next_sibling()
    return clean(sib.get_text(" ", strip=True)) if sib else None


def main():
    html = open(RAW, encoding="utf-8").read()
    soup = BeautifulSoup(html, "html.parser")

    rows = []  # (field, value)

    def add(field, value):
        value = clean(value) if value else ""
        if value:
            rows.append((field, value))

    # --- Header facts ---
    h1 = soup.find("h1")
    add("Pavadinimas", h1.get_text(" ", strip=True) if h1 else "")
    add("Kreditavimo rizika", text_after(soup, "Kreditavimo rizika:"))
    slog = soup.find(string=lambda t: t and "strateginis partneris" in t)
    if slog:
        add("Šūkis", slog.strip())
    add("Veiklos sritys", text_after(soup, "Veiklos sritys"))
    add("Įmonės aprašymas", text_after(soup, "Įmonės aprašymas"))

    # --- Every label/value table row (skip the currency widget & chrome) ---
    for t in soup.find_all("table"):
        cls = " ".join(t.get("class") or [])
        if "currencies-table" in cls:
            continue  # site-wide FX rates, not company data
        for tr in t.find_all("tr"):
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
            cells = [c for c in cells if c != ""]  # drop empty icon cells
            if len(cells) >= 2:
                label, value = cells[0], " ".join(cells[1:])
                # Rating cell embeds the 1..10 click-scale; keep only "X / 10 (n votes)".
                if label == "Įvertinimas":
                    m = re.search(r"(\d+\s*/\s*10).*?įvertino\s*(\d+)", value)
                    if m:
                        value = f"{m.group(1)} (įvertino {m.group(2)})"
                add(label, value)

    # --- De-dup, keeping first occurrence ---
    seen, final = set(), []
    for f, v in rows:
        key = (f, v)
        if key in seen:
            continue
        seen.add(key)
        final.append((f, v))

    with open(OUT, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["field", "value"])
        w.writerows(final)

    print(f"Extracted {len(final)} fields -> {OUT}\n")
    for f, v in final:
        v_short = v if len(v) <= 80 else v[:77] + "..."
        print(f"  {f:24} | {v_short}")


if __name__ == "__main__":
    main()
