import { fmtInt, fmtM } from "./format";
import styles from "./rough.module.css";
import type { MarketModel } from "./types";
import { YearTabs } from "./YearTabs";

export function MarketsView({ model }: { model: MarketModel }) {
  return (
    <section className={styles.section} id="markets">
      <div className={styles.sectionHead}>
        <p>Markets</p>
        <h1>Market data {model.latestYear}</h1>
      </div>
      <YearTabs model={model} />
      <div className={styles.kpis}>
        <article>
          <span>Companies</span>
          <b>{fmtInt(model.latestRows.length)}</b>
        </article>
        <article>
          <span>Revenue</span>
          <b>{fmtM(model.totals.revenue)}</b>
        </article>
        <article>
          <span>Profit</span>
          <b>{fmtM(model.totals.profit)}</b>
        </article>
        <article>
          <span>Employees</span>
          <b>{fmtInt(model.totals.employees)}</b>
        </article>
      </div>
    </section>
  );
}
