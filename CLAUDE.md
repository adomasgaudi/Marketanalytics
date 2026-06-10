# CLAUDE.md

All project context, data semantics, working conventions, versioning/SP rules and
the full prompt history live in **[AGENTS.md](AGENTS.md)**. Read it before making
any change.

Non-negotiables (details in AGENTS.md):
- Edit `template.html`, never `index.html`; rebuild with `python3 build_site.py`.
- Bump the version badge + add a `VERSIONS` entry (with SP) on every change.
- Push to `main` and send the rebuilt `index.html` to the user afterwards.
- `revenue` = turnover/apyvarta; `estimatedIncome` = revenue/spėjamos pajamos.

## Git workflow

- Always work from the `main` branch.
- Always merge to `main` after finishing work.
