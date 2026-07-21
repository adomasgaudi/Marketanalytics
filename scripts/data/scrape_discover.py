#!/usr/bin/env python3
"""Inspect rekvizitai.vz.lt page content and structure."""
import asyncio
from playwright.async_api import async_playwright

URL = "https://rekvizitai.vz.lt/imone/6_vijos/"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--ignore-certificate-errors"]
        )
        page = await browser.new_page()
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        # Dump all visible text sections
        text = await page.evaluate("() => document.body.innerText")
        print(text[:8000])

        await browser.close()

asyncio.run(main())
