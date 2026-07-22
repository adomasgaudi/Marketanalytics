#!/usr/bin/env python3
"""Upsert selected Rekvizitai+Sodra companies into data/data.json.

This bridges the scraped Rekvizitai company tabs with yearly dashboard records.
It uses:
  - data/rek_tabs.json for company identity, turnover, profit, risk, address
  - data/sodra/<slug>.json for yearly average employees and wages

The output rows follow the dashboard's data.json schema. `estimatedIncome` is
left null because Rekvizitai does not expose fee-income / pass-through split.
"""

import json
import os
import re
import sys
from statistics import mean

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_events import load_data, set_provenance, write_data_json, write_rek_payload


ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REK_JSON = os.path.join(ROOT, "data", "rek_tabs.json")
DATA_JSON = os.path.join(ROOT, "data", "data.json")
SODRA_DIR = os.path.join(ROOT, "data", "sodra")

YEARS = list(range(2019, 2026))

TARGETS = {
    "menrida": {"brand": "The Magic", "activities": ["Production house"]},
    "full_screen": {"brand": "FULL SCREEN", "activities": ["Production house"]},
    "etikete": {"brand": "Etiquette", "activities": ["Kūryba"]},
    "omd": {"brand": "OMD", "activities": ["Media"]},
    "andstudio": {"brand": "Andstudio", "activities": ["Kūryba"]},
    "brainhouse": {"brand": "Brainhouse", "activities": ["Renginiai"]},
    "salve_agency": {"brand": "Salve Agency", "activities": ["Konsultantai"]},
    "uab_nova_media_lt": {"brand": "Nova media", "activities": ["Media"]},
    "uab_publicum_financial_communications": {
        "brand": "Fcomm",
        "activities": ["PR"],
    },
    "stebink": {"brand": "Stebink", "activities": ["Digital media"]},
    "younique_studio": {"brand": "Younique studio", "activities": ["Kūryba"]},
    "one_event": {"brand": "One event", "activities": ["Renginiai"]},
    "agency_up": {"brand": "AgencyUP", "activities": ["Renginiai"]},
    "propeller": {"brand": "Propeller", "activities": ["Renginiai"]},
    "360_sportas": {"brand": "360 Sportas", "activities": ["Renginiai"]},
    "momento_lt": {"brand": "Momento LT", "activities": ["Renginiai"]},
    "renginio_efektas": {"brand": "Renginio efektas", "activities": ["Renginiai"]},
    "pirmoji_kava": {"brand": "Pirmoji Kava", "activities": ["Renginiai"]},
    "elitaz_grupe": {"brand": "ELITAZ Grupė", "activities": ["Renginiai"]},
}


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, payload):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)


def parse_money(text):
    if text is None:
        return None
    s = str(text).replace("€", "").replace(" ", "").replace("\xa0", "").strip()
    if not s:
        return None
    s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def rows_to_fields(block):
    out = {}
    for tab in block.get("tabs", {}).values():
        for field, value in tab.get("rows", []):
            out[field] = value
    return out


def extract_company_code(fields):
    for field, value in fields.items():
        low = field.lower()
        if "kodas" in low and "pvm" not in low:
            return str(value).strip()
    return None


def extract_city(address):
    if not address:
        return ""
    clean = re.sub(r"LT-\d{5}", "", str(address))
    parts = [p.strip() for p in clean.split(",") if p.strip()]
    if not parts:
        return ""
    tail = parts[-1]
    for city in ("Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"):
        if city in tail:
            return city
    return tail


def collect_financial_series(block):
    fields = rows_to_fields(block)
    revenue = {}
    profit = {}

    for field, value in fields.items():
        m = re.match(r"^Pardavimo pajamos (\d{4})$", field)
        if m:
            revenue[int(m.group(1))] = parse_money(value)
            continue
        m = re.match(r"^Grynasis pelnas \(nuostoliai\) (\d{4})$", field)
        if m:
            profit[int(m.group(1))] = parse_money(value)
            continue

        m = re.match(r"^Pardavimo pajamos \(grafikas\) (\d{4})$", field)
        if m:
            year = int(m.group(1)) + 1
            revenue.setdefault(year, parse_money(value))
            continue
        m = re.match(r"^Grynasis pelnas \(grafikas\) (\d{4})$", field)
        if m:
            year = int(m.group(1)) + 1
            profit.setdefault(year, parse_money(value))
            continue

    return revenue, profit


