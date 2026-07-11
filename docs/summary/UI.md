# UI Review Loop

> v91.12. Visual changes require render evidence, not source-code confidence.

1. Get a current target-screen screenshot before editing.
2. Build with `python3 src/build_site.py`, review the new render, then refine.

Check: content gets width before metadata; dates, numbers, and versions never
wrap; narrow tables become stacked cards; redundant labels disappear; common
controls remain reachable; use palette tokens and small radii; async work shows
an immediate loading state. Use a 360px phone render as the binding constraint.

For recurring UI bugs, fix the **class**, not only the shown instance. A valid
source rule is not enough when device rendering disagrees: inspect the render.
