# AGENTS.md

Project rules, conventions, and data model live in `CLAUDE.md`, `Schema.md`, `UI.md`,
`README.md`, and `docs/`. Read those first — this file only adds cloud-environment notes.

## Cursor Cloud specific instructions

This repo is a **self-contained static HTML dashboard** (no backend, no server-side
runtime). There is no `package.json` or `requirements.txt`.

### Build / run / serve
- Edit `src/template.html` (never `index.html` directly — see `BULD-01`), then rebuild:
  `python3 src/build_site.py` regenerates the self-contained `index.html` at repo root by
  injecting `data/*.json` into the template. The build is Python-stdlib only and idempotent.
- Serve for local testing: `python3 -m http.server 8000` from repo root, then open
  `http://localhost:8000/index.html`. Charts load `Chart.js` from a CDN, so rendering the
  charts requires network access.
- Lint/syntax-check the embedded JS by extracting the inline `<script>` blocks from the
  built `index.html` and running `node --check` on them (Node is preinstalled). Loading the
  page in a browser is the real end-to-end check.

### Scraper pipeline (`scripts/`) — mostly not runnable in the cloud sandbox
- `parse_company.py` / `reparse_all.py` need `beautifulsoup4` (installed by the update
  script). The playwright-based scrapers (`scrape_company.py`, `browser_session.py`, etc.)
  need `playwright` (NOT installed) and hit `rekvizitai.vz.lt`, which is blocked by the
  sandbox — treat those as local-only, non-runnable here.
- `scripts/scrape_sodra.py` is stdlib-only (urllib) and targets `atvira.sodra.lt`; it only
  works if that host is reachable from the sandbox.

### Git conventions
- Commit subjects must match `GIT-01`: `vN RULE-ID | short description | N sp`. The
  `.githooks/commit-msg` hook warns on mismatch but never blocks (it always exits 0).
  Enable it with `git config core.hooksPath .githooks` if hooks are not already wired up.
