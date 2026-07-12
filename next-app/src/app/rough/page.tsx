import { APP_VERSION_LABEL } from "@/app-version";
import { CompaniesView } from "@/features/market-rough/CompaniesView";
import { ExplorerView } from "@/features/market-rough/ExplorerView";
import { MarketsView } from "@/features/market-rough/MarketsView";
import { TopNav } from "@/features/market-rough/TopNav";
import { loadMarketData } from "@/features/market-rough/data";
import styles from "@/features/market-rough/rough.module.css";

export default function RoughPortPage() {
  const model = loadMarketData();

  return (
    <main className={styles.app}>
      <TopNav version={`${APP_VERSION_LABEL} rough`} />
      <div className={styles.wrap}>
        <MarketsView model={model} />
        <CompaniesView model={model} />
        <ExplorerView model={model} />
      </div>
    </main>
  );
}
