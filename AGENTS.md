

























# AGENTS.md - Marketanalytics-stacked

> Agent entrypoint for Codex and other AGENTS.md-aware agents starting on the project.
>
> v3.50.0

**This is NOT the Next.js you know.** This repo runs a Next.js version with breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any app code. Heed deprecation notices.

<br />

Are you a ?

- worker (working on a specific task)
- orchestrator (coordinating other agnets)
- other (identify yourself to user)

<br />

## Workflow

### Push policy

Push approved work directly to `main`. This policy was set by the owner on 2026-07-20; do not ask again unless they change it.

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
|- package.json                 Next.js app | pnpm dev  (pnpm only - no npm/yarn)
|- next.config.ts
|
|- src/                         NEXT.JS APP - the only app track
|  |- app/                      App Router: layout, globals.css, routes
|  |- features/                 Feature modules (market-rough, explore)
|  |- components/ui/            Shared primitives (seg, pills, group, ...)
|  |- lib/                      Shared utils (cn, ...)
|  `- app-version.ts            GENERATED from package.json - never hand-edit
|- public/                      Next static assets (incl. CNAME -> custom domain)
|
|- data/
|  |- data.json                 Canonical annual company financial dataset
|  |- sheets_data.json          Imported spreadsheet source data
|  |- rek_tabs.json             Scraped Rekvizitai source data
|  |- data_events.json          Data-change audit log
|  |- workbook.json             The source .xlsx as one Main sheet - powers /explore/sheets
|  |- disagreements.json        What the retired sheets recorded differently (flagged in gold)
|  `- sodra/<slug>.json         Per-company payroll source, named by rek_tabs slug
|
|- scripts/                     Split by WHAT THEY ACT ON, not by language
|  |- app/                      Acts on the app: write-version, lan-qr (run per build/dev)
|  `- data/                     Acts on data/: the LIVE Py scrape+parse+estimate
|     |                         pipeline, plus the make-sheets .mjs one-offs
|     `- workbook/              The .xlsx extract + merge/retire chain behind workbook.json
|
|- docs/                        Every doc lives in one of these - nothing loose at docs/ root
|  |- ai-harness/               Harness space: skills, rules, startprompt, old-agents
|  |- ai-obs/                   Observation layer - fails, verify, context, tokens, handoffs
|  |- pr-architecture/          Architecture.md (env snippet), full architecture, data-flow
|  |- pr-design/                UI.md
|  |- pr-project-state/         Version history, key decisions
|  |- pr-scrape/                Scraping how-to: registries (official), rekvizitai (fallback)
|  `- research/                 Supplementary research summaries
|
|- .github/workflows/           deploy-pages (Next static export -> Pages)
|                               refresh-sodra (scripts/data/scrape_sodra.py -> data/)
|- .claude/                     Agent settings (hooks + settings.json)
`- .githooks/                   Repository hooks (commit-msg format)
```








This file is very valuable context. All edit here must be vital. If this file gets too big it will loose its purpose.

<br />

## Agent handover notes — read first, then add your own

[agents/README.md](agents/README.md) — one folder per agent that has worked here,
each with a `NOTES.md` holding what the repo itself cannot tell you: why a decision
went the way it did, which number is a guess, what broke before. Several agents work
on this repo at once; these files are the handover.

Start by reading them. Before you finish, take the next free number and write your
own — the shape is 30 words, then 300.

<br />

## Read before touching /explore/sheets

[docs/ai-obs/HANDOFF-workbook-viewer.md](docs/ai-obs/HANDOFF-workbook-viewer.md) — the workbook viewer that now IS that page (ported 2026-07-22 from the standalone `financial-data-viewer`, which is retired). Covers the `workbook.json` pipeline, the disagreements record, and four decisions that look like mistakes and are not: hand-written CSS scoped to `.wbv`, no theme toggle of its own, a local `CellStyle` instead of `CSSProperties`, no changelog.

<br />

## Read before scraping ANY company figures

[docs/pr-scrape/SCRAPE-registry-data.md](docs/pr-scrape/SCRAPE-registry-data.md) — the official sources, and the four things that will silently corrupt your data if you don't know them.

The one that matters most: **Registrų centras publishes the same filings twice**, and `registrucentras.lt/aduomenys/` is months ahead of the data.gov.lt mirror we also query — it had FY2025 for 127 of 131 companies while the mirror had 4. If a year looks missing, it probably isn't. The doc also covers the May–June filing calendar (when re-scraping is worth doing at all), the registration-year-≠-fiscal-year filename trap, the mis-cased line that drops 31% of pre-tax values, and the provenance mark every new source must carry before it is wired in.

<br />

if i reject or ask questions that means im trying to understand or slow you down, supervise, not object

try to reply in under 40w unless you need more to explain, but treat reply length as a cost of how much effort you want me to spend. if you want 100w ok maybe you can judge that i need to read it if you want more, then ask me: i need 200w to explain, then ill allow it or suggest shorter reply

The same for code, explain what you're going to do and why - top level view\
explain what each part of the code does - more technical\
write the code. but don't write more than 50lines of code at a time, so that i can be checked.

<br />

<br />

plan should be up to 50 words with bulets and checkboxes

