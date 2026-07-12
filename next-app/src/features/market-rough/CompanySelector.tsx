import styles from "./rough.module.css";
import type { MarketModel } from "./types";

export function CompanySelector({ model }: { model: MarketModel }) {
  const visibleBrands = model.brands.slice(0, 8);

  return (
    <div className={styles.companySelector}>
      <button className={styles.selectButton} type="button">
        <span>Company</span>
        <b>{visibleBrands[0] ?? "Select"}</b>
      </button>
      <div className={styles.companyChips} aria-label="Company shortcuts">
        {visibleBrands.map((brand) => (
          <button key={brand} type="button">
            {brand}
          </button>
        ))}
      </div>
    </div>
  );
}
