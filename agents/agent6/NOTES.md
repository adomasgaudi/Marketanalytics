# agent6 — top navigation version placement

## In 30 words

Moved default TopNav version label from below theme controls to their left, preserved dev-mode settings layout, added v3.99 changelog entry, and verified live geometry after production build and hydration checks.

## In 300 words

TopNav has two intentionally different right-side layouts. In default mode, the light/dark icon and accent swatch share one pill and the version label is the clickable secret key for entering Dev mode. In Dev mode, the version remains beside the settings cog, because that layout exposes the menu and its version affordance separately. The requested change applies only to the default layout.

The default control is now a horizontal flex row. The version tag is rendered before the theme/accent pill, with a small gap and vertically centered alignment. The hint shown after five clicks is kept inside its own relative wrapper around the version tag. That wrapper is load-bearing: the hint remains positioned under the version label rather than becoming anchored to the much wider theme control. The existing click handler, eight-click unlock, theme state, palette cycling, and responsive nav sizing were left untouched.

This project derives `src/app-version.ts` and the version in `AGENTS.md` from `package.json`; run `pnpm run version:write` after a package version bump instead of hand-editing generated values. The owner-facing label moved from v3.98 to v3.99 for this material UI change. A newest-first `v3.99.0` entry was added to `version-history.ts`, so the changelog describes the placement change alongside the generated label. The historical list currently ends at v3.54 after the new entry; that mismatch predates this session and is not used to calculate the runtime label.

Verification: `pnpm run build` passed and regenerated the static `out/` artifact. TypeScript passed after the build generated Next route types; the first pre-build check reported the known missing `.next/types/routes.js`. Targeted ESLint still reports the pre-existing `react-hooks/set-state-in-effect` warning as an error at TopNav line 61, in the unchanged localStorage hydration effect. The existing dev server on port 3000 returned HTTP 200 with `v3.99`. Headless browser geometry measured the version at x=941 and the theme button at x=965, with their vertical centers aligned.
