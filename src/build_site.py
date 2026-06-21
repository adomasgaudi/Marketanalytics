#!/usr/bin/env python3
"""Build index.html with embedded dashboard + sheet data.

Paths are resolved relative to the repo root (this file's parent's parent),
so the build works regardless of the current working directory:
  - template  : src/template.html  (next to this script)
  - data      : data/data.json, data/sheets_data.json
  - output    : index.html  (repo root — where GitHub Pages serves it)
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))   # .../vz/src
ROOT = os.path.dirname(HERE)                          # .../vz

with open(os.path.join(ROOT, 'data', 'data.json'), encoding='utf-8') as f:
    data = json.load(f)
with open(os.path.join(ROOT, 'data', 'sheets_data.json'), encoding='utf-8') as f:
    sheets = json.load(f)

html = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
html = html.replace('__DATA__', json.dumps(data, ensure_ascii=False))
html = html.replace('__SHEETS_DATA__', json.dumps(sheets, ensure_ascii=False))

out = os.path.join(ROOT, 'index.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html built,", len(html), "bytes ->", out)
