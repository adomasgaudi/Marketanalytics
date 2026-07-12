import { CompanySelector } from "./CompanySelector";
import { fmtM } from "./format";
import styles from "./rough.module.css";
import type { MarketModel } from "./types";

export function CompaniesView({ model }: { model: MarketModel }) {
  const topCompanies = [...model.latestRows]
    .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
    .slice(0, 10);

  return (
    <section className={styles.section} id="companies">
      <div className={styles.sectionHead}>
        <p>Companies</p>
        <h2>Top revenue companies</h2>
      </div>
      <CompanySelector model={model} />
      <div className={styles.table}>
        {topCompanies.map((row) => (
          <div key={`${row.brand}-${row.year}`} className={styles.row}>
            <span>{row.brand}</span>
            <b>{fmtM(row.revenue ?? 0)}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
