# agent9 — all-years bottom-bar balance

## In 30 words

Fixed the phone all-years bottom bar: two equal columns replace the orphaned
three-column layout, compact controls prevent overflow, and both remaining
controls stay centered. Shipped as v3.102.

## In 300 words

All-years mode hides the year carousel, but the phone layout still reserved its
original three-column grid. CSS grid then auto-placed the segment picker and
basis control into the first two columns, leaving the third empty. That made the
bar visibly left-heavy. At widths around 380px the density logic also expanded
the basis labels, so both controls could exceed the padded viewport width.

The all-years phone state now owns a true two-column grid with equal tracks and
centered contents. Its labels remain icon-density below the `sm` breakpoint;
expanded labels return only when the layout switches to the roomier centered
flex row. Per-year behavior and its three-column year/segment/basis balance are
unchanged.

Package metadata, the generated app label, AGENTS version, and newest-first
changelog were advanced from v3.101 to v3.102. TypeScript, targeted lint, and
the production static export pass.
