# CLAUDE.md

All project context, data semantics, working conventions, versioning/SP rules and
the full prompt history live in **[AGENTS.md](AGENTS.md)**. Read it before making
any change.

The standing **Gates** (machine-enforced, hard-stop) and **Nudges** (judgment,
reminder-only) live in **[GOVERNANCE.md](GOVERNANCE.md)** — the vz Codex. Its
**Gate Test** decides which kind any new rule is. Read it before adding any rule.

Non-negotiables (details in AGENTS.md):
- Edit `template.html`, never `index.html`; rebuild with `python3 build_site.py`.
- Bump the version badge + add a `VERSIONS` entry (with SP) on every change.
- Push to `main` and send the rebuilt `index.html` to the user afterwards.
- `revenue` = turnover/apyvarta; `estimatedIncome` = revenue/spėjamos pajamos.

## Git workflow

- Always work from the `main` branch.
- Always merge to `main` after finishing work.