def load_sodra(slug):
    path = os.path.join(SODRA_DIR, f"{slug}.json")
    if not os.path.exists(path):
        return []
    return load_json(path).get("months", [])


def annual_sodra(months, year):
    items = [m for m in months if int(m.get("month", 0)) // 100 == year]
    if not items:
        return 0.0, 0.0
    employees = round(mean(float(m.get("numInsured") or 0) for m in items), 0)
    wages = [float(m["avgWage"]) for m in items if m.get("avgWage") is not None]
    avg_salary = round(mean(wages), 0) if wages else 0.0
    return float(employees), float(avg_salary)


def upsert_data_rows(new_rows):
    data = load_data()
    brands = {row["brand"] for row in new_rows}
    data = [row for row in data if row.get("brand") not in brands]
    data.extend(new_rows)
    data.sort(key=lambda row: (row["brand"].lower(), row["year"]))
    return data


def update_rek_brands(rek_payload):
    blocks = {block["slug"]: block for block in rek_payload["companies"]}
    for slug, meta in TARGETS.items():
        if slug in blocks:
            blocks[slug]["brand"] = meta["brand"]
    rek_payload["companies"] = sorted(
        blocks.values(), key=lambda block: (block.get("name") or block.get("slug") or "").lower()
    )
    return rek_payload


def main():
    rek = load_json(REK_JSON)
    blocks = {block["slug"]: block for block in rek["companies"]}
    new_rows = []

    for slug, meta in TARGETS.items():
        block = blocks.get(slug)
        if not block:
            raise SystemExit(f"Missing rek block for {slug}")

        fields = rows_to_fields(block)
        company = block["name"]
        brand = meta["brand"]
        code = extract_company_code(fields)
        revenue, profit = collect_financial_series(block)
        sodra_months = load_sodra(slug)
        city = extract_city(fields.get("Adresas"))
        risk = fields.get("Kredito rizika") or fields.get("Kreditavimo rizika") or ""

        for year in YEARS:
            employees, avg_salary = annual_sodra(sodra_months, year)
            revenue_value = revenue.get(year, 0.0)
            profit_value = profit.get(year, 0.0)
            salary_costs = float(avg_salary * employees * 12) if (avg_salary or employees) else 0.0
            non_salary_costs = (
                float(revenue_value - profit_value - salary_costs)
                if revenue_value is not None and profit_value is not None
                else None
            )

            row = {
                    "company": company,
                    "brand": brand,
                    "year": year,
                    "activities": meta["activities"],
                    "city": city,
                    "risk": risk,
                    "employees": float(employees),
                    "avgSalary": float(avg_salary),
                    "salaryCosts": float(salary_costs),
                    "revenue": float(revenue_value) if revenue_value is not None else None,
                    "profit": float(profit_value) if profit_value is not None else None,
                    "nonSalaryCosts": non_salary_costs,
                    "estimatedIncome": None,
                }
            if city:
                set_provenance(row, "city", "rekvizitai")
            if risk:
                set_provenance(row, "risk", "rekvizitai")
            if revenue_value is not None:
                set_provenance(row, "revenue", "rekvizitai")
            if profit_value is not None:
                set_provenance(row, "profit", "rekvizitai")
            if employees or avg_salary:
                set_provenance(row, "employees", "sodra")
                set_provenance(row, "avgSalary", "sodra")
            if salary_costs:
                set_provenance(row, "salaryCosts", "derived")
            if non_salary_costs is not None:
                set_provenance(row, "nonSalaryCosts", "derived")
            new_rows.append(row)

        print(f"{slug:34} -> {brand:24} code={code} rows=7")

    old_rek = load_json(REK_JSON)
    rek = update_rek_brands(old_rek)
    write_rek_payload(rek, trigger="import_rek_companies.py", old_payload=old_rek)

    old_data = load_data()
    payload = upsert_data_rows(new_rows)
    write_data_json(payload, trigger="import_rek_companies.py", old_rows=old_data,
                    summary_label="Initial")
    print(f"Updated {len(new_rows)} rows; data.json now has {len(payload)} records")


if __name__ == "__main__":
    main()
