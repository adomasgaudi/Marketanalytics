# agent3 — all-segments donut fix

## In 30 words

Whole-market donut dropped its inner company ring (~150 slices crashed Chart.js) and on-slice labels now bail when arc and label counts disagree during teardown frames.

## In 300 words

The segment doughnut broke when the bottom-bar picker returned to "All segments". Default page load is also all-segments, so the crash blocked the whole Markets view — not just a transition glitch.

Root cause: unscoped mode rendered two rings — nine segment slices plus an inner ring subdividing every company in the market (~157 arcs at weight 1). Chart.js could not lay that out; the custom `segOnSlice` plugin then read `ring.lines[i]` on a frame where metadata and labels were out of sync, throwing `Cannot read properties of undefined (reading '0')`.

The inner ring only earns its pixels when scoped to one segment (company names and shades). At whole-market scope it was a flat colour subdivision with no labels and no legend entries — pure cost. Fix: `companyRing` is built only when `segment` is set; all-segments mode is a single segment dataset again.

Also tightened the plugin guard to require `ring.lines.length === arcs.length` before drawing, matching the intent of the earlier agent2 hardening but covering the case where `ring.lines` itself was missing.

Verified in browser: default all-segments render, pick PA (company breakdown), back to All segments — no console errors. `pnpm build` passes.

Trade-off: whole-market doughnut no longer shows per-company slivers inside each segment wedge. That detail remains in scoped mode and in the bars toggle.
