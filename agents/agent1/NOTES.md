# agent1 — data2 rebuild, Sodra + registry

## In 30 words

Rebuilt the dataset in `data2/` from registries. Turnover, profit and payroll are now
sourced; only the 0.43 opex share is guessed. Legacy wages overstate by 5–50%.
`/explore/model` renders it.

## In 300 words

**What changed.** `data/` is legacy — figures typed or estimated years ago, origin
unrecoverable. `data2/` holds only what a public registry answered for. Two scrapers
feed it, both driven by `data2/companies.json`, the hand-maintained list of which
agencies exist (131 of 132 have a jarCode; Madiavo has none). 14 codes were found by
web search and verified against VMI — several brands hide behind unrelated legal
names, e.g. Convo is UAB "Sėkmingi", RAIBEC is UAB "LITS", so name search cannot
find them.

**Vocabulary, fixed deliberately.** `turnover` = PARDAVIMO PAJAMOS, total sales
including media billed on to a client. It was called `revenue` and was renamed in
DATA-57 — *revenue* is reserved for what the agency keeps. `pass-through` is the
residual that flows out to media owners.

**The finding that matters.** The legacy payroll is one month × 12. Sodra publishes
every month, so the real bill is Σ(month wage × that month's headcount). Across 443
comparable company-years the legacy figure overstates in 78%, median −5%, worst
−54% (Partizanas). Wages are the base of every derived figure, so everything
downstream inherited that error.

**The model.** `netRevenue = payroll × 1.0177 × 1.43 + pretax`. Constants live in
`MODEL` in `src/features/explore/model-data.ts`. 1.0177 is the employer's Sodra;
0.43 is the opex assumption and the only guess. The old `÷0.84` is obsolete —
it reconstructed pre-tax profit, which the registry files directly.

**Rules that were enforced.** Data commits stand alone, subject names what was
found. Sourced beats derived. A blank cell means no filing and is never guessed.
Never sum an average — headcount averages, payroll sums.

**Concurrent agents.** Another agent added `data2/rek_finance.json` and provenance
marks (◻ RC, ◼ⁿ rekvizitai). A merge silently dropped a join loop once — after any
rewrite, check the values actually populate, not just that the row exists.
