import { Footer } from "@/components/ui/footer";
import { ViewGroupCard } from "@/features/market-rough/ViewSync";
import { HeroTitle } from "@/features/market-rough/HeroTitle";
import { BottomBar } from "@/features/market-rough/BottomBar";
import { CompanyStrip } from "@/features/market-rough/CompanyStrip";
import { loadMarketData } from "@/features/market-rough/data";
import { MarketAllTime, MarketPerYear } from "@/features/market-rough/MarketsView";
import { TopCards } from "@/features/market-rough/TopCards";
import { TopNav } from "@/features/market-rough/TopNav";
import { Bloom } from "@/components/ui/bloom";
import events from "../../data/data_events.json";

/**
 * Newest `at` in the data-change audit log, as "22 Jul 2026" — written by the
 * scrapers themselves, so nothing here is hand-maintained.
 *
 * Formatted in UTC on purpose. The stamps carry mixed offsets ("…Z" and
 * "+03:00") and the page is prerendered, so without a fixed zone the date
 * would follow whatever timezone the BUILD MACHINE happens to run in — a
 * late-evening scrape then renders as the next day.
 */
function lastUpdated() {
  const latest = events.events.reduce((a, e) => (e.at > a ? e.at : a), "");
  return new Date(latest).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
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
          <HeroTitle defaultYear={model.last} />
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

        {/* Names the count above it: every tracked agency on one line, so the
            "132" stops being an abstraction. */}
        <CompanyStrip model={model} />

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
