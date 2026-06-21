#!/usr/bin/env python3
"""Scrape 6 vijos, MB from rekvizitai.vz.lt. Run this locally."""
import asyncio, json
from playwright.async_api import async_playwright

URL = "https://rekvizitai.vz.lt/imone/6_vijos/"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print(f"Loading {URL} ...")
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        text = await page.evaluate("() => document.body.innerText")
        print("\n=== PAGE TEXT ===\n")
        print(text)

        # Also dump raw HTML for inspection
        html = await page.content()
        with open("6_vijos_raw.html", "w") as f:
            f.write(html)
        print("\n\n=== Raw HTML saved to 6_vijos_raw.html ===")

        await browser.close()

asyncio.run(main())
