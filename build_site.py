#!/usr/bin/env python3
"""Build index.html with embedded data from data.json."""
import json

with open('data.json', encoding='utf-8') as f:
    data = json.load(f)

html = open('template.html', encoding='utf-8').read()
html = html.replace('__DATA__', json.dumps(data, ensure_ascii=False))

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html built,", len(html), "bytes")
