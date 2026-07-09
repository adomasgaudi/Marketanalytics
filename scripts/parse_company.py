#!/usr/bin/env python3
"""Parse one scraped rekvizitai company into data/rek_tabs.json.

    python3 scripts/parse_company.py <slug> [--brand "<data.json brand>"]
    e.g. python3 scripts/parse_company.py adell_reklama --brand Ogilvy

Reads data/raw/<slug>_<tab>.html (from scrape_company.py) and upserts a company
block into the combined data/rek_tabs.json:

    {"companies": [
       {"slug","name","brand","order":[tab...],"tabs":{tab:{columns,rows}}},
       ...
    ]}

`brand` is the matching brand in data/data.json so the Rekvizitai page can merge
the scrape with the dashboard's own record. It is auto-detected from the scraped
company name when possible; pass --brand to override.

Per tab we run whichever extractors fit (label/value rows, the Finansai metric ×
year grid, the Highcharts time-series behind the diagrams, and prose facts).
The Ataskaitos tab is a paywall with no free data — skipped.
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
REK_TABS_JSON = os.path.join(ROOT, "data", "rek_tabs.json")
SHEETS_JSON = os.path.join(ROOT, "data", "sheets_data.json")
DATA_JSON = os.path.join(ROOT, "data", "data.json")

TAB_LABEL = {"imone": "Įmonė", "finansai": "Finansai",
             "darbuotojai": "Darbuotojai", "skolos": "Skolos"}

# Generic UI chrome that leaks into values (company-name part is added per run).
BASE_NOISE = [
    "Susisiekti el. paštu", "Uždaryti", "Plačiau ›", "Darbuotojų pokytis ›",
    "Atlyginimų istorija ›", "Žiūrėti kontaktus »", "Žiūrėti kontaktus",
    "Pildyti paraišką", "Siųsti",
]
NOISE = list(BASE_NOISE)  # extended at runtime with company-specific strings


def clean(s):
    s = re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip()
    # strip a trailing "... iš „X“ Pildyti paraišką" loan promo if present
    s = re.sub(r"\s*Galimas paskolos dydis.*$", "", s)
    changed = True
    while changed:
        changed = False
        for n in NOISE:
            n = re.sub(r"\s+", " ", n.replace("\xa0", " ")).strip()
            if n and s.endswith(n):
                s = s[: -len(n)].strip(); changed = True
    return s.strip()


def is_junk(v):
    """Reject values that are pure chrome / empty after cleaning."""
    return not v or v in ("»", "›", "-", "—")


def text_after(soup, label):
    el = soup.find(string=lambda t: t and label in t)
    if not el:
        return None
    sib = el.parent.find_next_sibling()
    return clean(sib.get_text(" ", strip=True)) if sib else None


def overview_facts(soup, add):
    h1 = soup.find("h1")
    name = h1.get_text(" ", strip=True) if h1 else None
    if name:
        add("Pavadinimas", name)
    add("Kreditavimo rizika", text_after(soup, "Kreditavimo rizika:"))
    add("Veiklos sritys", text_after(soup, "Veiklos sritys"))
    # Company description, only if it's real prose (not a "Žiūrėti kontaktus" stub).
    desc = text_after(soup, "Įmonės aprašymas")
    if desc and len(desc) > 25 and "kontakt" not in desc.lower():
        add("Įmonės aprašymas", desc)


def label_value_rows(soup, add):
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
                m = re.search(r"([\d.,]+\s*/\s*10).*?įvertino\s*([\d ]+)", value)
                if m:
                    value = f"{m.group(1)} (įvertino {m.group(2).strip()})"
            add(label, value)


def finances_grid(soup, add):
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


SERIES_LABEL = {
    "salesRevenue": "Pardavimo pajamos (grafikas)",
    "profitBeforeTaxes": "Pelnas prieš mokesčius (grafikas)",
    "netProfit": "Grynasis pelnas (grafikas)",
    "vmiDebt": "Skola VMI", "sodraDebt": "Skola Sodrai",
    "__employees__": "Darbuotojų skaičius (grafikas)",
}


def _ts_to_label(ms, daily):
    try:
        d = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
        return d.strftime("%Y-%m-%d") if daily else d.strftime("%Y")
    except Exception:
        return str(ms)


def chart_series(html, add):
    for m in re.finditer(r"JSON\.parse\('((?:[^'\\]|\\.)*)'\)", html):
        try:
            obj = json.loads(m.group(1).encode("utf-8").decode("unicode_escape"))
        except Exception:
            continue
        named = obj if isinstance(obj, dict) else {"__employees__": obj}
        for key, pts in named.items():
            if not isinstance(pts, list) or not pts:
                continue
            if not all(isinstance(p, list) and len(p) == 2 for p in pts):
                continue
            label = SERIES_LABEL.get(key, key)
            daily = key in ("vmiDebt", "sodraDebt", "__employees__")
            for ts, val in pts:
                if val is None:
                    continue
                lbl = _ts_to_label(ts, daily)
                v = f"{val} €" if key in ("salesRevenue", "profitBeforeTaxes",
                                          "netProfit", "vmiDebt", "sodraDebt") else str(val)
                add(f"{label} {lbl}", v)


def prose_facts(soup, add):
    body = re.sub(r"\s+", " ", soup.get_text(" ", strip=True).replace("\xa0", " "))
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
    # SODRA insurer code (draudėjo kodas) — prose only, no table cell
    m = re.search(r"draudėjo kodas\s+(\d+)", body)
    if m:
        add("SODRA draudėjo kodas", m.group(1))
    # "as-of" freshness stamp for the headcount/debt figures on this tab
    m = re.search(r"(\d{4}-\d{2}-\d{2})\s+dienos\s+(?:pradžioje|duomenimis)", body)
    if m:
        add("Duomenų data", m.group(1))


def info_items(soup, add):
    """Overview headline widgets that live OUTSIDE tables (div.info-item):
    e.g. 'Grynasis pelnas' (latest net profit) and 'Sumokėti mokesčiai'
    (taxes paid). Each is a name/value pair with an optional period in
    span.extra-info; 'Nauja' badges and 'Plačiau ›' links are chrome."""
    for item in soup.select("div.info-item"):
        nm = item.find("div", class_="name")
        val = item.find("div", class_="value")
        if not nm or not val:
            continue
        for badge in nm.select("span.status-new"):
            badge.extract()
        field = clean(nm.get_text(" ", strip=True))
        extra = val.find("span", class_="extra-info")
        period = clean(extra.get_text(" ", strip=True)) if extra else ""
        for junk in val.select("a, span.extra-info, span.status-new"):
            junk.extract()
        value = clean(val.get_text(" ", strip=True))
        if period and period not in value:
            value = f"{value} {period}".strip()
        if field and value:
            add(field, value)


def esg_and_reviews(soup, add):
    """ESG sustainability score (p.certificate-esg__score) and the distinct
    review count (meta[itemprop=reviewCount]) — neither is a table cell."""
    esg = soup.select_one("p.certificate-esg__score")
    if esg:
        add("Tvarumo indeksas", esg.get_text(strip=True))
    mc = soup.select_one('meta[itemprop="reviewCount"]')
    if mc and mc.get("content"):
        add("Atsiliepimų skaičius", mc["content"])


def debt_panels(soup, add):
    """Current debt cards on the Skolos tab (div.debts-panel-item): each has a
    title (Įmonės skola VMI / Sodrai / Kitų įmonių paskelbtos skolos) and one or
    more debt-title/debt-value rows. Emitted as 'Title — debt-title' = value."""
    for panel in soup.select("div.debts-panel-item"):
        t = panel.find(class_="debts-panel-item__title")
        title = clean(t.get_text(" ", strip=True)) if t else ""
        if not title:
            continue
        titles = panel.select("div.debt-title")
        values = panel.select("div.debt-value")
        for dt, dv in zip(titles, values):
            k = clean(dt.get_text(" ", strip=True))
            v = clean(dv.get_text(" ", strip=True))
            if k and v:
                add(f"{title} — {k}", v)


def skolos_widgets(soup, add):
    """Non-table Skolos extras: PreScore creditworthiness class (encoded only in
    the img.credit-risk filename) and the debt-change record count."""
    img = soup.select_one("img.credit-risk")
    if img and img.get("src"):
        m = re.search(r"kreditingumas/(\d+)\.png", img["src"])
        if m:
            add("PreScore kreditingumo klasė", f"{m.group(1)}/10")
    cnt = soup.select_one("h4.debt-heading span.count")
    if cnt:
        add("Skolų pokyčių įrašų skaičius", clean(cnt.get_text()).strip("() "))


def parse_tab(key, path):
    html = open(path, encoding="utf-8").read()
    soup = BeautifulSoup(html, "html.parser")
    rows, seen = [], set()

    def add(field, value):
        value = clean(value)
        if is_junk(value):
            return
        k = (field, value)
        if k in seen:
            return
        seen.add(k)
        rows.append((TAB_LABEL.get(key, key), field, value))

    if key == "imone":
        overview_facts(soup, add)
        label_value_rows(soup, add)
        info_items(soup, add)
        esg_and_reviews(soup, add)
    elif key == "finansai":
        finances_grid(soup, add)
        chart_series(html, add)
        label_value_rows(soup, add)
    elif key in ("darbuotojai", "skolos"):
        prose_facts(soup, add)
        chart_series(html, add)
        label_value_rows(soup, add)
        if key == "skolos":
            debt_panels(soup, add)
            skolos_widgets(soup, add)
    return rows


def company_name(slug):
    """Display name = the scraped <h1> on the overview tab, else the slug."""
    p = os.path.join(RAW_DIR, f"{slug}_imone.html")
    if os.path.exists(p):
        soup = BeautifulSoup(open(p, encoding="utf-8").read(), "html.parser")
        h1 = soup.find("h1")
        if h1:
            return h1.get_text(" ", strip=True)
    return slug


def detect_brand(name):
    """Find the data.json brand whose company string matches the scraped name."""
    if not os.path.exists(DATA_JSON):
        return None
    data = json.load(open(DATA_JSON, encoding="utf-8"))
    base = re.sub(r",?\s*(UAB|MB|AB|VšĮ|IĮ)\.?$", "", name, flags=re.I).strip().lower()
    for d in data:
        comp = re.sub(r",?\s*(UAB|MB|AB|VšĮ|IĮ)\.?$", "", str(d.get("company", "")),
                      flags=re.I).strip().lower()
        if comp and (comp == base or base in comp or comp in base):
            return d.get("brand")
    return None


def upsert_company(block):
    """Insert or replace this company's block in rek_tabs.json (keyed by slug)."""
    payload = {"companies": []}
    if os.path.exists(REK_TABS_JSON):
        try:
            existing = json.load(open(REK_TABS_JSON, encoding="utf-8"))
            if isinstance(existing, dict) and "companies" in existing:
                payload = existing
        except Exception:
            pass
    clean_block = {k: v for k, v in block.items() if not k.startswith("_")}
    companies = [c for c in payload["companies"] if c.get("slug") != block["slug"]]
    companies.append(clean_block)
    # keep companies sorted by name for a stable, predictable picker order
    companies.sort(key=lambda c: (c.get("name") or c.get("slug") or "").lower())
    payload["companies"] = companies
    with open(REK_TABS_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    return payload


def parse_one(slug, brand_override=None, quiet=False):
    """Parse one slug's scraped tabs into a company block dict (no file write).
    Returns the block, or None if no tab HTML was found for the slug."""
    name = company_name(slug)
    # company-specific chrome (e.g. "Susisiekti el. paštu su Adell reklama").
    # NOISE is module-global; reset to base each call so slugs don't leak.
    global NOISE
    NOISE = list(BASE_NOISE)
    short = re.sub(r",?\s*(UAB|MB|AB|VšĮ|IĮ)\.?$", "", name, flags=re.I).strip()
    NOISE.extend([f"Susisiekti el. paštu su {short} Siųsti Uždaryti",
                  f"Susisiekti el. paštu su {short}"])

    all_rows = []
    for key in ["imone", "finansai", "darbuotojai", "skolos"]:
        path = os.path.join(RAW_DIR, f"{slug}_{key}.html")
        if not os.path.exists(path):
            continue
        tr = parse_tab(key, path)
        all_rows.extend(tr)
        if not quiet:
            print(f"    {TAB_LABEL.get(key, key):12} -> {len(tr)} fields")
    if not all_rows:
        return None

    # de-dup (field,value): the same contact/code repeats across tabs' headers
    seen, final = set(), []
    for tab, field, value in all_rows:
        if (field, value) in seen:
            continue
        seen.add((field, value))
        final.append((tab, field, value))

    order, tabs = [], {}
    for tab, field, value in final:
        if tab not in tabs:
            tabs[tab] = {"columns": ["field", "value"], "rows": []}
            order.append(tab)
        tabs[tab]["rows"].append([field, value])

    brand = brand_override or detect_brand(name)
    return {"slug": slug, "name": name, "brand": brand,
            "order": order, "tabs": tabs, "_count": len(final)}


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit("usage: python3 scripts/parse_company.py <slug> [--brand NAME]")
    slug = args[0]
    brand_override = args[args.index("--brand") + 1] if "--brand" in args else None

    block = parse_one(slug, brand_override)
    if not block:
        sys.exit(f"No tab HTML for '{slug}' in {RAW_DIR} — run scrape_company.py first.")
    payload = upsert_company(block)
    print(f"\n{block['name']} (brand={block['brand']}): {block['_count']} fields "
          f"across {len(block['order'])} tabs")
    print(f"rek_tabs.json now holds {len(payload['companies'])} compan"
          f"{'y' if len(payload['companies'])==1 else 'ies'}: "
          + ", ".join(c['slug'] for c in payload['companies']))


if __name__ == "__main__":
    main()
