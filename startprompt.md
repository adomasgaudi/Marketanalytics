1 Serve first, before anything else. This is Next.js 16 + Turbopack (NOT Vite), and
`pnpm dev` also spawns the legacy-template watcher — both must be up.

    pnpm dev     # background it
    pnpm lan     # prints the Wi-Fi URL + opens a QR image on my screen

Ignore the "Network: http://0.0.0.0:3000" line Next prints — that's a bind address,
not typeable on a phone. `pnpm lan` picks the real Wi-Fi IPv4 (skipping Hyper-V /
VirtualBox adapters), writes a 900px QR PNG to .next/lan-qr.png and opens it, so I
can scan it straight off the screen. Don't just print the link — open the QR.

Do NOT hand me a terminal-ASCII QR: line-height stretches the modules and phones
won't lock onto it. The PNG is the deliverable.

If the phone loads the page but nothing is clickable, that's not a bug in the app —
Next blocks cross-origin dev resources, so the HTML renders and the client JS never
hydrates. The LAN IP must be in `allowedDevOrigins` in next.config.ts.

Package manager is pnpm only. Never npm/yarn — it will fight the lockfile.

<br />

2 Before reading any file, tell me what you already know about THIS project and how you
know it — separate what was handed to you (git branch, dirty files, commit messages,
file names) from what you inferred. Skip your tool/connector roster; I don't care.
3 read info.md and get familiar with the project
4 your task:

<br />

**What I know without reading a single file:**

*Handed to me (git + harness context):*

- Branch `stacked`, main is `main`. Version 3.38.0, Next.js 16.2.10 (Turbopack), dev entry `scripts/dev.mjs` which also watches `legacy-src/template.html` and rebuilds a legacy static dashboard.
- Latest commit: EXPL-01 WIP — `/explore` is a port of a "v2 rekView": coverage grid, data-changes, field data with source modes + EN + CSV, raw-sheet explorers. Known issue flagged: \~2min dev SSR, documented in HANDOFF.md.
- Dirty tree matches that commit's story: `explore/*` modified, plus untracked `JsonTree.tsx`, `RawJson.tsx`, `data/sheets_data_kv.json`, `scripts/make-sheets-kv.mjs`. Also modified: `next.config.ts`, `package.json`, `package-lock.json`, `ScatterChart.tsx`, `TopNav.tsx`.
- AGENTS.md: two tracks live side by side — active Next app in `src/`, legacy Python/HTML dashboard in `legacy-src/` that main still ships. CI on main still points at the old layout.
- Recent commits sketch a feature cadence: COPA-04 picker parity, INSI-01 per-year insights, DEVX-01/02 dev-corner tooling as `@adomas/dev-tools`.
- Domain: Lithuanian company financials — `data.json` annual dataset, Sodra payroll, Rekvizitai scrapes.

*Inferred (not told):*

- The untracked KV files + new script suggest you hit the ~2min SSR problem and are mid-fix — precomputing a key-value sheet index to avoid parsing `sheets_data.json` per request. `next.config.ts` being dirty likely relates (bundling/serverExternalPackages).
- `JsonTree`/`RawJson` are the raw-sheet explorer pieces, not yet committed, so EXPL-01 isn't done.
- `TopNav`/`ScatterChart` edits are probably the "explore btns → /explore" wiring plus leftover polish.

Unverified guesses, all of them. Want me to confirm against HANDOFF.md and the diff?