import { GroupCard } from "@/components/ui/group";
import { BottomBar } from "@/features/market-rough/BottomBar";
import { loadMarketData } from "@/features/market-rough/data";
import { MarketAllTime, MarketPerYear } from "@/features/market-rough/MarketsView";
import { TopCards } from "@/features/market-rough/TopCards";
import { TopNav } from "@/features/market-rough/TopNav";

/**
 * The Markets view — mirrors the legacy dashView: hero, top cards, one
 * "Market data" card with per-year/all-time tabs, footer, and the fixed
 * bottom bar carrying the year row + basis toggle.
 */
export default function MarketsPage() {
  const model = loadMarketData();

  return (
    <main>
      <TopNav active="markets" />
      <div className="mx-auto w-full max-w-[840px] px-6 pt-6 pb-[70px]">
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

        <TopCards model={model} />

        <GroupCard
          title="Market data"
          tabs={[
            { label: `Market ${model.last}`, content: <MarketPerYear model={model} /> },
            { label: "Market all time", content: <MarketAllTime model={model} /> },
          ]}
        />

        <a
          href="/v2"
          className="border-line bg-panel2 text-muted hover:text-ink mt-2 inline-block rounded-lg border px-4 py-2.5 text-[14px] font-semibold transition-colors"
        >
          Explore the raw data &amp; sources →
        </a>
        <footer className="text-muted mt-8 mb-2 text-[11px]">
          by adomasgaudi.github on behalf of Fabula, copyright.
        </footer>
      </div>
      <BottomBar model={model} mode="market" />
    </main>
  );
}
