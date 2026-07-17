import { APP_VERSION_LABEL } from "@/app-version";
import { CompaniesView } from "@/features/market-rough/CompaniesView";
import { ExplorerView } from "@/features/market-rough/ExplorerView";
import { MarketsView } from "@/features/market-rough/MarketsView";
import { TopNav } from "@/features/market-rough/TopNav";
import { loadMarketData } from "@/features/market-rough/data";

/**
 * Server Component: the data is read and indexed here, once, and handed to the
 * views as props. Only the views that read URL state are client components.
 */
export default function RoughPage() {
  const model = loadMarketData();

  return (
    <main>
      <TopNav version={`${APP_VERSION_LABEL} rough`} />
      <div className="mx-auto max-w-[840px] p-6">
        <MarketsView model={model} />
        <CompaniesView model={model} />
        <ExplorerView model={model} />
      </div>
    </main>
  );
}
