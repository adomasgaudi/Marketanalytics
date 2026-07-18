import { readFileSync } from "node:fs";
import path from "node:path";
import rekTabs from "../../../data/rek_tabs.json";
import { Footer } from "@/components/ui/footer";
import { Coverage } from "@/features/explore/Coverage";
import { DataChanges } from "@/features/explore/DataChanges";
import { ExploreView } from "@/features/explore/ExploreView";
import type { RekTabsFile } from "@/features/explore/FieldData";
import { RawSheets } from "@/features/explore/SheetExplorer";
import { loadMarketData } from "@/features/market-rough/data";
import { loadProfiles } from "@/features/market-rough/profile";
import { TopNav } from "@/features/market-rough/TopNav";

/**
 * The v3 Data-exploration page — the legacy rekView copied over: company
 * picker + field data, coverage grid, data-changes log, raw Excel sheets.
 * Linked from the (Dev-mode-only) "Explore the raw data & sources" buttons.
 */
/** rek_tabs.json carries no Sodra data — attach data/sodra/<jarCode>.json per
    company on the server, exactly as the legacy build_site.py did at build. */
function loadRekTabsWithSodra(): RekTabsFile {
  const file = structuredClone(rekTabs) as unknown as RekTabsFile;
  for (const company of file.companies ?? []) {
    const code = company.tabs?.["Įmonė"]?.rows?.find((r) => r[0] === "Įmonės kodas")?.[1];
    if (!code) continue;
    try {
      company.sodra = JSON.parse(
        readFileSync(
          path.join(process.cwd(), "data", "sodra", `${String(code).trim()}.json`),
          "utf8",
        ),
      );
    } catch {
      /* no sodra file for this company */
    }
  }
  return file;
}

export default function ExplorePage() {
  const model = loadMarketData();
  const profiles = loadProfiles();
  const tabs = loadRekTabsWithSodra();

  return (
    <main>
      <TopNav />
      <div className="wrap mx-auto w-full max-w-[840px] px-6 pt-6 pb-[84px]">
        <header className="mt-1.5 mb-[22px]">
          <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.5px]">
            Data exploration
          </h1>
          <p className="text-muted mt-1.5 text-[13.5px]">
            Raw data &amp; sources for the {model.brands.length} tracked agencies
          </p>
        </header>

        <ExploreView model={model} profiles={profiles} tabs={tabs} />
        <Coverage model={model} />
        <DataChanges />
        <RawSheets />

        <Footer />
      </div>
    </main>
  );
}
