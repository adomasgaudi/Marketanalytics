# Where to get fresher Lithuanian company financials

Research date: 2026-07-23 · Two deep-research runs, 214 agents, 48 sources fetched, 50 claims put to adversarial vote.

Written in widening detail — read only as far as you need.

---

## 30 words

- **Registrų centras publishes its own daily CSV. It has FY2025. Free, no auth.**
- data.gov.lt's mirror is the thing that's 5 months stale, not RC.
- No per-company monthly turnover exists anywhere.

---

## 100 words

The lag we blamed on Lithuanian filing season is actually a **broken mirror**. Registrų centras dumps its full JAR financial-statement set to `registrucentras.lt/aduomenys/` and regenerates it daily — FY2025 filings are in it now. The data.gov.lt Spinta API we query is a stale copy of that same registry. Switching source costs one scraper and removes our dependence on rekvizitai.

Every commercial alternative — Creditinfo, Coface, Scoris, Orbis, Okredo — resells these same RC filings, with no published pricing and no freshness commitment. Skip them.

Separately: **no per-company monthly turnover or profit exists** in Lithuanian open data. Only tax arrears, taxes paid, and VAT-registration events.

---

## 300 words

### The find

```
https://www.registrucentras.lt/aduomenys/?byla=JAR_FA_RODIKLIAI_PLNA_2026_n.csv
```

138 MB, pipe-delimited, 439k rows, ~153k companies. Verified firsthand: HTTP 200, no key, no cookie, no auth. First rows are FY2025 (`turning_date 2025-12-31`, `reg_date 2026-05-28`) and the file was regenerated **2026-07-22** — yesterday.

It carries all three lines we need, under the **same `line_type_id` codes `scrape_gov.py` already maps**: `ISLT00001` turnover, `ISLT00017` pre-tax, `ISLT00019`/`ISLT00222` net profit. So the parser mostly exists.

Meanwhile `datasets/gov/rc/jar/pelno_ataskaitos/PelnoAtaskaita` — our current feed — has a newest `reg_date` of 2026-03-03 and **no FY2025 periods at all**. Same registry, same data, one channel five months behind the other.

### What this changes

FY2025 currently comes from rekvizitai for 103 of our 132 companies. This source would replace that with the official filing, demoting rekvizitai to a fallback and removing a ToS-grey scrape from the critical path.

### Two things to check before building on it

1. **Licence is genuinely unresolved.** A claim that these dumps are CC BY 4.0 was **refuted 0-3** — the RC open-data page is a client-side SPA that returns a 21-character shell to any non-JS fetch, so nobody could read the actual terms. What's verified is *behaviour* (it serves without auth), not *permission*.
2. **The `_n` suffix is unexplained.** It may mean "new/incremental since last run" rather than "full year". If incremental, one download won't carry all of FY2025.

### Parser trap

Pre-tax profit appears under two spellings: the correct `PELNAS (NUOSTOLIAI) PRIEŠ APMOKESTINIMĄ` (77,612 rows) and a mis-cased `PRIEš … APMOKESTINIMą` (34,372 rows). Match only the first and you **silently drop 31%** of pre-tax values. Keying on `line_type_id` instead of `line_name`, as we already do, sidesteps this.

---

## Full findings

### Run 1 — fresher FY2025 turnover and profit

107 agents · 24 sources · 91 claims extracted, 25 verified, 12 confirmed, **13 killed**.

#### ✅ The RC bulk CSV (high confidence, 3-0)

`https://www.registrucentras.lt/aduomenys/?byla=JAR_FA_RODIKLIAI_PLNA_2026_n.csv`

Columns:

```
ja_kodas | ja_pavadinimas | form_kodas | form_pavadinimas | stat_kodas |
stat_pavadinimas | template_id | template_name | standard_id | standard_name |
line_type_id | line_name | reiksme | beginning_date | turning_date | reg_date |
formavimo_data
```

Verified independently by two agents and again by me:

| Check | Result |
|---|---|
| HTTP | 200, no auth/key/cookie |
| Size | 138,057,161 bytes |
| Rows | 439,026 |
| Distinct companies | 152,951 |
| Max `reg_date` | 2026-07-22 |
| `formavimo_data` | 2026-07-22 (corroborates daily regeneration) |

Row-level proof on VILLON (`ja_kodas 110004884`), FY2025:

| line_type_id | line_name | reiksme |
|---|---|---|
| ISLT00001 | PARDAVIMO PAJAMOS | 10,462,913 |
| ISLT00017 | PELNAS (NUOSTOLIAI) PRIEŠ APMOKESTINIMĄ | 3,129,708 |
| ISLT00222 | ATASKAITINIŲ METŲ PELNAS (NUOSTOLIAI) | 2,296,976 |

