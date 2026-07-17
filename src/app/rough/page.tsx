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
      <div className="mx-auto w-full max-w-[840px] px-6 py-6">
        <header className="mt-1.5 mb-5">
          <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.5px]">
            Markets{" "}
            <span className="text-accent underline decoration-dotted underline-offset-[5px]">
              per year
            </span>
          </h1>
          <p className="text-muted mt-1.5 text-[13.5px]">
            Lithuanian marketing &amp; communications agencies · {model.years[0]} to{" "}
            {model.years[model.years.length - 1]}
          </p>
        </header>
        <MarketsView model={model} />
        <CompaniesView model={model} />
        <ExplorerView model={model} />
      </div>
    </main>
  );
}
