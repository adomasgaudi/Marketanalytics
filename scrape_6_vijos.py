#!/usr/bin/env python3
"""Scrape 6 vijos, MB from rekvizitai.vz.lt. Run this locally."""
import asyncio, json, sys

# Windows consoles default to cp1252 and choke on Lithuanian chars; force UTF-8.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from playwright.async_api import async_playwright

URL = "https://rekvizitai.vz.lt/imone/6_vijos/"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print(f"Loading {URL} ...")
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        # Save raw HTML first so a console-print error can't lose the scrape.
        html = await page.content()
        with open("6_vijos_raw.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("\n=== Raw HTML saved to 6_vijos_raw.html ===")

        text = await page.evaluate("() => document.body.innerText")
        print("\n=== PAGE TEXT ===\n")
        print(text)

        await browser.close()

asyncio.run(main())
