# agent11 — render-phase React fixes

## In 30 words

Fixed the four React render-phase lint errors: a component built inside render,
and three refs written during render. Left the seven setState-in-effect errors
deliberately. Shipped as v3.111.

## In 300 words

`pnpm run lint` across the whole repo was red on arrival — 11 errors, 20
warnings — while every previous session verified with _targeted_ lint on the
files it touched. That is why the debt accumulated invisibly. If you only lint
your own files you will not see this; run the bare `pnpm run lint` before you
claim a session is clean.

Four errors were genuine and are now fixed:

- `CompanyProfile.tsx` defined `SegDot` **inside** the card component. That
  makes a new component type on every render, so React unmounts and remounts
  every segment dot rather than updating it. Hoisted to module scope; it now
  takes the colour map as a `colors` prop instead of closing over
  `useSegColors()`.
- `BottomBar.tsx` (`useWheelStep`, `useArrowKeys`) and `LineChart.tsx`
  (`useTweenedView`) wrote `ref.current = latest` during render — the standard
  latest-callback idiom, which React Compiler rejects. Each assignment moved
  into a dependency-less `useEffect`. In `useTweenedView` that effect is
  declared **before** the tween effect on purpose: effects run in declaration
  order, so `dispRef.current` is already the current view when a new glide
  starts. Reorder those two and the chart will tween from a stale origin.

Seven errors remain, all `react-hooks/set-state-in-effect`, and they are left
alone deliberately — do not "fix" them without reading this. Five
(`CompanySelector`, `ScatterChart`, `SegmentTrends`, and the two `setView(null)`
resets in `LineChart` / `MoneyFlowByYear`) sync chart state to the bottom-bar
scope while preserving manual selections until the scope next changes. Two
(`PeriodToggle`, `TopNav`) read the `?dev=1` flag and the persisted theme after
mount so the prerendered static HTML and the first client render agree —
required by the static export, not an oversight. Rewriting any of them is a
behavioural change to the charts, not a lint tidy-up.

No visual change in this release. Typecheck, lint (4 fewer errors) and
`pnpm build` all pass.
