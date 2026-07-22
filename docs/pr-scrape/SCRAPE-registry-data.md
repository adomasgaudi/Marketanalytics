# Scraping the registries (turnover, profit, tax, payroll)

> v3.42. Written 2026-07-23. The official sources — Registrų centras, VMI, Sodra.
> For rekvizitai.vz.lt see [SCRAPE-how-to.md](SCRAPE-how-to.md); it is now a
> **fallback**, not a primary source. Evidence for everything here:
> [../research/fresher-company-data-sources.md](../research/fresher-company-data-sources.md).

## Read this first: there are two RC channels, and one is months stale

Registrų centras publishes the same filings twice, and the difference is the
single most important fact on this page.

| Channel | Freshness on 2026-07-23 | Shape |
| --- | --- | --- |
| **RC's own bulk dump** `registrucentras.lt/aduomenys/` | FY2025, regenerated **daily** | 138 MB CSV, whole file |
| data.gov.lt Spinta API `get.data.gov.lt` | newest `reg_date` 2026-03-03, **no FY2025 at all** | per-company REST query |

Same registry. The mirror's harvest is what lags, not RC's publication. If a
year looks missing, check the bulk dump before concluding the filing does not
exist.

Do not delete the Spinta scraper: it is the only **per-company query** API, it
carries the deep history (2015–2024), and the two agree exactly — verified on
the 130 FY2024 filings both hold, zero disagreements.

## The scrapers

| Script | Source | Writes | Run when |
| --- | --- | --- | --- |
| `scripts/data/scrape_rc_bulk.py` | RC bulk dump | `data2/rc_bulk.json` | after filing season, see calendar |
| `scripts/data/scrape_gov.py` | data.gov.lt Spinta | `data2/gov_finance.json` | any time; for history + VMI taxes |
| `scripts/data/scrape_sodra.py` | sodra.lt | `data2/sodra_months.json` | monthly |
| `scripts/data/build_rek_finance.py` | reshapes `data/rek_tabs.json` | `data2/rek_finance.json` | after a rekvizitai scrape |

```bash
python3 scripts/data/scrape_rc_bulk.py            # current registration year
python3 scripts/data/scrape_rc_bulk.py 2026 2025  # named years
python3 scripts/data/scrape_gov.py --all
```

## The filename trap: registration year ≠ fiscal year

```
https://www.registrucentras.lt/aduomenys/?byla=JAR_FA_RODIKLIAI_PLNA_<YEAR>_n.csv
```

`<YEAR>` is the year a statement was **REGISTERED**, not the year it covers.
`PLNA_2026_n.csv` holds 415k FY2025 statements plus a long tail of late filings
back to 2015 — every row in it has a 2026 `reg_date`.

**To reach fiscal year N, fetch file N+1.** Scrape two years to catch late
filers.

Only the `_n` names exist. `PLNA_2025.csv` without the suffix, and
`..._BALA_...` for balance sheets, do **not** exist — and a missing file answers
**HTTP 200 with an HTML error page** rather than 404ing. Never trust the status
code; check that the payload starts with `ja_kodas|`.

## When to scrape — the Lithuanian filing calendar

Companies file the previous year's statement by **~May–June**. So:

| Month | State |
| --- | --- |
| Jan–Apr | Last year's figures barely exist. Do not bother. |
| **May–Jul** | The wave lands. **This is when to re-scrape.** |
| Aug–Dec | Stable; only late filers trickle in. |

Observed: FY2025 statements carry `reg_date` from 2026-01 to 2026-06, clustered
in April–May. As of 2026-07-23 we have FY2025 for 127 of 131 companies. The 4–6
permanently missing are companies that simply have not filed.

**Do not re-scrape monthly.** It is a 138 MB download that will not have changed.

## Traps, each of which silently corrupts data rather than erroring

