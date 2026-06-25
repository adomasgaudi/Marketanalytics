# Persistent bugs (PB-n)

Recurring bugs — fixed before, came back. Log device+browser, prior failed fixes, the real root,
and leave a `PB-n` comment at the fix site. Read this before touching an area with a `PB-n`.

---

## PB-1 — Chart axis numbers are arbitrary / change on pan-zoom
- **Recurrences:** 2 (line engine, then bar engine)
- **Seen on:** Android / Brave (owner's phone), money-flow + rankings charts.
- **Symptom:** axis tick labels are non-round (€-0.19M, €1.47M, €3.12M…) and CHANGE to different
  arbitrary values when the chart is panned/zoomed, instead of round numbers (€0M, €1M, €2M…) that
  stay put and just slide.
- **Root cause:** ticks computed as `min + k·span/N` (evenly divides the *current view*), so every
  pan re-derives ugly values. Fix = "nice" ticks at `1/2/5 × 10ⁿ` multiples of a step, which are
  round and only move position as you pan.
- **Fixes:**
  - `drawFinSvg` (line/bar-line engine) — niceTicks added earlier (y-axis).
  - `drawBarsSvg` (horizontal rank bars) — niceTicks added v0.1.181 (x-axis). *(was missed when the
    line engine was fixed — same class, different function.)*
- **Guard against re-introduction:** any new chart axis MUST use a niceTicks-style round-step
  generator, never `min + k·span/N`. Both engines now share the same logic; copy it for any new one.

---

## PB-2 — Company "Revenue CAGR 2019–YYYY" card is a 2019-anchored outlier, not per-year
- **Recurrences:** 2 (label-year patch, then full YoY conversion)
- **Seen on:** Android / Brave (owner's phone), Companies page, every company (e.g. Fabula, APG media).
- **Symptom:** every other card on the Companies view shows the SELECTED year (money-flow YoY badges,
  People & pay 2023, Credit risk, vs-market 2023) — but this one card showed a 5-year compound CAGR
  from 2019. Owner: "this one should be per year as the others."
- **Prior failed fix:** v0.1.190 made the CAGR end-year follow the selected year (label "2019→2023")
  — a SYMPTOM patch. It was still a 2019-anchored CAGR, not a per-year figure, so it stayed wrong.
- **Root cause:** when the MARKET cards were converted CAGR→YoY (prev-year → chosen-year) long ago,
  the COMPANY-page Revenue card was missed — same class, different render path. The card kept the
  old CAGR paradigm while everything around it became per-year YoY.
- **Fix:** v0.1.191 — replaced the CAGR card with a YoY (prev→chosen year) card, mirroring the market
  Turnover YoY card exactly; also corrected the noun (the `.revenue` field = Turnover per WORD-01,
  the card had mislabelled it "Revenue"). First year → "first year"; partial 2025 → "no financials yet".
- **Guard against re-introduction:** any "growth" card on a per-year view is YoY (prev→chosen), never a
  CAGR-from-2019. If you convert one section's growth cards, grep `CAGR`/`cagr` and convert the SIBLINGS
  in every other render path the same turn (this miss is exactly why it recurred).

---

## PB-3 — "Fixed" change never actually reached the deployed build
- **Recurrences:** 1 (scatter per-employee basis "fixed" in v194 but unchanged on the live site)
- **Seen on:** Android / Brave (owner's phone), the size-vs-profitability scrubber.
- **Symptom:** owner toggles Per employee, nothing changes — even the caption text didn't update,
  proving the new code path never ran. I had reported it shipped in v0.1.194.
- **Root cause:** NOT a logic bug. A batch of Edit calls (the `perEmp` read in buildScatterScrub, the
  setBasis rebuild call, the `scrubDesc` id, the listener refactor) were not present in the committed
  `index.html` — only the `scatterDataForYear(y, perEmp)` signature + version bump landed (v194 diff was
  just 8 lines). So the function ACCEPTED perEmp but nothing PASSED it. Likely a context-summary boundary
  where I bumped the version and committed without the body edits actually being in the file, and I did
  not re-verify the built output.
- **Fix:** v0.1.195 — re-applied all five edits and CONFIRMED each by grepping the built `index.html`
  before committing (perEmp read, passes perEmp, scrubDesc id, setBasis rebuild, once-wired listeners).
- **Guard against re-introduction:** after editing `src/template.html`, ALWAYS `grep` the rebuilt
  `index.html` for a unique string from the change before claiming it's shipped. "Edit returned success"
  is not proof it's in the deploy — only the built artifact is. (Candidate for a build-check hook.)

---

## PB-4 — Black-on-black text in dark mode (surface token used as text colour)
- **Recurrences:** multiple across sessions (owner: "still black on black text left").
- **Seen on:** Android / Brave (owner's phone), dark theme — Data Explorer null cells + row numbers; native `<select>` option lists.
- **Symptom:** some text invisible in dark mode (dark text on dark surface).
- **Root cause:** a **surface/border token was used as a TEXT colour** — `td.null` and `.row-num` used
  `color:var(--border)`, which is a near-black slate in dark mode → invisible. Plus native controls
  (option lists, scrollbars) had no `color-scheme`, so the OS rendered them light → dark option text.
- **Fix:** v0.1.203 — those two → `var(--muted)` (the faint-but-visible text token); added
  `color-scheme:light/dark` to `:root` / `[data-theme=dark]` so native controls follow the theme.
  v0.1.205 — `color-scheme` alone wasn't enough on the owner's browser: added explicit
  `select option,select optgroup{background:var(--panel);color:var(--text)}` because native dropdown
  lists default to dark-on-dark without it. (Real root per DATA-20: these should be the custom dropdown,
  not native `<select>` — 4 still remain: rankMetric, rankSegment, exp-psize, page-size. Convert later.)
- **Guard against re-introduction:** TEXT/`fill` colour may ONLY be `--text`, `--muted`, or a series/
  accent token — NEVER `--bg/--panel/--panel2/--border/--cost/--chart-bg` (those are surfaces). SVG
  `<text>` must always carry an explicit `fill`. Native `<select>` MUST have styled `option`s (or be the
  custom dropdown, DATA-20). Candidate for a Stop-hook grep: `color:var(--border|bg|panel...)`.

---

## PB-5 — Active "Doughnut" toggle text rendered dark despite CSS saying white
- **Recurrences:** multiple (kept reporting "doughnut text dark"; survived several looks).
- **Seen on:** Android / Brave (owner's phone), dark theme, segment-card chart-type toggle.
- **Symptom:** the ACTIVE "Doughnut" `.seg` button shows dark text on the blue active background, while
  its identical siblings (Revenue, %, Average/company) are correctly white on blue.
- **Why it kept beating me:** exhaustive static analysis proved there was NO cause in source — exactly one
  `.seg button.active{...color:#fff}` rule, identical HTML to the white siblings, no inline styles, no JS
  recolouring. Source said white; only the device rendered dark.
- **Root cause:** native `<button>` `appearance` — some Android browsers (Brave/Samsung WebView) impose
  the system button text colour over an authored `color` in certain focus/active states. A UA-rendering
  quirk, invisible to source inspection (that's why it "wasn't there").
- **Fix:** v0.1.207 — `-webkit-appearance:none;appearance:none` on `.seg button` (root: removes UA button
  styling so authored colours win) + `color:#fff !important` on `.seg button.active` (guarantee).
- **Guard against re-introduction:** every custom-styled `<button>` MUST set `appearance:none` so the UA
  can't override authored colours. When source clearly says a colour but the device disagrees, suspect a
  UA quirk (appearance / color-scheme) or stale cache — not the cascade.
