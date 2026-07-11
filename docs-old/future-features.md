# Future Features

> v91.15. Feature numbering merged into the title column.

Planned work, not current behavior. Promote a row by resolving its open decisions,
building it, and moving its final contract into active project documentation.

| Feature | Why | Approach and current state | Open decisions and constraints |
| --- | --- | --- | --- |
| **1. Self-source registry data** | Reduce Rekvizitai dependence and improve freshness. | **Sodra:** implemented via `scripts/scrape_sodra.py`; joins `data/sodra/<jarCode>.json` by `Įmonės kodas`. **Next:** VMI tax/VAT data, AVNT/court insolvency flags, Registrų centras legal data. | Registrų centras financial statements remain paid. Sodra insured income differs from `avgSalary`, financials lag monthly payroll data, and one-person wages are suppressed. |
| **2. Lithuanian i18n** | Make the English interface usable for Lithuanian users. | Add an LT/EN nav pill, persisted in `localStorage`; translate navigation, headings, KPIs, charts, Explorer/Rekvizitai tabs, and changelog chrome through one keyed string map. | Translate analytical insight prose immediately, or UI chrome first? Data values remain unchanged. |
| **3. Supabase backend** | Update and write data without rebuilding the static HTML; optionally restrict edits. | Store companies, financials, Rekvizitai, and Sodra in Postgres; serve through Supabase instead of build-time `__DATA__`/`__REK_DATA__`; use composite natural keys such as `company_code + year + source`. | Preserve static/offline fallback? Which tables migrate first? Confirm free-tier limits, authentication scope, network dependency, and key handling. |
| **4. Source provenance** | Make every displayed statistic independently checkable. | KPI, chart point, or table cell reveals source, field, year, raw value, and an anchor into Data Explorer; aggregates expose formula and inputs. | Cover leaf values first or every aggregate immediately? Define a compact hover/tap interaction. |
| **5. Financial forecasts** | Turn historical comparison into forward-looking analysis. | Start with explainable CAGR, linear, or last-three-year trends; extend existing lines with dashed projections for turnover, fee revenue, profit, and headcount. | Must ship with uncertainty (#6). Forecast company or segment level? Reconcile partial-current Sodra signals with lagging financials. |
| **6. Uncertainty ranges** | Prevent false precision in `estimatedIncome`, forecasts, and medians. | Show shaded chart bands and `±` KPI ranges derived from model residuals or segment spread. | Choose 50/80/95% confidence; define the fee-income error model separately from forecast uncertainty. |
| **7. Alternate groupings** | Compare the market by scale, maturity, and geography, not only activity. | Reuse segment aggregation with alternate key functions and a **Group by** pill: employees `1–10`, `11–50`, `51–200`, `200+`; company-age buckets; city; sorting and collapse controls. | Founding year exists only for scraped companies, so define missing-data behavior and coverage requirements. |
