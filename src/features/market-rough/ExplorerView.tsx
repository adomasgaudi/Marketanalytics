import styles from "./rough.module.css";
import type { MarketModel } from "./types";

export function ExplorerView({ model }: { model: MarketModel }) {
  return (
    <section className={styles.section} id="explorer">
      <div className={styles.sectionHead}>
        <p>Explorer</p>
        <h2>Data inventory</h2>
      </div>
      <div className={styles.inventory}>
        <span>{model.rows.length} company-year rows</span>
        <span>{model.brands.length} brands</span>
        <span>{model.years[0]}-{model.latestYear}</span>
      </div>
    </section>
  );
}
