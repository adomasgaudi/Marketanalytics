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
