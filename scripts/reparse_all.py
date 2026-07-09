#!/usr/bin/env python3
"""Re-parse every already-scraped company from data/raw/ into data/rek_tabs.json
with the current parse_company extractors. Preserves each company's existing
brand; parses in memory and writes the combined JSON ONCE at the end (upserting
one-by-one rewrites the 1.5 MB file per company = O(n^2)). Prints a before/after
field-count report so the extraction gain is measurable, not asserted."""
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import parse_company as PC

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REK = os.path.join(ROOT, "data", "rek_tabs.json")


def fields(block):
    return sum(len(t["rows"]) for t in block["tabs"].values())


def main():
    cur = json.load(open(REK, encoding="utf-8"))
    brand_of = {c["slug"]: c.get("brand") for c in cur["companies"]}
    cur_map = {c["slug"]: fields(c) for c in cur["companies"]}
    base_tot = sum(cur_map.values())

    slugs = sorted({os.path.basename(p)[: -len("_imone.html")]
                    for p in glob.glob(os.path.join(ROOT, "data", "raw", "*_imone.html"))})

    blocks = []
    for i, s in enumerate(slugs, 1):
        blk = PC.parse_one(s, brand_override=brand_of.get(s), quiet=True)
        if blk:
            blk.pop("_count", None)
            blocks.append(blk)
        print(f"[{i}/{len(slugs)}] {s}: {fields(blk) if blk else 0}", flush=True)

    blocks.sort(key=lambda b: (b.get("name") or b.get("slug") or "").lower())
    json.dump({"companies": blocks}, open(REK, "w", encoding="utf-8"), ensure_ascii=False)

    after_map = {b["slug"]: fields(b) for b in blocks}
    after_tot = sum(after_map.values())
    gains = sorted(((after_map[s] - cur_map.get(s, 0), s) for s in after_map), reverse=True)
    print("\n===== REPARSE REPORT =====")
    print(f"companies: {len(cur['companies'])} -> {len(blocks)}")
    print(f"total fields: {base_tot} -> {after_tot}   +{after_tot - base_tot} "
          f"(+{100 * (after_tot - base_tot) / base_tot:.1f}%)")
    print(f"companies gaining >=1 field: {sum(1 for d, _ in gains if d > 0)}/{len(after_map)}")
    print("top gains:", [f"{s}+{d}" for d, s in gains[:8]])


if __name__ == "__main__":
    main()
