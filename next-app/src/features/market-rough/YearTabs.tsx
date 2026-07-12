import styles from "./rough.module.css";
import type { MarketModel } from "./types";

export function YearTabs({ model }: { model: MarketModel }) {
  return (
    <div className={styles.yearTabs} aria-label="Years">
      {model.years.map((year) => (
        <button
          className={year === model.latestYear ? styles.activeTab : undefined}
          key={year}
          type="button"
        >
          {year}
        </button>
      ))}
    </div>
  );
}
