# Stack decisions for the legacy → Next.js port

> Research backing the `/rough` port. 2026-07-12.
> Grade: **A** = verified against a primary source (official docs / repo source).
> **C** = model training knowledge, no source fetched — treat as opinion.

---

## 1. Component boundaries come from the data model — **A**

React's own criterion, not a style preference:

> "a component should ideally only be concerned with one thing. If it ends up
> growing, it should be decomposed into smaller subcomponents."
> "Separate your UI into components, where each component matches one piece of
> your data model."

So component seams follow `data.json`'s shape (a company-year row, a segment, a
market aggregate) — **not** where the legacy happened to put a `<div>`. This is
the difference between a native-looking port and transplanted HTML.

Source: [react.dev — Thinking in React](https://react.dev/learn/thinking-in-react)

## 2. Derived values are NOT state — **A**

React's three tests for what does not belong in state, verbatim:

> - Does it **remain unchanged** over time? If so, it isn't state.
> - Is it **passed in from a parent** via props? If so, it isn't state.
> - **Can you compute it** based on existing state or props? If so, it
>   _definitely_ isn't state!

> "Figure out the absolute minimal representation of the state your application
> needs and compute everything else on-demand."

**Consequence for this port.** The legacy caches derived values in globals
(`ovBrands`, filtered lists, `rankMetricVal`, aggregates) because recomputing
meant re-touching the DOM. In React those are computed during render. This is
where most of the 5,200 lines disappear — and it is *forced* by the framework,
not an optional improvement.

Minimal real state for the rough port: **selected year, basis (full/per-employee),
selected companies, active segment filters, open dropdown.** Everything else —
filtered lists, rankings, aggregates, percentiles — derives.

Source: [react.dev — Thinking in React](https://react.dev/learn/thinking-in-react)

## 3. Variants: stay on `class-variance-authority` — **A**

- shadcn/ui's **current Tailwind-v4 button source still imports `cva`**
  (`apps/v4/registry/new-york-v4/ui/button.tsx` on `main`). The request to move
  shadcn to tailwind-variants is **still open, not adopted**.
- The Tailwind-v4 compatibility worry is moot: cva is pure string composition,
  never reads `tailwind.config.js`, so the v3→v4 config removal cannot break it.
  Low release cadence reads as feature-complete, not abandoned.
- cva does **not** dedupe conflicting classes — keep passing its output through
  `twMerge` (which `cn()` already does).
- `tailwind-variants` only clearly wins for **slots** (one call styling several
  parts of a compound component). Not worth a dependency swap here; it can be
  added for a single component later if one genuinely needs 4+ slots.

This repo already has `cva` + `clsx` + `tailwind-merge` + Radix installed —
that **is** the shadcn stack minus the CLI. Copying shadcn components in needs
no adapter layer.

Sources: [shadcn v4 button source](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/button.tsx) ·
[joe-bell/cva](https://github.com/joe-bell/cva) ·
[tailwind-variants comparison](https://www.tailwind-variants.org/docs/comparison) ·
[shadcn issue #1098](https://github.com/shadcn-ui/ui/issues/1098)

## 4. Filter state belongs in the URL (`nuqs`) — **A**

Year / basis / segments / selected companies **are page identity**: two people
opening "the dashboard" aren't looking at the same thing unless those values
travel with the link. `useState` discards them on refresh, back, and share.

**The trade-off most write-ups get wrong** is the `shallow` flag:

- `shallow: true` (**the default**) — URL updates client-side only. **No server
  round-trip, no RSC re-fetch.** Re-render cost is identical to `useState`.
  This is what this dashboard wants: the dataset is already client-side, so
  filtering stays pure client computation and shareability is free.
- `shallow: false` — every filter change re-fetches the RSC payload. Only if
  filtering later moves server-side; then pair with `startTransition` +
  `debounce()` or you fire a request per keystroke.

Useful defaults: `history: 'replace'` (filters don't spam the back button),
`clearOnDefault: true` (default values stripped from the URL).

**The split:** URL for anything that **changes what data is shown**; `useState`
for **ephemeral UI** (open dropdown, hover, tooltip, expanded row). Putting the
latter in the URL is the over-engineering failure mode.

Zustand solves a problem this app doesn't have — it gives no shareability and no
refresh persistence.

⚠️ Unverified: nuqs v2+ requires wrapping the app in `<NuqsAdapter>` from
`nuqs/adapters/next/app`. Confirm against the installed version.

Sources: [nuqs options](https://nuqs.dev/docs/options) ·
[nuqs tips & tricks](https://nuqs.dev/docs/tips-tricks) · [47ng/nuqs](https://github.com/47ng/nuqs)

## 5. Avoiding "div soup with giant className strings" — **C**

Unverified (training knowledge), but consistent with §1–§2:

- **Semantic HTML first.** Much of the legacy's div soup is `<div onclick>` that
  should be `<button>`, `<section>`, `<table>`. That pass alone deletes nodes and
  buys accessibility.
- **Name components after domain concepts** (`MetricCard`, `CompanyRow`,
  `YearSelector`), never positions (`TopSection`, `LeftPanel`). Position-named
  components are just relocated soup.
- **A leaf component owns its classes; callers pass props, not classes.** The
  giant `className` string moves into a typed `cva` definition, not into a
  `styles.ts` constants file — that just moves the soup.
- **Split on responsibility count, not line count.** A 300-line component that
  renders one table is fine; a 90-line one that fetches + filters + renders +
  formats is not.
- **Typing:** no `React.FC`. Plain functions, `type` aliases, explicit
  `children: React.ReactNode`, extend DOM props via `ComponentPropsWithoutRef`,
  derive variant prop types from the cva config (`VariantProps<typeof x>`) so
  styles and types can't drift. Discriminated unions for chart/loading states,
  so "loading but also error but also has data" is unrepresentable.

## 6. Porting imperative → declarative — **C**

Unverified, but §2 forces most of it regardless:

- **`innerHTML` string building** → JSX `.map()` with a **stable domain key**
  (company slug, never the array index). Do not reach for
  `dangerouslySetInnerHTML` as a shortcut — it becomes permanent, and it's an
  XSS hole through scraped data.
- **DOM-stashed controllers** (`el.__fin = ...`) → one client component per
  imperative widget: instance in a `useRef`, created in `useEffect` with a
  cleanup that destroys it, updated in a second effect keyed on the data props.
  Everything outside that wrapper stays declarative.
- **`getElementById` + `addEventListener`** → `onClick`/`onChange` props.
- Push `"use client"` **down to the leaves** so the tree above stays
  server-rendered.

---

## Open decision

**Adopt `nuqs` now, or keep `useState` for the rough port?** URL state is a
genuine deviation from the legacy (which shares nothing) — a behaviour
*addition*, not a behaviour change: the UI looks and acts identical. Cheap now,
painful to retrofit once filters are threaded through components.