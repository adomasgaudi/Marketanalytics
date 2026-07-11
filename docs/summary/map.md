# Project Map

> v91.12. Static competitor dashboard for Fabula versus 132 Lithuanian agencies, 2019-2025.

**Markets:** KPIs, segments, rankings, scatter, money flow. **Companies:**
profile, flow, ranks, deep dive. **Data Explorer:** raw sources, coverage,
changes, CSV; dev mode. Preserve year/all-time, basis toggles, comparison,
EN/LT, traceability, mobile use, and nine charts.

## Data and Build

`data.json`: 906 canonical annual rows. `sheets_data.json`: seven source sheets.
`rek_tabs.json`: profiles. `sodra/*.json`: 115 payroll files. `data_events.json`:
change log.

```text
data/*.json + src/template.html -> python3 src/build_site.py -> index.html
```

`index.html` is the deliverable. The app is static: all data and computation
ship to the browser.

## Migration Constraints

Future server features: auth -> database -> private API -> scraping -> email.
Wrap, do not casually rewrite, the SVG engine. `makeSectionsCollapsible()`
reparents Markets DOM into Companies: the migration hotspot. Prefer temporal
database rows for history; JSONL is interim.
