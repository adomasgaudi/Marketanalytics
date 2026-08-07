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
labels. The next material change must advance to v3.104 (`3.104.0` in
`package.json`).
