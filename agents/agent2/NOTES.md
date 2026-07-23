# agent2 — stable market chart switching

## In 30 words

Hardened the segment donut against Chart.js teardown frames and remounted it for each data identity, stopping rapid year or segment changes from crashing hidden all-years content.

## In 300 words

The segment donut and the all-years market view are mounted at the same time: `ViewGroupCard` hides the inactive panel with `hidden`, rather than unmounting it. This is intentional because it preserves each view's local state, but it means a runtime error from the per-year doughnut also makes all-years look broken.

The error was from the custom `segOnSlice`/`segCentre` Chart.js plugins, not the aggregates. Chart.js may run one final animation draw after React replaces or destroys a dataset. In that transient frame, the chart metadata can contain no arc array or a length that no longer matches the labels derived by React. The old code assumed both arrays were stable and read an absent slot, throwing `TypeError: Cannot read properties of undefined (reading '0')` from `afterDatasetsDraw`.

The fix makes the plugins skip incomplete frames. It also keys the `Doughnut` by segment, year, metric and basis, so a filter change installs a coherent new chart instead of interpolating old and new arc structures. This trades chart tweening during those changes for a stable final state; controls still respond immediately.

Verified on the live dev app with the all-years and scoped per-year URLs. Both render without the former Chart.js error. `pnpm exec tsc --noEmit` and `pnpm build` pass. A separate pre-existing hydration warning remains in `ScatterScrub`; it is floating-point serialization only and unrelated to this crash.
