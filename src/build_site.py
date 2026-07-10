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


def load(*parts):
    with open(os.path.join(ROOT, *parts), encoding='utf-8') as f:
        return json.load(f)


data = load('data', 'data.json')
sheets = load('data', 'sheets_data.json')
# rek_tabs.json is optional — the dashboard still builds without a scrape.
# New shape: {"companies":[{slug,name,brand,order,tabs}, ...]}.
rek_path = os.path.join(ROOT, 'data', 'rek_tabs.json')
rek = load('data', 'rek_tabs.json') if os.path.exists(rek_path) else {'companies': []}
if 'companies' not in rek:  # tolerate the old single-company shape
    rek = {'companies': [dict(slug='company', name='Company', brand=None,
                              order=rek.get('order', []), tabs=rek.get('tabs', {}))]}

events_path = os.path.join(ROOT, 'data', 'data_events.json')
events = load('data', 'data_events.json') if os.path.exists(events_path) else {'events': []}

# Attach Sodra data (data/sodra/<jarCode>.json) to each company, matched by the
# "Įmonės kodas" field captured in its Įmonė tab. Sodra is a third data source.
SODRA_DIR = os.path.join(ROOT, 'data', 'sodra')
sodra_by_code = {}
if os.path.isdir(SODRA_DIR):
    for fn in os.listdir(SODRA_DIR):
        if fn.endswith('.json'):
            rec = load('data', 'sodra', fn)
            sodra_by_code[str(rec.get('jarCode'))] = rec


def company_code(block):
    for tab in block.get('tabs', {}).values():
        for field, value in tab.get('rows', []):
            if field == 'Įmonės kodas':
                return str(value).strip()
    return None


for block in rek['companies']:
    code = company_code(block)
    block['code'] = code
    block['sodra'] = sodra_by_code.get(code)  # None if no Sodra file for it

html = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
html = html.replace('__DATA__', json.dumps(data, ensure_ascii=False))
html = html.replace('__SHEETS_DATA__', json.dumps(sheets, ensure_ascii=False))
html = html.replace('__REK_DATA__', json.dumps(rek, ensure_ascii=False))
html = html.replace('__DATA_EVENTS__', json.dumps(events, ensure_ascii=False))

out = os.path.join(ROOT, 'index.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html built,", len(html), "bytes ->", out)
