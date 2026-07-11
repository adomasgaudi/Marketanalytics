# Persistent Bugs

> v91.13. Recurrent failure classes and their non-negotiable guards.

| Bug class | Guard |
| --- | --- |
| Pan/zoom axes produce arbitrary labels | `drawFinSvg` and `drawBarsSvg`: use `niceTicks` 1/2/5 x 10^n, never `min + span/N`. |
| Per-year company growth shows long CAGR | Use YoY from prior to selected year; audit sibling render paths. |
| Source edit never reaches delivery | Rebuild and grep `index.html` for a unique changed string. |
| Dark-mode text disappears | Text/fill: `--text`, `--muted`, series/accent only; native options need `--panel` background + `--text`. |
| Android button ignores authored colour | Custom buttons need `appearance:none`; active `.seg` also forces white. Suspect UA rendering when CSS disagrees with device. |
| Charts misfit on first load | After `makeSectionsCollapsible()`, double-rAF refit active SVG/Chart.js charts, then refit on `window.load`. |

When one instance recurs, search for the same mechanism across every chart,
renderer, theme, and build path before declaring the class fixed.