1. **Two spellings of the pre-tax line.** The file contains both
   `PELNAS (NUOSTOLIAI) PRIEŠ APMOKESTINIMĄ` (77,612 rows) and a mis-cased
   `PRIEš … APMOKESTINIMą` (34,372). Matching on `line_name` drops **31%** of
   pre-tax values. **Always key on `line_type_id`.** The code map is in both
   `scrape_rc_bulk.py` and `scrape_gov.py` — keep them in sync.
2. **Filings repeat.** The same figure appears under several
   `template_id`/`statusas` combinations, and corrections are refiled. Dedupe on
   `(company, fiscal year, metric)` keeping the **newest `reg_date`**.
3. **VMI taxes are cumulative from January.** `suma` at `menuo=12` is a full
   year; the current year holds one row at the latest closed month. A monthly
   figure only exists by differencing consecutive scrapes, and it resets each
   January. VMI keeps **no** monthly history.
4. **Non-profits file different lines.** `PAJAMOS`,
   `VEIKLOS REZULTATAS PRIEŠ APMOKESTINIMĄ`, `GRYNASIS VEIKLOS REZULTATAS`
   (~21.5k rows each). Their codes are already in the map.
5. **`turnover`, never `revenue`.** The source line is `PARDAVIMO PAJAMOS` —
   total sales including media billed on to a client. Legacy `data.json` calls
   it `revenue`; that name is wrong and is being retired.
6. **Portal cadence metadata lies.** Three declared cadences on data.gov.lt were
   disproved; `ja_mokesciai` showed a 3.5-month gap against a claimed monthly
   refresh. Measure, do not read the field.

## What does NOT exist — stop looking

- **Per-company monthly turnover or profit.** VMI's VAT data (FR0600) and EU
  sales list (FR0564) are both aggregated by NACE × county, with a taxpayer
  count per cell. Checked directly. There is no jarCode in either.
- **A balance-sheet bulk dump.** Only the Spinta `balanso_ataskaitos` model, and
  it carries top-level aggregates only — no P&L lines.
- **Sodra on the Spinta API.** `gov/sodra` 404s; Sodra is absent from the machine
  API entirely. The sodra.lt scrape stays.
- **A commercial source worth paying for.** Creditinfo, Coface, Scoris, Orbis and
  Okredo all resell these same RC filings, none publishes pricing or a freshness
  commitment, and none was shown to beat the free dump.

Per-company data that IS monthly, none of it turnover:
`gov/vmi/ja_nepriemokos/NepriemokosSuma` (tax arrears, daily, since 2023-03),
`gov/vmi/ja_mokesciai/Moketojas` (taxes paid), `gov/vmi/mm_registras/MokesciuMoketojas`
(VAT registration events, no monetary fields). Spinta's `/Model/:changes/`
endpoint can build history going forward but is **purged after weeks** and
cannot backfill.

## Rules for adding a source

Every figure on `/explore/model` carries a mark saying which scrape it came
from. A new source is not wired in until it has one.

- Add a `Provenance` in `src/features/explore/model-data.ts` — `mark`, `label`,
  and the scrape instant `at`.
- Marks in use: `◻` data.gov.lt · `◆` RC bulk · `◼¹²³` rekvizitai instances.
- Where one source has several scrape dates, the mark carries a **superscript
  instance number**, oldest first, so two figures from different runs are
  visibly different.
- **Precedence is gap-filling, not overriding**: gov → rc → rek. A later source
  only fills what the earlier one left empty. Never let a resale silently
  replace a filed figure.
- Write the scrape timestamp INTO the data file. `rek_tabs.json` did not, and
  its dates had to be reconstructed by walking git history and hashing each
  company's rows (`build_rek_finance.py`). Do not repeat that.

## Licence — unresolved, read before publishing

The RC `/aduomenys/` page is a client-side SPA that returns a 21-character shell
to any non-JS fetch, so its terms could not be read. A claim that these dumps are
CC BY 4.0 was **refuted** during research. What is verified is only *behaviour*:
the file serves over plain HTTP with no key, no auth, no cookie. Treat reuse
terms as **unknown** and resolve with RC before republishing the raw file.

Politeness: it is a 138 MB static file regenerated once a day. Fetch it a couple
of times a year, not on a schedule.