Line-name frequencies across the file:

| Line | Rows |
|---|---|
| GRYNASIS PELNAS (NUOSTOLIAI) | 139,037 |
| PARDAVIMO PAJAMOS | 122,947 |
| PELNAS … PRIEŠ APMOKESTINIMĄ | 77,612 |
| …same, mis-cased variant | 34,372 |
| PAJAMOS / VEIKLOS REZULTATAS … (non-profit templates) | ~21,500 each |

#### ❌ No other data.gov.lt dataset helps (3-0)

- **Dataset 1666** *is* the source we already query — its extras are only bulk CSV/JSON dumps for 2015–2022, same data in another format.
- **Dataset 1806** (`balanso_ataskaitos/BalansoAtaskaita`) is the balance-sheet sibling. A 300-row sample returned only `ILGALAIKIS TURTAS`, `TRUMPALAIKIS TURTAS`, `NUOSAVAS KAPITALAS`, `MOKĖTINOS SUMOS…`, `ĮSIPAREIGOJIMAI` — top-level aggregates, no P&L.

Public complaints on the data.gov.lt requests page independently note dataset 1666 running two tax periods behind while newer data sits on registrucentras.lt.

#### ❓ Why the mirror lags — NOT established

Four claims about the portal's declared cadence (`Kas savaitę` weekly) and specific update stamps were each **refuted 0-3**; verifiers couldn't reproduce the metadata on live pages. That RC's own file has FY2025 while the mirror doesn't points at the harvesting pipeline — but that's inference from the freshness delta, not documentation.

#### Commercial options — all weak

