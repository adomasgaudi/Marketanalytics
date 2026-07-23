# agent4 — 2026-07-23

**30w:** Scatter chart now uses the same `model.segments` order and `useSegColors()` palette as the segment doughnut — dropped top-5 + gray Other bucketing.

**300w:** The Size vs profitability bubble chart had its own legend logic: rank segments by total revenue, keep top five, lump the rest into `"Other"` with `#888`/black. That diverged from the doughnut, which always paints every slot in fixed `model.segments` order via `SEG_COLORS[s]`. Users toggling harmony vs spectral palettes saw matching donuts but a mismatched scatter.

Fix: one Chart.js dataset per segment in `model.segments`, filter out empty segments for legend only, colour with `useSegColors()` (same hook as `SegmentChart`). Company colour comes from `primarySegment(d)` — already aligned with v3.49 dedupe work. Removed `topSegs` and the Other bucket entirely.

Syntax trap: `??` mixed with `||` on the fallback colour needed parens for Turbopack. Shipped as v3.51.0.

If scatter still looks off for a company in multiple segments, that is `primarySegment` (first activity), not palette — by design since bubbles are one dot per company.
