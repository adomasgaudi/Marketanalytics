#!/usr/bin/env python3
"""Batch-scrape many rekvizitai.vz.lt companies in one run. Built to scale to 100+.

    # by company name(s) — resolves the slug via rekvizitai's search API:
    python3 scripts/scrape_batch.py "Adface, UAB" "Adverum, UAB" "ALL CAPS, UAB"

    # or from a file (one company name OR slug per line, '#' comments allowed):
    python3 scripts/scrape_batch.py --file data/companies.txt

    # already know the slugs? skip resolution:
    python3 scripts/scrape_batch.py --slugs adface ad_verum all_caps

Pipeline per run (one browser for everything):
  1. resolve each name -> slug via GET /api/public/text-search/<name>
  2. scrape all tabs for every slug (scrape_company.scrape_many)
  3. parse each into a company block (parse_company.parse_one) and upsert into
     data/rek_tabs.json
  4. print a summary; then rebuild:  python3 src/build_site.py

This is the fast path: name->slug is a single JSON call, scraping reuses one
browser with domcontentloaded + asset blocking, and parsing/upsert is in-process
(no per-company subprocess). Re-running a slug refreshes just that company.
"""
import asyncio, json, os, sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from playwright.async_api import async_playwright
import scrape_company as SC
import parse_company as PC


async def resolve_slug(page, name):
    """name -> {slug,name,registerNumber} via the search API, or None."""
    try:
        res = await page.evaluate("""async (q) => {
            const r = await fetch('/api/public/text-search/'+encodeURIComponent(q),
                                  {headers:{'Accept':'application/json'}});
            return await r.text();
        }""", name)
        data = json.loads(res)
        items = data.get("data") or []
        return items[0] if items else None
    except Exception:
        return None


async def resolve_all(names):
    """Resolve a list of company names to slugs (one browser, same-origin XHR)."""
    out = []  # (slug, requested_name, resolved_name)
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page()
        await pg.goto("https://rekvizitai.vz.lt/", wait_until="domcontentloaded", timeout=30000)
        for nm in names:
            hit = await resolve_slug(pg, nm)
            if hit and hit.get("slug"):
                out.append((hit["slug"], nm, hit.get("name", nm)))
                print(f"  resolved  {nm!r:32} -> {hit['slug']}  ({hit.get('name')})")
            else:
                print(f"  NOT FOUND {nm!r}")
        await b.close()
    return out


def read_file(path):
    items = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.split("#", 1)[0].strip()
            if line:
                items.append(line)
    return items


def looks_like_slug(s):
    # slugs are lowercase letters/digits/underscores, no spaces/commas
    return s == s.lower() and " " not in s and "," not in s


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)

    direct_slugs = []
    names = []
    if "--slugs" in args:
        direct_slugs = args[args.index("--slugs") + 1:]
    elif "--file" in args:
        items = read_file(args[args.index("--file") + 1])
        for it in items:
            (direct_slugs if looks_like_slug(it) else names).append(it)
    else:
        for it in args:
            (direct_slugs if looks_like_slug(it) else names).append(it)

    # 1. resolve names -> slugs
    resolved = []  # (slug, display_or_None)
    if names:
        print("Resolving names via search API:")
        resolved = asyncio.run(resolve_all(names))
    slugs = [s for s, *_ in resolved] + direct_slugs
    slugs = list(dict.fromkeys(slugs))  # de-dup, keep order
    if not slugs:
        sys.exit("No slugs to scrape.")

    # 2. scrape all
    print(f"\nScraping {len(slugs)} compan{'y' if len(slugs)==1 else 'ies'}: {', '.join(slugs)}")
    ok = asyncio.run(SC.scrape_many(slugs))

    # 3. parse + upsert each
    print("\nParsing:")
    done = []
    for slug in ok:
        block = PC.parse_one(slug, quiet=True)
        if not block:
            print(f"  {slug}: no data parsed"); continue
        PC.upsert_company(block)
        done.append(block)
        print(f"  {block['name']:34} brand={str(block['brand']):12} {block['_count']} fields")

    # 4. summary
    print(f"\n=== Done: {len(done)}/{len(slugs)} companies into data/rek_tabs.json ===")
    if len(ok) < len(slugs):
        print("   missing (scrape failed):", ", ".join(s for s in slugs if s not in ok))
    print("   rebuild with:  python3 src/build_site.py")


if __name__ == "__main__":
    main()
