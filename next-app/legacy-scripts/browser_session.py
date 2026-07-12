#!/usr/bin/env python3
"""One browser session for every rekvizitai.vz.lt scrape.

Why this exists: rekvizitai now sits behind a Cloudflare interstitial
("Luktelėkite...") that a throwaway browser never clears. Every fresh launch
threw away the clearance the owner had just earned by hand, so the human check
came back on every page. The fix is a *persistent* Chrome profile:

  - the cf_clearance cookie lives in data/.pwprofile/ and survives runs
  - `ensure_clearance()` waits on ONE tab, never reloading it, so a check the
    owner is solving right now is not yanked away mid-solve
  - once cleared, every later tab in the same context inherits the cookie

Public API:
    async with session(headless=None) as ctx:   # persistent context
        await ensure_clearance(ctx)             # blocks until the site is real
        ...                                     # scrape with ctx

Env overrides: REK_HEADLESS=1 forces headless (works once a clearance cookie
exists), REK_PROFILE points the profile somewhere else.
"""
import asyncio
import contextlib
import os

from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROFILE_DIR = os.environ.get("REK_PROFILE") or os.path.join(ROOT, "data", ".pwprofile")

BASE = "https://rekvizitai.vz.lt"
PROBE_URL = f"{BASE}/imone/6_vijos/"

# Cloudflare's interstitial titles (LT + EN) and the marker it leaves in the DOM.
_CHALLENGE_TITLES = ("luktelėkite", "just a moment", "please wait", "attention required")
_CHALLENGE_MARKERS = ("cf-chl", "__cf_chl", "challenge-platform", "cf_chl_opt")


def is_challenge(html, title=""):
    """True when the HTML is Cloudflare's gate rather than a company page.

    Size alone is not a test: the interstitial is ~27 kB, comfortably above the
    old `len(html) > 2000` guard that would happily have saved it as data."""
    if any(t in (title or "").lower() for t in _CHALLENGE_TITLES):
        return True
    head = html[:20000].lower()
    return any(m in head for m in _CHALLENGE_MARKERS) and "<h1" not in head


@contextlib.asynccontextmanager
async def session(headless=None):
    """A persistent Chrome context. Headful by default — that is what lets the
    owner solve the check once; pass headless=True (or REK_HEADLESS=1) to reuse
    a clearance cookie that is already in the profile."""
    if headless is None:
        headless = os.environ.get("REK_HEADLESS") == "1"
    os.makedirs(PROFILE_DIR, exist_ok=True)
    async with async_playwright() as p:
        ctx = None
        for channel in ("chrome", None):
            try:
                ctx = await p.chromium.launch_persistent_context(
                    PROFILE_DIR,
                    headless=headless,
                    channel=channel,
                    locale="lt-LT",
                    viewport={"width": 1280, "height": 900},
                    args=["--disable-blink-features=AutomationControlled"],
                )
                break
            except Exception:
                continue
        if ctx is None:
            raise RuntimeError("could not launch a Chromium/Chrome persistent context")
        try:
            yield ctx
        finally:
            with contextlib.suppress(Exception):
                await ctx.close()


async def ensure_clearance(ctx, timeout=300):
    """Open one tab on the site and wait until it serves real content.

    Never reloads: a reload restarts the Cloudflare challenge and discards a
    solve in progress. If the gate is up, the owner clicks the checkbox once in
    the visible window and this returns as soon as the page turns real."""
    page = await ctx.new_page()
    try:
        await page.goto(PROBE_URL, wait_until="domcontentloaded", timeout=60000)
        deadline = asyncio.get_event_loop().time() + timeout
        warned = False
        while asyncio.get_event_loop().time() < deadline:
            html, title = await page.content(), await page.title()
            if not is_challenge(html, title):
                print("   clearance ok — site is serving real pages", flush=True)
                return True
            if not warned:
                print("   ⏳ Cloudflare check is up. Click it ONCE in the open Chrome "
                      "window; nothing will reload underneath you.", flush=True)
                warned = True
            await asyncio.sleep(2)
        print("   ! still challenged after "
              f"{timeout}s — no company was scraped, nothing was overwritten", flush=True)
        return False
    finally:
        with contextlib.suppress(Exception):
            await page.close()


async def text_search(page, query):
    """company name -> {slug,name,registerNumber} via the site's search API."""
    try:
        raw = await page.evaluate(
            """async (q) => {
                const r = await fetch('/api/public/text-search/' + encodeURIComponent(q),
                                      {headers: {'Accept': 'application/json'}});
                return r.ok ? await r.text() : '';
            }""",
            query,
        )
        if not raw:
            return None
        import json as _json
        items = (_json.loads(raw) or {}).get("data") or []
        return items[0] if items else None
    except Exception:
        return None
