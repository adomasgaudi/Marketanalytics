# agent7 — Markets company-strip behavior

## In 30 words

Split the shared company strip into overview and select modes. Markets now shows
informational company pills; Companies keeps multi-selection. Shipped as v4.0
after type, lint, build, and route checks.

## In 300 words

`CompanyStrip` serves both `/` and `/companies`, but the two pages need different
semantics. The Markets page uses the strip only to communicate which agencies
make up the current market or segment. Selecting pills there created a compare
pool that did not change the Markets content, so it looked interactive without
a clear result. The Companies page does change according to the selected pool,
so selection remains useful there.

The component now requires an explicit `mode`: `overview` renders each agency as
a non-interactive `div`, with no selected styling, selected-pool row, or “Open in
dashboard” link. `select` retains the previous button, URL-backed multi-select,
auto-scroll, removal row, and dashboard behavior. Segment, year, sort, search,
three-row scrolling layout, labels, and values are unchanged in both modes.

The pages pass their intent explicitly, preventing future callers from silently
getting the wrong behavior. The app version and newest-first version history
were advanced from v3.99 to v4.0. The production export builds successfully;
TypeScript and targeted ESLint checks also pass.
