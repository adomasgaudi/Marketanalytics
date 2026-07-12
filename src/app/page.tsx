import { APP_VERSION_LABEL } from "@/app-version";
import { loadMarketData } from "@/features/market-rough/data";
import { fmtInt, fmtM } from "@/features/market-rough/format";
import styles from "./page.module.css";

export default function Home() {
  const model = loadMarketData();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>LT Market Analytics {APP_VERSION_LABEL}</h1>
          <p>
            Main Next.js dashboard track. The rough port stays available for comparison.
          </p>
        </div>
        <section className={styles.snapshot} aria-label="Market snapshot">
          <h2>Market snapshot {model.latestYear}</h2>
          <div className={styles.kpis}>
            <p>
              <b>{fmtInt(model.latestRows.length)}</b>
              <span>companies</span>
            </p>
            <p>
              <b>{fmtM(model.totals.revenue)}</b>
              <span>revenue</span>
            </p>
            <p>
              <b>{fmtM(model.totals.profit)}</b>
              <span>profit</span>
            </p>
            <p>
              <b>{fmtInt(model.totals.employees)}</b>
              <span>employees</span>
            </p>
          </div>
        </section>
        <div className={styles.ctas}>
          <a className={styles.primary} href="/rough">
            Open Rough Port
          </a>
        </div>
      </main>
    </div>
  );
}
