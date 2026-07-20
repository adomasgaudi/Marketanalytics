import { Footer } from "@/components/ui/footer";
import { ViewGroupCard, ViewWord } from "@/features/market-rough/ViewSync";
import { BottomBar } from "@/features/market-rough/BottomBar";
import { loadMarketData } from "@/features/market-rough/data";
import { MarketAllTime, MarketPerYear } from "@/features/market-rough/MarketsView";
import { TopCards } from "@/features/market-rough/TopCards";
import { TopNav } from "@/features/market-rough/TopNav";
import { Bloom } from "@/components/ui/bloom";
import events from "../../data/data_events.json";

/** Newest `at` in the data-change audit log, as "9 Jul 2026". */
function lastUpdated() {
  const latest = events.events.reduce((a, e) => (e.at > a ? e.at : a), "");
  return new Date(latest).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
      <div className="wrap mx-auto w-full max-w-[840px] px-6 pt-6 pb-[84px]">
        {/* Hero: oversized title over a soft accent bloom that bleeds past the
            840px column, so the page opens with one big visual beat. */}
        <header className="relative isolate mt-1.5 mb-[26px]">
          <Bloom
            color="accent"
            opacity={16}
            className="-top-24 -left-[20vw] h-[380px] w-[80vw]"
          />
          <p className="text-muted mb-2 text-[11px] font-semibold tracking-[.18em] uppercase">
            Lithuanian marketing &amp; communications · {model.years[0]}–
            {model.years[model.years.length - 1]}
          </p>
          <h1 className="text-[clamp(42px,9vw,72px)] leading-[0.95] font-extrabold tracking-[-0.035em]">
            Markets <ViewWord scope="mkt" />
          </h1>
          {/* Freshness marker: newest entry in the data-change audit log. */}
          <p className="text-muted mt-3 flex items-center gap-1.5 text-[11.5px]">
            <span className="bg-green inline-block h-1.5 w-1.5 rounded-full" />
            Data updated {lastUpdated()}
          </p>
          <div className="from-accent mt-5 h-px w-full bg-gradient-to-r to-transparent opacity-40" />
        </header>

        {/* Faint green wash behind the tracked-company figure, mirroring the
            hero bloom so the two opening blocks feel lit from the same source. */}
        <div className="relative isolate">
          <Bloom
            color="green"
            opacity={10}
            blur={80}
            className="-top-16 -right-[15vw] h-[300px] w-[60vw]"
          />
          <TopCards model={model} />
        </div>

        <div className="relative isolate">
          <Bloom
            color="purple"
            opacity={7}
            blur={90}
            className="-top-20 -left-[10vw] h-[420px] w-[70vw]"
          />
          <ViewGroupCard
            title="Market cash flow"
            scope="mkt"
            tabs={[
              { label: `Market ${model.last}`, content: <MarketPerYear model={model} /> },
              { label: "Market all time", content: <MarketAllTime model={model} /> },
            ]}
          ></ViewGroupCard>
        </div>

        <a
          href="/explore"
          className="explore-btn border-line bg-panel2 text-muted hover:text-ink mt-2 inline-block rounded-lg border px-4 py-2.5 text-[14px] font-semibold transition-colors"
        >
          Explore the raw data &amp; sources →
        </a>
        <Footer />
      </div>
      <BottomBar model={model} mode="market" />
    </main>
  );
}
