# Future features

Planned but **not yet built** — a roadmap, not active behaviour. Each item lists
why, rough effort, and the open questions to resolve before starting. Promote one
by building it and moving its spec into the code + CLAUDE.md.

---

## 1. Self-source data from state registries (reduce rekvizitai dependence)

rekvizitai.vz.lt is itself an **aggregator** — it republishes official Lithuanian
state-registry data with its own credit scoring on top. Sources:

- **Registrų centras** (Centre of Registers) — company register: legal details,
  directors, addresses, and the filed annual financial statements.
- **Sodra** (State Social Insurance Fund) — employee headcount + average insured
  income, updated **monthly** (the freshest data on the site).
- **VMI** (State Tax Inspectorate) — tax-debt status, VAT-payer info.
- **Courts / AVNT insolvency register** — bankruptcy / restructuring flags.

We can self-source the **free layers** directly and cut dependence; the financial
statements stay the paid/hard core (which is exactly rekvizitai's value-add).

Ranked by effort vs payoff:

| Source | Effort | What we get | Notes |
| --- | --- | --- | --- |
| 🟢 **Sodra** | low | employees, avg insured income, social-insurance debt — monthly, back to 2009 | `atvira.sodra.lt` + `data.gov.lt/apdraustieji`, CSV/API. Freshest fields, months ahead of filed financials. **Do first.** |
| 🟠 **VMI** | low–med | VAT-payer registry, tax-debtor list | free downloads; good for a risk/health flag, not revenue/profit |
| 🟠 **Courts / insolvency** | low–med | bankruptcy / restructuring "in trouble" flag | AVNT insolvency register, public + structured |
| 🔴 **Registrų centras** | high | registry basics open; **full financial statements are paid** | turnover/profit (our core data) is a paid per-document service; this is why rekvizitai is convenient |

**Caveats**
- The sandbox can't fetch external sites (CLAUDE.md) — any ingester runs **locally**, like the existing `scripts/scrape_company.py`.
- Sodra "salary" is **insured income**, which differs slightly from rekvizitai's `avgSalary` — reconcile the definition before mixing sources.
- Financials **lag** (annual statements appear months after year-end) while Sodra figures are near-current — so in the Rekvizitai tab, headcount/salary rows are more up-to-date than profit/turnover rows.

**Status:** Sodra spike done on the `sodra` branch — `scripts/scrape_sodra.py`
fetches a company's monthly history into `data/sodra/<jarCode>.json`.

Sodra has a clean **open JSON REST API** (no HTML scraping needed):
- search: `GET /imones-rest/solr/page?text=<jarCode>` → resolves the internal
  `code` + latest `lastAvgWage` / `lastNumInsured` / activity / municipality
- history: `GET /imones-rest/values/monthly/page?codes=<code>&size=N` → monthly
  `avgWage`, `numInsured`, `tax` (data available 2018-01 → present)
- keyed by **jarCode** = the "Įmonės kodas" the rekvizitai scrape already captures,
  so the two sources join cleanly per company.

Spike caveat found: Sodra **suppresses avgWage for single-employee companies**
(privacy) — 6 vijos (1 insured) returns 22 months of headcount but null wages.
Multi-employee firms (e.g. Adell/Ogilvy) will return real wages. Not yet wired
into the Rekvizitai page UI — next step is a Sodra source/sub-tab there.

---

## 2. Lithuanian (LT) translation / i18n

The dashboard UI is English over Lithuanian data. Add a language toggle (LT / EN)
so the owner and Lithuanian users can read the interface in Lithuanian.

- Scope: nav, section headings, KPI labels, chart titles/axes, Data Explorer +
  Rekvizitai tab labels, the changelog modal chrome (not the data values).
- Approach: a string table keyed by an `i18n` map + a language pill in the nav
  (mirrors the theme toggle; persist choice to localStorage).
- Open question: translate the analytical "Key insights" prose too, or UI chrome
  only at first?

---

## 3. Supabase integration

Move from a self-contained static `index.html` (data embedded at build time) to a
Supabase backend, so data can update without a rebuild and could be written to.

- Use cases: store the scraped per-company data (rek + Sodra) in Postgres; serve
  it to the page via the Supabase JS client instead of the `__REK_DATA__` /
  `__DATA__` build-time injection; optional auth for owner-only edits.
- Fits the existing DB rule **DATA-30** (composite natural primary keys, e.g.
  `company_code + year + source`) — no surrogate `id`.
- Open questions: keep the static build as an offline fallback? Which tables go
  first (companies, financials, sodra_monthly)? Free tier limits vs dataset size.
- Caveat: introduces a network dependency + keys; the current "open the file, no
  server" simplicity is a feature worth preserving as a fallback.
