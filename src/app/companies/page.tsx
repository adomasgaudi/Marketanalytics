import { Bloom } from "@/components/ui/bloom";
import { Footer } from "@/components/ui/footer";
import { CollapsibleCard } from "@/components/ui/group";
import { ViewGroupCard, ViewWord } from "@/features/market-rough/ViewSync";
import { BottomBar } from "@/features/market-rough/BottomBar";
import {
  CompanyAllTime,
  CompanyPerYear,
  CompanyPicker,
} from "@/features/market-rough/CompaniesView";
import { loadMarketData } from "@/features/market-rough/data";
import { loadProfiles } from "@/features/market-rough/profile";
import { RankingsChart } from "@/features/market-rough/RankingsChart";
import { TopNav } from "@/features/market-rough/TopNav";

/**
 * The Companies view — mirrors the legacy companiesView: hero, the gold
 * "Financials" card (hoisted company picker + per-year/all-time tabs), the
 * collapsible rankings card, the deep-dive, and its own bottom bar.
 */
export default function CompaniesPage() {
  const model = loadMarketData();
  const profiles = loadProfiles();

  return (
    <main>
      <TopNav active="companies" />
      <div className="wrap mx-auto w-full max-w-[840px] px-6 pt-6 pb-[84px]">
        {/* Same hero treatment as Markets: oversized title over a soft accent
            bloom that bleeds past the 840px column. */}
        <header className="relative isolate mt-1.5 mb-8">
          <Bloom
            color="accent"
            opacity={16}
            className="-top-24 -left-[20vw] h-[380px] w-[80vw]"
          />
          {/* Eyebrow above the title, same treatment as the Markets page. */}
          <p className="text-muted mb-2 text-[11px] font-semibold tracking-[.18em] uppercase">
            Profiles, rankings &amp; deep-dives · {model.brands.length} tracked agencies
          </p>
          <h1 className="text-[clamp(42px,9vw,72px)] leading-[0.95] font-extrabold tracking-[-0.035em]">
            Companies <ViewWord scope="co" />
          </h1>
          <div className="from-accent mt-5 h-px w-full bg-gradient-to-r to-transparent opacity-40" />
        </header>

        {/* Page-level, like the legacy liftCompanyControls: the picker scrolls
            away; the compare pills stick for the WHOLE Companies page. */}
        {/* NOT wrapped in a bloom container — an extra ancestor box would clamp
            the sticky compare pills to it instead of the whole page. */}
        <CompanyPicker model={model} profiles={profiles} />

        <ViewGroupCard
          title="Financials"
          scope="co"
          gold
          tabs={[
            {
              label: `Company ${model.last}`,
              content: <CompanyPerYear model={model} profiles={profiles} />,
            },
            { label: "Company all time", content: <CompanyAllTime model={model} /> },
          ]}
        ></ViewGroupCard>

        <div className="relative isolate">
          <Bloom
            color="gold"
            opacity={8}
            blur={90}
            className="-top-24 -left-[10vw] h-[420px] w-[70vw]"
          />
          <CollapsibleCard title="Company rankings">
            <RankingsChart model={model} />
          </CollapsibleCard>
        </div>

        <a
          href="/explore"
          className="explore-btn border-line bg-panel2 text-muted hover:text-ink mt-2 inline-block rounded-lg border px-4 py-2.5 text-[14px] font-semibold transition-colors"
        >
          Explore the raw data &amp; sources →
        </a>
        <Footer />
      </div>
      <BottomBar model={model} mode="company" />
    </main>
  );
}
