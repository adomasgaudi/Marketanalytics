#!/usr/bin/env python3
"""Fill the 2025 cost/income fields that rekvizitai's free page doesn't expose.

WHY: the coverage matrix needs 7 metrics for a "Full" year. 2025 ships with
employees + avgSalary (Sodra) and revenue + profit (rekvizitai). The remaining
three are reconstructed with the SAME definitions the rest of data.json uses —
verified against 2019-2024 where these formulas reproduce the stored values
exactly (ratio 1.0000 / 0-error across 480+ records):

    salaryCosts    = avgSalary * employees * 12            # exact, dataset definition
    nonSalaryCosts = revenue - profit - salaryCosts        # exact accounting identity
    estimatedIncome = revenue * feeRatio_brand             # ESTIMATE (see below)

feeRatio_brand = mean of (estimatedIncome / revenue) over the brand's up-to-3
most recent prior years that have both. estimatedIncome (spėjamos pajamos) is
fee income net of pass-through media spend; its share of turnover is strongly
company-specific (BPN ~0.10, Dentsu ~0.14, Fabula ~0.59, most non-media 1.00)
and fairly stable year-to-year, so each brand carries forward its own ratio.
Fallback when a brand has no prior ratio: 0.60 (the all-company median).

salaryCosts/nonSalaryCosts are deterministic (as "real" as any prior year);
estimatedIncome is the only genuine estimate. A field is only written when its
inputs exist (e.g. no revenue -> no nonSalaryCosts/estimatedIncome).

Run AFTER the Sodra (employees/avgSalary) and rekvizitai (revenue/profit) passes:
    python3 scripts/estimate_2025.py    # rebuild the site afterwards
"""
import json, os, statistics, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from data_events import load_data, set_provenance, write_data_json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data", "data.json")
FALLBACK_FEE_RATIO = 0.60
TARGET_YEAR = 2025


def fee_ratio_by_brand(data):
    hist = {}
    for r in data:
        if r["year"] < TARGET_YEAR and r.get("estimatedIncome") is not None and r.get("revenue"):
            hist.setdefault(r["brand"], []).append((r["year"], r["estimatedIncome"] / r["revenue"]))
    ratio = {}
    for b, xs in hist.items():
        recent = [v for _, v in sorted(xs)[-3:]]
        ratio[b] = statistics.mean(recent)
    return ratio


def main():
    data = load_data()
    old_data = json.loads(json.dumps(data))  # snapshot before edits
    fee = fee_ratio_by_brand(data)
    sc_n = nsc_n = ei_n = 0
    for r in data:
        if r["year"] != TARGET_YEAR:
            continue
        emp, sal = r.get("employees"), r.get("avgSalary")
        if emp is not None and sal is not None:
            r["salaryCosts"] = round(sal * emp * 12, 2)
            set_provenance(r, "salaryCosts", "derived")
            sc_n += 1
        rev, prof = r.get("revenue"), r.get("profit")
        if rev is not None and prof is not None and r.get("salaryCosts") is not None:
            r["nonSalaryCosts"] = round(rev - prof - r["salaryCosts"], 2)
            set_provenance(r, "nonSalaryCosts", "derived")
            nsc_n += 1
        if rev is not None:
            r["estimatedIncome"] = round(rev * fee.get(r["brand"], FALLBACK_FEE_RATIO), 1)
            set_provenance(r, "estimatedIncome", "estimated")
            ei_n += 1

    write_data_json(data, trigger="estimate_2025.py", old_rows=old_data, summary_label="Initial")
    print(f"2025 estimates written: salaryCosts={sc_n}, nonSalaryCosts={nsc_n}, estimatedIncome={ei_n}")


if __name__ == "__main__":
    main()
