import { APP_VERSION_LABEL } from "@/app-version";
import { loadMarketData } from "@/features/market-rough/data";
import { fmtEur, fmtInt } from "@/features/market-rough/format";
import { marketTotals } from "@/features/market-rough/metrics";
import styles from "./page.module.css";

export default function Home() {
  const model = loadMarketData();
  const totals = marketTotals(model.rows, model.last);

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
          <h2>Market snapshot {model.last}</h2>
          <div className={styles.kpis}>
            <p>
              <b>{fmtInt(totals.count)}</b>
              <span>companies</span>
            </p>
            <p>
              <b>{fmtEur(totals.revenue)}</b>
              <span>revenue</span>
            </p>
            <p>
              <b>{fmtEur(totals.profit)}</b>
              <span>profit</span>
            </p>
            <p>
              <b>{fmtInt(totals.employees)}</b>
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
