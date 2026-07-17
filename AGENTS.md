# AGENTS.md - Marketanalytics-stacked

> Agent entrypoint for Codex and other AGENTS.md-aware agents starting on the project.
>
> v3.8.0

**This is NOT the Next.js you know.** This repo runs a Next.js version with breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any app code. Heed deprecation notices.

<br />

Are you a ?

- worker (working on a specific task)
- orchestrator (coordinating other agnets)
- other (identify yourself to user)

<br />

## Workflow

### There is the agent Harness "space" and the Project "Space:

### Harness includes all the information that you as an agent receive:

- Prompt / system context (Already have this)

- Skills / Rules / memory (you have some not all)
- Hooks
- Tools
- Observation layer
- Failure management
- Resources mngmnt - Context, rules, extropy, time, cost in money

### The Project Space includes from most abstrast to specific:

- Project overall idea, goal, owner values, short vs long term value expectation

- Project Environment (repository, repo location, software environments, info/file architechture/structure)

* Project details

  - Logic - functions, components, variables, data

  - Design
  - Technical structure (technology decisions, fuctionality decisions/implementations (tools, stack), 3rd party tools,

## Context management

To avoid context degeneration and conditions adherence, we use a system where you get familiar with how to get information first since that context will always be closer to the front (higher adherence) and then whatever you need you can retrieve, pushing relevant context to the end (also higher adherence)\
For this we use "snipets" or "registries" (compacted vital info and info how to reach more) of info which you can then explore in more detail later. Now get familiar with all the snippets first so that they stay near the front of your context.

### Priority:

1. Agents.md
2. snippets(not yet made): Harness reg, observ. reg, project ideas reg, project environment reg, project spec reg
3. Deeper dive into skills and rules (not full but just more essential rules and skills needs to be built).
4. as per need (full dive into anyting)

<br />

## Project Structure (old bad structure partially fitted into the new system described above. a lot of parts missing, snippets(registries) almost non existent)

```text
.
|- AGENTS.md                    Agent only entrypoint (built by agent)
|- CLAUDE.md                    Agent only entrypoint
|- README.md                    Human entrypoint
|- package.json                 Next.js app | npm run dev
|- next.config.ts
|
|- src/                         NEXT.JS APP - the active track (was next-app/, hoisted to root)
|  |- app/                      App Router: layout, globals.css, routes
|  |- features/                 Feature modules (market-rough, ...)
|  |- lib/                      Shared utils (cn, ...)
|  `- app-version.ts            GENERATED from package.json - never hand-edit
|- public/                      Next static assets
|
|- legacy-src/                  PREVIOUS dashboard - still what main ships
|  |- template.html             Dashboard source: views, global state, charts
|  `- build_site.py             Injects JSON data into the generated dashboard
|- legacy-index.html            Generated static dashboard viewed by users
|- CNAME                        Custom domain for the deployed (legacy) site
|
|- data/
|  |- data.json                 Canonical annual company financial dataset
|  |- sheets_data.json          Imported spreadsheet source data
|  |- rek_tabs.json             Scraped Rekvizitai source data
|  |- data_events.json          Data-change audit log
|  `- sodra/                    Per-company payroll source files
|
|- legacy-scripts/              Py Scraping, parsing, estimates, and data-event tools
|- scripts/                     Node tooling (write-version.mjs)
|
|- docs/
|  |- ai-x                      Harness space (only parts exist)
|  |- pr-x                      Project space (only parts exist)
|  |
|  |- ai-obs/                   Observation layer - fails, verify, context, ifs, tokens, tracking, logging.
|  |- ai-harness/               Skills, rules, ect.
|  |-
|  |- pr-architecture/
|  |- pr-design/
|  |- pr-project-state/
|  |- pr-scrape/                Scraping how-to + missing slugs
|  `- research/                 Suplementary research summaries
|  |- Architecture.md           Project environment snippet
|  |- old-agents.md             previous details badly categorised
|
|- .github/workflows/           CI. Runs on MAIN, against main's OLD layout
|                               (src/build_site.py, index.html). Repoint these to
|                               legacy-src/ + legacy-scripts/ WHEN this branch merges.
|- .claude/                     Agent settings (hooks + settings.json)
|- .githooks/                   Repository hooks (commit-msg format)
`- graphify-out/                Knowledge graph (generated)
```

This file is very valuable context. All edit here must be vital. If this file gets too big it will loose its purpose.

<br />

if i reject or ask questions that means im trying to understand or slow you down, supervise, not object

try to reply in under 40w unless you need more to explain, but treat reply length as a cost of how much effort you want me to spend. if you want 100w ok maybe you can judge that i need to read it if you want more, then ask me: i need 200w to explain, then ill allow it or suggest shorter reply

The same for code, explain what you're going to do and why - top level view\
explain what each part of the code does - more technical\
write the code. but don't write more than 50lines of code at a time, so that i can be checked.

