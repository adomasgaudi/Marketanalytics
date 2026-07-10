#!/usr/bin/env python3
"""Auto-scrape: bring data/rek_tabs.json up to parity with data/data.json.

    python3 scripts/autoscrape.py            # scrape every brand that has no block
    python3 scripts/autoscrape.py --dry-run  # just list what is missing
    python3 scripts/autoscrape.py --only Convo "PR service"

The dashboard's brand list (data/data.json) is the source of truth for *which*
companies exist; rek_tabs.json is the scraped detail for each. Adding a brand
used to mean hand-running scrape_company + parse_company per slug, after
hand-finding the slug — rekvizitai slugs are historical registry names
(Fabula -> viesuju_rysiu_partneriai), so they cannot be derived from the brand.

This closes the loop: diff the two files, resolve each missing brand's slug via
the site's search API, scrape its tabs, parse it, and write rek_tabs.json ONCE
at the end. One browser, one Cloudflare check (see browser_session.py).

The brand is passed to the parser explicitly, so a company whose registry name
looks nothing like its brand still lands under the right brand rather than None.
"""
import asyncio
import json
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(HERE)

import browser_session as BS
import parse_company as PC
import scrape_company as SC

DATA = os.path.join(ROOT, "data", "data.json")
REK = os.path.join(ROOT, "data", "rek_tabs.json")


def load():
    data = json.load(open(DATA, encoding="utf-8"))
    rek = json.load(open(REK, encoding="utf-8"))
    return data, rek


def missing_brands(data, rek):
    """[(brand, company_name)] for brands with no scraped block yet.

    `company` (the registered name, e.g. 'Fotokomanda, UAB') is what we hand to
    the search API — the brand ('Foko') often is not the registered name."""
    have = {c.get("brand") for c in rek["companies"] if c.get("brand")}
    seen, out = set(), []
    for r in data:
        b = r.get("brand")
        if not b or b in have or b in seen:
            continue
        seen.add(b)
        out.append((b, r.get("company") or b))
    return sorted(out)


async def run(targets):
    """targets: [(brand, company_name)] -> [(brand, slug)] actually scraped."""
    async with BS.session() as ctx:
        if not await BS.ensure_clearance(ctx):
            return []

        page = await ctx.new_page()
        await page.goto(BS.BASE + "/", wait_until="domcontentloaded", timeout=45000)
        pairs = []  # (brand, slug)
        print("\nResolving slugs:")
        for brand, company in targets:
            hit = await BS.text_search(page, company)
            if not hit and company != brand:
                hit = await BS.text_search(page, brand)
            if hit and hit.get("slug"):
                pairs.append((brand, hit["slug"]))
                print(f"  {brand:22} -> {hit['slug']}  ({hit.get('name')})", flush=True)
            else:
                print(f"  {brand:22} -> NOT FOUND on rekvizitai", flush=True)
        await page.close()
        if not pairs:
            return []

        print(f"\nScraping {len(pairs)} companies:")
        ok = set(await SC.scrape_with_context(ctx, [s for _, s in pairs]))
        return [(b, s) for b, s in pairs if s in ok]


def parse_and_write(pairs):
    """Parse each scraped slug and write rek_tabs.json once (an upsert per
    company rewrites the whole 1.5 MB file each time — O(n^2) for no reason)."""
    _, rek = load()
    blocks = {c["slug"]: c for c in rek["companies"]}
    added = []
    print("\nParsing:")
    for brand, slug in pairs:
        block = PC.parse_one(slug, brand_override=brand, quiet=True)
        if not block:
            print(f"  {slug:34} no data parsed")
            continue
        count = block.pop("_count", 0)
        blocks[slug] = block
        added.append((brand, slug, count))
        print(f"  {block['name']:34} brand={brand:16} {count} fields", flush=True)

    out = sorted(blocks.values(), key=lambda b: (b.get("name") or b["slug"]).lower())
    old_payload = json.load(open(REK, encoding="utf-8"))
    payload = {"companies": out}
    from data_events import write_rek_payload
    write_rek_payload(payload, trigger="autoscrape.py", old_payload=old_payload)
    return added, len(out)


def main():
    args = sys.argv[1:]
    data, rek = load()

    if "--only" in args:
        wanted = set(args[args.index("--only") + 1:])
        by_brand = {b: c for b, c in missing_brands(data, rek)}
        # --only may name a brand that is already scraped: allow a re-scrape.
        name_of = {r["brand"]: r.get("company") or r["brand"] for r in data if r.get("brand")}
        targets = [(b, by_brand.get(b, name_of.get(b, b))) for b in sorted(wanted)]
    else:
        targets = missing_brands(data, rek)

    if not targets:
        print("Nothing missing — every data.json brand has a rek_tabs.json block.")
        return

    print(f"{len(targets)} brand(s) without scraped data:")
    for b, c in targets:
        print(f"  - {b}  ({c})")
    if "--dry-run" in args:
        return

    pairs = asyncio.run(run(targets))
    if not pairs:
        print("\nNothing scraped — rek_tabs.json untouched.")
        return

    added, total = parse_and_write(pairs)
    got = {b for b, *_ in added}
    print(f"\n===== AUTOSCRAPE REPORT =====")
    print(f"requested {len(targets)}, scraped {len(added)}, companies now {total}")
    if len(added) < len(targets):
        print("still missing:", ", ".join(b for b, _ in targets if b not in got))
    print("rebuild with:  python3 src/build_site.py")


if __name__ == "__main__":
    main()
