#!/usr/bin/env python3
"""Build index.html with embedded dashboard + sheet data."""
import json

with open('data.json', encoding='utf-8') as f:
    data = json.load(f)
with open('sheets_data.json', encoding='utf-8') as f:
    sheets = json.load(f)

html = open('template.html', encoding='utf-8').read()
html = html.replace('__DATA__', json.dumps(data, ensure_ascii=False))
html = html.replace('__SHEETS_DATA__', json.dumps(sheets, ensure_ascii=False))

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html built,", len(html), "bytes")
