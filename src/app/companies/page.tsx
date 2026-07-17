import { CollapsibleCard } from "@/components/ui/group";
import { ViewGroupCard, ViewWord } from "@/features/market-rough/ViewSync";
import { BottomBar } from "@/features/market-rough/BottomBar";
import {
  CompanyAllTime,
  CompanyPerYear,
  CompanyPicker,
} from "@/features/market-rough/CompaniesView";
import { loadMarketData } from "@/features/market-rough/data";
import { DeepDive } from "@/features/market-rough/DeepDive";
import { RankingsChart } from "@/features/market-rough/RankingsChart";
import { TopNav } from "@/features/market-rough/TopNav";

/**
 * The Companies view — mirrors the legacy companiesView: hero, the gold
 * "Financials" card (hoisted company picker + per-year/all-time tabs), the
 * collapsible rankings card, the deep-dive, and its own bottom bar.
 */
export default function CompaniesPage() {
  const model = loadMarketData();

  return (
    <main>
      <TopNav active="companies" />
      <div className="mx-auto w-full max-w-[840px] px-6 pt-6 pb-[70px]">
        <header className="mt-1.5 mb-5">
          <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.5px]">
            Companies <ViewWord scope="co" />
          </h1>
          <p className="text-muted mt-1.5 text-[13.5px]">
            Profiles, rankings &amp; deep-dives for the {model.brands.length} tracked
            agencies
          </p>
        </header>

        <ViewGroupCard
          title="Financials"
          scope="co"
          gold
          hoisted={<CompanyPicker model={model} />}
          tabs={[
            { label: `Company ${model.last}`, content: <CompanyPerYear model={model} /> },
            { label: "Company all time", content: <CompanyAllTime model={model} /> },
          ]}
        ></ViewGroupCard>

        <CollapsibleCard title="Company rankings">
          <RankingsChart model={model} />
        </CollapsibleCard>

        <DeepDive model={model} />

        <a
          href="/v2"
          className="explore-btn border-line bg-panel2 text-muted hover:text-ink mt-2 inline-block rounded-lg border px-4 py-2.5 text-[14px] font-semibold transition-colors"
        >
          Explore the raw data &amp; sources →
        </a>
        <footer className="text-muted mt-8 mb-2 text-[11px]">
          by adomasgaudi.github on behalf of Fabula, copyright.
        </footer>
      </div>
      <BottomBar model={model} mode="company" />
    </main>
  );
}
