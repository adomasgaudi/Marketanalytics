# AGENTS.md - Marketanalytics-stacked

> Agent entrypoint for Codex and other AGENTS.md-aware agents starting on the project.
>
> v91.10


<br />

Are you a worker (working on a specific task) or orchestrator (coordinating other agnets) or other (identify yourself to user)?

## Project

This repo is website project listing and analysing \~140 LT marketing related companies financial data.

<br />

## Project Structure

```text
.
|- AGENTS.md                    Agent entrypoint 
|- CLAUDE.md                    Agent entrypoint 
|- Schema.md                    Data schema and process rules
|- UI.md                        UI conventions and decisions
|- README.md                    Human-facing project overview
|- index.html                   Generated static dashboard viewed by users
|
|- src/
|  |- template.html             Dashboard source: views, global state, charts
|  `- build_site.py             Injects JSON data into the generated dashboard
|
|- data/
|  |- data.json                 Canonical annual company financial dataset
|  |- sheets_data.json          Imported spreadsheet source data
|  |- rek_tabs.json             Scraped Rekvizitai source data
|  |- data_events.json          Data-change audit log
|  `- sodra/                    Per-company payroll source files
|
|- scripts/                     Scraping, parsing, estimates, and data-event tools
|
|- docs/
|  |- adr/                      Immutable architecture decisions and future choices
|  |- design/                   Page and interaction design notes
|  |- reference/                Code map, data dictionary, operational references
|  `- research/                 Evidence and external research summaries
|
|- .claude/                     Agent settings
|- .agents/                     Agent settings
|- .githooks/                   Repository hooks
`- graphify-out/                Knowledge graph
```

Build path: `data/*.json` + `src/template.html` -> `src/build_site.py` ->
`index.html`. Read the relevant `docs/` reference before changing data flow,
migration boundaries, or the chart engine.

## Non-Negotiables

- Work on the `stacked` branch/worktree only.
- Never push to `main`.
- Treat commits as local unless the owner explicitly asks to push.
- For source changes, rebuild the viewed artifact before saying it is live.
- Preserve the bespoke SVG chart engine unless the owner explicitly chooses a rewrite.
- Do not hand-maintain line-number references in docs; use stable file, symbol, or id anchors.

## Versioning

Owner-facing versions use `v.N`.

- User-facing site changes: `v92`, `v93`, ...
- Meta, tooling, docs, hooks: `v91.1`, `v91.2`, ...
- This file is currently `v91.10`.

Every material change must update the visible version label and its changelog or
release note.











