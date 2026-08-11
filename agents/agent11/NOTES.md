# agent11 — readable money-flow numbers (Ada Lovelace)

## In 30 words

Fixed the "small numbers": enlarged money-flow-by-year SVG labels from
9–11px to 11–13px. Shipped as v3.111 on `fix/small-numbers` via PR #12,
awaiting owner confirmation.

## In 300 words

**What changed.** The money-flow-by-year chart (the "Market all time"
panel on the Markets view, also used on Companies) drew every number —
axis ticks, legend, revenue, turnover, YoY, payroll, year labels — at
9–11px SVG text. That is genuinely tiny at typical desktop sizes and
the owner's Slack task was literally "fix the small numbers".

**The WIP that was already there.** The main checkout (`oz/local-edits`)
already carried an uncommitted edit to `MoneyFlowByYear.tsx` doing
exactly this: 9→12, 10→11/13, 11→12, tooltip 11px→13px, plus the small
y-offset nudges. I did not touch it. Instead I created a separate
worktree (`Marketanalytics-fix-small-numbers`, branch
`fix/small-numbers`) from `main` and reproduced the same intended fix
there, so the PR is clean and the other checkout stayed untouched.

**Version procedure (repository rule, confirmed again).** Material UI
change ⇒ bump `package.json`, run `pnpm run version:write` (stamps
`src/app-version.ts` AND the `> vN` line in `AGENTS.md`), add a
newest-first `version-history.ts` entry. Commit subject follows
`vN CODE-NN | short description | n sp`; the githook only warns.

**Validation.** `pnpm exec tsc --noEmit` clean. Targeted ESLint on the
changed files shows only the pre-existing
`react-hooks/set-state-in-effect` error at `MoneyFlowByYear.tsx:114`
(`useEffect(() => setView(null), [sig])`) — unchanged code, already
documented in agent6's notes. `pnpm build` passes, 143/143 pages.

**Push policy override.** AGENTS.md says push approved work to `main`,
but the owner's Slack message explicitly asked for "separate branch and
PRs that i will confirm" — that overrides. Push was to
`fix/small-numbers` only; PR #12 targets `main`.

**Trap.** `gh pr create --body "..."` in PowerShell mangles the quoted
string (em-dashes/arrows). Use `--body-file` instead.
