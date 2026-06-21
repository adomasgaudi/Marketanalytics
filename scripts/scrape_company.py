#!/usr/bin/env python3
"""Scrape rekvizitai.vz.lt companies — all data tabs. Fast, reusable, batchable.

    python3 scripts/scrape_company.py <slug> [<slug> ...]
    e.g. python3 scripts/scrape_company.py adface ad_verum all_caps

<slug> is the path segment in https://rekvizitai.vz.lt/imone/<slug>/. Each
company page is split across separate tab URLs (not in-page panels); we visit
each and save its rendered HTML to data/raw/<slug>_<tab>.html. Then run
parse_company.py <slug> to extract it into data/rek_tabs.json.

Speed notes (matters at 100 companies):
  - one browser reused for every slug+tab (no per-company launch)
  - wait_until='domcontentloaded', NOT 'networkidle' — ad/tracker requests on
    these pages never go idle, so networkidle always burned the full 45s timeout
  - images / fonts / media / ad hosts are blocked at the network layer
  - the data we want (label tables + the Highcharts JSON.parse blobs) is already
    in the HTML after DOMContentLoaded; a short settle wait covers late inlining
"""
import asyncio, os, sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from playwright.async_api import async_playwright

TABS = {
    "imone":        "/",                      # Įmonė (overview)
    "finansai":     "/apyvarta/",             # Finansai (statement + chart series)
    "darbuotojai":  "/darbuotoju-skaicius/",  # Darbuotojai (headcount)
    "skolos":       "/skolos/",               # Skolos (VMI/Sodra debt history)
    "ataskaitos":   "/ataskaita/",            # Ataskaitos (paywall — kept for completeness)
}

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "raw")
BLOCK_TYPES = {"image", "media", "font"}


async def _route(route):
    if route.request.resource_type in BLOCK_TYPES:
        await route.abort()
    else:
        await route.continue_()


async def _fetch_tab(context, slug, key, path):
    """Open a page, save one tab's HTML, close it. Returns (key, byte size)."""
    url = f"https://rekvizitai.vz.lt/imone/{slug}{path}"
    page = await context.new_page()
    await page.route("**/*", _route)
    size = 0
    try:
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(1.2)  # let inline chart JSON / late nodes settle
        except Exception as e:
            print(f"   ! [{slug}/{key}] {str(e)[:45]}; saving partial")
        html = await page.content()
        with open(os.path.join(OUT_DIR, f"{slug}_{key}.html"), "w", encoding="utf-8") as f:
            f.write(html)
        size = len(html)
    finally:
        await page.close()
    return key, size


async def scrape_slug(context, slug):
    """Fetch all of a company's tabs concurrently. Returns overview byte size."""
    results = await asyncio.gather(*[
        _fetch_tab(context, slug, key, path) for key, path in TABS.items()
    ])
    return dict(results).get("imone", 0)


async def scrape_many(slugs, company_workers=3):
    """Scrape every slug reusing one browser. Tabs of a company load in parallel;
    up to `company_workers` companies are processed concurrently."""
    os.makedirs(OUT_DIR, exist_ok=True)
    ok = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        sem = asyncio.Semaphore(company_workers)
        done = 0

        async def one(i, slug):
            nonlocal done
            async with sem:
                size = await scrape_slug(context, slug)
                done += 1
                if size:
                    ok.append(slug)
                    print(f"[{done}/{len(slugs)}] {slug} ok (overview {size} bytes)", flush=True)
                else:
                    print(f"[{done}/{len(slugs)}] {slug} ! no overview HTML", flush=True)

        await asyncio.gather(*[one(i, s) for i, s in enumerate(slugs, 1)])
        await browser.close()
    return ok


if __name__ == "__main__":
    slugs = sys.argv[1:]
    if not slugs:
        sys.exit("usage: python3 scripts/scrape_company.py <slug> [<slug> ...]")
    done = asyncio.run(scrape_many(slugs))
    print(f"\n=== Scraped {len(done)}/{len(slugs)}. "
          f"Next: python3 scripts/parse_company.py <slug> (or use scrape_batch.py) ===")