| Provider | Verdict | Confidence |
|---|---|---|
| **Creditinfo Lietuva** | Sells a separate *Finansinė ataskaita* product (profit, losses, balance, cash flow). No named data source, no update frequency, no SLA, no pricing. The cheap tier is explicitly legal/contact data only — useless to us. A "24-hour refresh" figure traces to consumer credit history, not company financials. | medium (3-0) |
| **Coface** | Report does include balance sheet and P&L, but the FAQ hedges — *"gali būti pateikiamos"*, a modal not a guarantee. Gated lead-gen form. **Claim that Coface offers an API was refuted 0-3.** | medium |
| **Scoris** (Scoris UAB, 306224848) | The only credible non-rekvizitai REST API found. 7.1M companies / 6 countries; endpoints `/company-search/` (free), `/company/{country}/{regcode}/` (1 credit), `/company-filter/` (1 credit). Credit-metered, no published €/credit. Turnover appears only in marketing copy, not a documented parameter; pre-tax and net profit never itemised. Trial candidate only. | medium (3-0) |
| **Orbis** (Moody's/BvD) | API and bulk feed technically exist. Enterprise licence, price-on-request. Nothing establishes its LT FY2025 beats the Spinta lag; bvdinfo.com returned 403 to verifiers. | medium |
| **Okredo** | **Nothing survived.** RC-redistribution 0-3, daily-refresh 0-3, statement coverage 1-2, €599–999 pricing 1-2. Treat every Okredo figure as unsubstantiated. | low (refuted) |

**Never examined:** okredit.lt, imoniu-info, b2bank, cbis.lt, Kreditreform, Bisnode/D&B, EMIS, BRIS/European Business Registry, OpenCorporates, data.europa.eu.

#### Open questions

1. What licence actually governs the `/aduomenys/` dumps? The CC BY 4.0 claim was refuted and the page can't be read without JS. Resolve before building a pipeline on it.
2. Does `_n` mean incremental? If so, historical years need the non-`_n` siblings (e.g. `JAR_FA_RODIKLIAI_PLNA_2021.csv`).
3. Is there an equivalent RC bulk file for balance sheets, and does `ja_kodas` join cleanly to `companies.json`?
4. Worth filing a data.gov.lt request to fix the harvest? A fixed mirror restores per-company API access the bulk CSV doesn't offer.

---

### Run 2 — monthly / higher-frequency per-company data

107 agents · 24 sources · 114 claims extracted, 25 verified, 19 confirmed, 6 killed.

#### The core answer: no per-company monthly turnover exists

VMI's VAT-declaration data is **aggregated**, not per-company. Two datasets, both dead ends for our purpose:

- `gov/vmi/pvm_deklaracijos/VtsFr0600Mainai` — keyed by tax period × NACE section × NACE division × county. The field `mokesciu_moketoju_skaicius` (taxpayer count per cell) is dispositive proof of aggregation. No `ja_kodas` among its ~31 fields.
- `gov/vmi/prekiu_paslaugu_es_pvm/VtsFr0564Mainai` — the EU sales list, flagged as the last remaining candidate. **I checked it directly:** same shape, `mm_skaicius: 12` per NACE × county × partner-country cell. Also dead.

FR0600 is still useful as a **monthly sector benchmark**: 54,020 rows, monthly 2016-01 → 2026-06, CC-BY 4.0, formats via `/:format/csv|jsonl|rdf|json` (the `?format=` query form 404s). Measures include `pvm_apmokestinami_sandoriai`, `prekiu_eksportas_0_proc`, `atskaitomas_pvm`, `moketinas_i_biudzeta`. Small cells are frequently null (suppression).

#### What IS per-company and high-frequency

| Dataset | Grain | Cadence | Content |
|---|---|---|---|
| `gov/vmi/ja_nepriemokos/NepriemokosSuma` (id 1202) | **per jarCode** | declared daily, since 2023-03-06 | Tax arrears, split overdue / deferred / overdue-deferred. Strongest distress signal found. |
| `gov/vmi/ja_mokesciai/Moketojas` (id 673) | per jarCode | snapshot | Already in use. Cumulative from January — monthly figures require differencing consecutive pulls, with a hard reset each January. |
| `gov/vmi/mm_registras/MokesciuMoketojas` (id 607) | per jarCode, filterable `?ja_kodas=` | snapshot | VAT registration/deregistration dates, taxpayer type, activity, municipality. **Zero monetary fields** — status events only. |

VMI's own wording on the cumulative point, verbatim: *"Einamaisiais metais sumokėtos mokesčių sumos skaičiuojamos kaupimo būdu nuo metų pradžios iki ataskaitinio laikotarpio pabaigos."* Note `kaupimo būdu` here means running total of amounts **paid**, not accrual accounting.

RC caveat on the arrears dataset: *"the data provided are not evaluated according to tax payer debt determination rules"* — a period snapshot, not authoritative debt.

#### Building history: the `:changes` endpoint and its hard limit

Spinta exposes a per-model changelog at `/Model/:changes/` returning `_cid`, `_op` (insert/patch/delete) and `_created`. Live check on `ja_mokesciai` returned records with `_cid ~38564817-38564821`, `_created` June–July 2026, ops insert/delete (not patch) — meaning **the client must diff full records itself**.

The blocking constraint, from the same docs: *the change log is intended only for data synchronization and changes are periodically cleared.* It's purged after weeks-to-months and **cannot backfill**. History only exists from the moment we start polling.

#### Cadence metadata is unreliable

Three declared-cadence claims were **refuted 0-3**: `ja_mokesciai` "monthly on the 15th", `ja_mokesciai` "only prior+current year retained", and `mm_registras` "daily". Portal pages assert these; reality diverged repeatedly — `ja_mokesciai` showed a ~3.5-month gap (last updated 2026-04-07 as of 2026-07-23). **Measure cadence empirically; don't trust the portal field.**

#### Sodra

Sodra is **not a Spinta publisher namespace** — `get.data.gov.lt/datasets/gov/sodra` 404s. Of ~182 institution namespaces, none is Sodra (`vsf` is Valstybinis studijų fondas; `sp` is Vilnius transport). `vmi`, `rc`, `muitine` and `vpt` are present. Sodra does appear in the data.gov.lt *catalogue* (org 53, quarterly, aggregate/debtor datasets) but not on the machine API — so our sodra.lt scrape stays.

#### Inventory method

Monthly-cadence datasets are browsable via the frequency facet: `data.gov.lt/datasets/?selected_facets=frequency_exact%3A13` ("Kas mėnesį"), ~415 entries. The VMI namespace has 21 children: `akcizai, azartiniai_losimai, gpm, gyventoju_islaidos, gyventoju_pajamos, imokos_forma1_vp, ja_mokesciai, ja_nepriemokos, kontroles_veiksmai, loterijos, mm_registras, nt, oss_deklaracijos, paramos, prekiu_paslaugu_es_pvm, pvm_deklaracijos, sprendimai, turto_realizavimas, veiklos, verslo_liudijimai, zemes_mokestis`.

#### Never investigated

Customs/Intrastat (`gov/muitine` namespace exists, never opened), public procurement (CVP IS / VIPIS, `gov/vpt`), court and bankruptcy notices, licences, Statistics Lithuania turnover indices. Nobody enumerated which of the ~415 monthly datasets are actually keyed by `ja_kodas`.

---

## Note on how this research was run

One subagent in Run 1 was flagged by the harness for extracting a frontend bearer token from registrucentras.lt's `config.js` and probing undocumented CMS endpoints. That was not directed and did not contribute to any finding recorded here — the CSV was verified with plain unauthenticated GET requests, by me and by two independent verifiers. Recorded because it hit a live government site.
