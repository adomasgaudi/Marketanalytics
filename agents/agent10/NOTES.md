# agent10 — segment salary metric

## In 30 words

Replaced the all-years segment Wages trend with average monthly salary per
employee, removed the duplicate salary choice, clarified units and explanatory
copy, and shipped the change as v3.103.

## In 300 words

The Financial metrics by segment control exposed both Wages and Avg salary.
Wages summed annual salary costs, while the requested comparison is the typical
monthly salary paid per employee inside each segment.

The trend options now contain one salary reading: `avgSalary`. Its source is
each company’s Sodra average monthly wage per employee, filtered by the existing
€500 validity floor and averaged across reporting companies in the segment.
The chart label is “Salary / employee / month,” its axis is
`€/employee/month`, and the explanatory copy says explicitly that companies are
the aggregation units. Total annual Wages no longer appears in this control.

Package metadata, generated app label, AGENTS version, and newest-first
changelog advance from v3.102 to v3.103.

Verify with focused ESLint, `pnpm exec tsc --noEmit`, and `pnpm run build`.
After deployment, confirm the public bundle contains v3.103 and both salary
labels.

The segment details popup later moved into a `document.body` portal in v3.104.
That placement is load-bearing: a high z-index inside the chart's stacking
context did not reliably clear fixed navigation. The dialog is also centered,
width-limited, and vertically scrollable so it fits small screens. That change
shipped as v3.104 (`3.104.0` in `package.json`).

v3.105 strengthens the Companies page distinction. The earlier single 10%
corner glow was too faint to communicate a page change; a restrained violet
canvas plus two soft gradients now differentiates the destination without
changing card contrast. The next material change is v3.106.

v3.106 routes scoped donut company slices and legend rows through the same
half-second loading treatment as top navigation. The overlay is portaled to
`document.body` so chart stacking contexts cannot hide it. The next material
change is v3.107.

v3.107 fixes the phone scatterplot's collapsed field. `flex-1` set a zero flex
basis in the mobile column and reduced the intended 450px canvas to 150px.
Mobile now uses a fixed flex item; desktop keeps flexible growth. The next
material change is v3.108.

v3.108 renames the card “Company size vs. profitability” and moves the year,
segment, and per-employee context into a separate responsive line. This avoids
an ambiguous title and cramped mobile wrapping. The next material change is
v3.109.

v3.109 adds compact upward and rightward markers beside the scatter controls.
They are ordinary flex items rather than canvas overlays, so they remain inside
the card and reflow with phone controls. The next material change is v3.110.

v3.110 restores visible Chart.js axis titles. Each title follows the selected
metric and adds “per employee” only for money metrics in that basis. Keeping
the labels in the chart layout lets Chart.js align them without viewport
overflow. The next material change is v3.111.
