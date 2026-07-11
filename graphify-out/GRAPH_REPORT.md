# Graph Report - .  (2026-07-11)

## Corpus Check
- Large corpus: 164 files · ~884,400 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 272 nodes · 356 edges · 47 communities (24 shown, 23 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 27
- Community 35
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46

## God Nodes (most connected - your core abstractions)
1. `main()` - 14 edges
2. `parse_tab()` - 11 edges
3. `append_event()` - 9 edges
4. `src/template.html` - 9 edges
5. `src/build_site.py` - 9 edges
6. `write_rek_payload()` - 8 edges
7. `index.html` - 8 edges
8. `clean()` - 7 edges
9. `Space-efficiency rubric` - 7 edges
10. `main()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `chMineRank percentile chart` --drawn by--> `drawBarsSvg engine`  [INFERRED]
  .github/workflows/patch-company-vs-market-labels.yml → docs/persistent-bugs.md
- `BULD-01 edit source rule` --forbids hand-editing--> `index.html`  [EXTRACTED]
  .github/workflows/refresh-sodra.yml → README.md
- `index.html` --depends on--> `Chart.js 4.4.3`  [EXTRACTED]
  README.md → docs/FUNCTIONAL_MAP.md
- `Live-deploy rule` --requires rebuild of--> `index.html`  [EXTRACTED]
  .github/workflows/refresh-sodra.yml → README.md
- `PB-3 fix never reached build` --affected--> `index.html`  [EXTRACTED]
  docs/persistent-bugs.md → README.md

## Import Cycles
- None detected.

## Communities (47 total, 23 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (34): files_in_commit(), git_log(), infer_source(), main(), append_event(), append_initial_batch(), append_rek_batch(), append_sodra_batch() (+26 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (28): scripts/autoscrape.py, scripts/browser_session.py, src/build_site.py, CMP_PAL compare palette, data/data_events.json, Data Explorer page, data/data.json, Dev mode (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (24): ensure_clearance(), is_challenge(), company name -> {slug,name,registerNumber} via the site's search API., True when the HTML is Cloudflare's gate rather than a company page.      Size, A persistent Chrome context. Headful by default — that is what lets the     own, Open one tab on the site and wait until it serves real content.      Never rel, session(), text_search() (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (26): chart_series(), clean(), company_name(), debt_panels(), detect_brand(), esg_and_reviews(), finances_grid(), info_items() (+18 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (24): Sign-in / Auth, Total/Per-employee basis toggle, BULD-01 edit source rule, chMine trajectory chart, Chart.js 4.4.3, LT Communication Agencies Competitor Dashboard, drawBarsSvg engine, drawFinSvg engine (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.20
Nodes (16): load_data(), set_provenance(), write_data_json(), fee_ratio_by_brand(), main(), annual_sodra(), collect_financial_series(), extract_city() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (11): Render-critique-refine loop, CONV-02 Never claim unseen visuals, CONV-03 Asks → AskUserQuestion, DATA-16 Cram tight, DATA-22 Small rounding, DATA-28 Colours from one set, DATA-46 Loading states everywhere, DATA-47 Graded values = popup (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (11): BULD-02 version badge rule, .githooks/commit-msg, Self-source from state registries, GIT-01 commit format rule, rekvizitai.vz.lt, scripts/scrape_sodra.py, Sodra open API, data/sodra/*.json (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.36
Nodes (8): load(), main(), missing_brands(), parse_and_write(), [(brand, company_name)] for brands with no scraped block yet.      `company` (, targets: [(brand, company_name)] -> [(brand, slug)] actually scraped., Parse each scraped slug and write rek_tabs.json once (an upsert per     company, run()

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (8): commit_message_check.py, Context mechanism, .githooks commit-msg, Hook mechanism, The hook test, GIT-01 Commit format, HOOK-01 Scripted checks, never gates, PROC-01 Forgotten rule → hook it

### Community 10 - "Community 10"
Cohesion: 0.40
Nodes (4): Companies page, Company deep-dive, Company rankings tab, Market page

### Community 11 - "Community 11"
Cohesion: 0.40
Nodes (4): Competitor dashboard, MY_COMPANIES array, My company section, VRP to Fabula rebrand

### Community 12 - "Community 12"
Cohesion: 0.50
Nodes (3): fabula_ir_partneriai.csv, fabula.html standalone profile, rekvizitai scrape pipeline

### Community 13 - "Community 13"
Cohesion: 0.83
Nodes (3): first_subject(), main(), problems_for()

## Knowledge Gaps
- **65 isolated node(s):** `Fabula ir partneriai`, `data/data_events.json`, `scripts/browser_session.py`, `scripts/estimate_2025.py`, `docs/FUNCTIONAL_MAP.md` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `src/build_site.py` connect `Community 1` to `Community 4`, `Community 7`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `src/template.html` connect `Community 1` to `Community 7`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `index.html` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `main()` (e.g. with `load_data()` and `set_provenance()`) actually correct?**
  _`main()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Pull the commit message that follows the FIRST -m/--message in `command`.`, `[(brand, company_name)] for brands with no scraped block yet.      `company` (`, `targets: [(brand, company_name)] -> [(brand, slug)] actually scraped.` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1006006006006006 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10052910052910052 - nodes in this community are weakly interconnected._