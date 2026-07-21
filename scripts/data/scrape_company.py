#!/usr/bin/env python3
"""Scrape rekvizitai.vz.lt companies — all data tabs. Fast, reusable, batchable.

    python3 scripts/data/scrape_company.py <slug> [<slug> ...]
    e.g. python3 scripts/data/scrape_company.py adface ad_verum all_caps

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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_session as BS

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
    """Open a page, save one tab's HTML, close it. Returns (key, byte size).

    Retries the whole load until the company <h1> is present and the document is
    substantial — under concurrency, capturing too early returned a 39-byte empty
    shell (<html><head></head><body></body></html>), so we wait for real content."""
    url = f"https://rekvizitai.vz.lt/imone/{slug}{path}"
    page = await context.new_page()
    await page.route("**/*", _route)
    size = 0
    try:
        for attempt in range(3):
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as e:
                print(f"   ! [{slug}/{key}] goto {str(e)[:40]} (try {attempt+1}/3)")
            # the company name <h1> is the signal the real DOM has rendered
            try:
                await page.wait_for_selector("h1", timeout=10000)
            except Exception:
                pass
            await asyncio.sleep(1.2)  # let inline chart JSON / late nodes settle
            try:
                html = await page.content()
            except Exception:
                html = ""
            if BS.is_challenge(html, await page.title()):
                # Cloudflare's gate is ~27 kB — big enough to sail past a size
                # check and poison data/raw with a challenge page. Never save it.
                print(f"   ! [{slug}/{key}] cloudflare challenge, not saving", flush=True)
                await asyncio.sleep(2.0)
                continue
            if len(html) > 2000:      # real page (empty shell is ~39 bytes)
                with open(os.path.join(OUT_DIR, f"{slug}_{key}.html"), "w", encoding="utf-8") as f:
                    f.write(html)
                size = len(html)
                break
            await asyncio.sleep(1.0)  # back off before retrying
        if not size:
            print(f"   ! [{slug}/{key}] no real content after 3 tries")
    except Exception as e:
        print(f"   ! [{slug}/{key}] {str(e)[:60]}")
    finally:
        try: await page.close()
        except Exception: pass
    return key, size


async def scrape_slug(context, slug):
    """Fetch all of a company's tabs concurrently. Returns overview byte size.
    One failing tab won't sink the others (return_exceptions)."""
    results = await asyncio.gather(*[
        _fetch_tab(context, slug, key, path) for key, path in TABS.items()
    ], return_exceptions=True)
    sizes = {r[0]: r[1] for r in results if isinstance(r, tuple)}
    return sizes.get("imone", 0)


async def scrape_with_context(context, slugs, company_workers=2):
    """Scrape every slug in an already-cleared context. Tabs of a company load in
    parallel; up to `company_workers` companies are processed concurrently."""
    os.makedirs(OUT_DIR, exist_ok=True)
    ok = []
    sem = asyncio.Semaphore(company_workers)
    done = 0

    async def one(slug):
        nonlocal done
        async with sem:
            size = await scrape_slug(context, slug)
            done += 1
            if size:
                ok.append(slug)
                print(f"[{done}/{len(slugs)}] {slug} ok (overview {size} bytes)", flush=True)
            else:
                print(f"[{done}/{len(slugs)}] {slug} ! no overview HTML", flush=True)

    await asyncio.gather(*[one(s) for s in slugs])
    return ok


async def scrape_many(slugs, company_workers=2):
    """Own the browser: persistent profile + one human check, then scrape."""
    async with BS.session() as context:
        if not await BS.ensure_clearance(context):
            return []
        return await scrape_with_context(context, slugs, company_workers)


if __name__ == "__main__":
    slugs = sys.argv[1:]
    if not slugs:
        sys.exit("usage: python3 scripts/data/scrape_company.py <slug> [<slug> ...]")
    done = asyncio.run(scrape_many(slugs))
    print(f"\n=== Scraped {len(done)}/{len(slugs)}. "
          f"Next: python3 scripts/data/parse_company.py <slug> (or use scrape_batch.py) ===")
