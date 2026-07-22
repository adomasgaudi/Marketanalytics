import { readFileSync } from "node:fs";
import path from "node:path";
import { Footer } from "@/components/ui/footer";
import { Coverage } from "@/features/explore/Coverage";
import { DataChanges } from "@/features/explore/DataChanges";
import { ExploreView } from "@/features/explore/ExploreView";
import type { RekTabsFile } from "@/features/explore/FieldData";
import { loadMarketData } from "@/features/market-rough/data";
import { loadProfiles } from "@/features/market-rough/profile";
import { TopNav } from "@/features/market-rough/TopNav";

/**
 * The v3 Data-exploration page — the legacy rekView copied over: company
 * picker + field data, coverage grid, data-changes log, raw Excel sheets.
 * Linked from the (Dev-mode-only) "Explore the raw data & sources" buttons.
 */
/** rek_tabs.json carries no Sodra data — attach data/sodra/<slug>.json per
    company on the server, exactly as the legacy build_site.py did at build
    (the legacy joined on Įmonės kodas; the files are now named by slug). */
let rekTabsCache: RekTabsFile | undefined;

function loadRekTabsWithSodra(): RekTabsFile {
  if (rekTabsCache) return rekTabsCache;
  const file = JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "rek_tabs.json"), "utf8"),
  ) as RekTabsFile;
  for (const company of file.companies ?? []) {
    if (!company.slug) continue;
    try {
      company.sodra = JSON.parse(
        readFileSync(
          path.join(process.cwd(), "data", "sodra", `${company.slug}.json`),
          "utf8",
        ),
      );
    } catch {
      /* no sodra file for this company */
    }
  }
  rekTabsCache = file;
  return file;
}

export default function ExplorePage() {
  const model = loadMarketData();
  const profiles = loadProfiles();
  const tabs = loadRekTabsWithSodra();

  return (
    <main>
      <TopNav />
      <div className="wrap mx-auto w-full max-w-[1500px] px-[clamp(16px,5vw,48px)] pt-6 pb-[84px]">
        <header className="mt-1.5 mb-[22px]">
          <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.5px]">
            Data exploration
          </h1>
          <p className="text-muted mt-1.5 text-[13.5px]">
            Raw data &amp; sources for the {model.brands.length} tracked agencies
          </p>
        </header>

        {/* The raw Excel sheets now live on their own full-screen page — the
            grid needs the whole viewport to be usable. */}
        <a
          href="/explore/sheets"
          className="border-line bg-panel2 text-muted hover:text-ink mb-3.5 inline-block rounded-lg border px-4 py-2 text-[13px] font-semibold transition-colors"
        >
          📑 Initial data — the source workbook (full screen) →
        </a>

        {/* The rebuilt dataset: same grid, columns filled in as the new
            Sodra + registry pipeline is built. */}
        <a
          href="/explore/model"
          className="border-line bg-panel2 text-muted hover:text-ink mb-3.5 ml-2 inline-block rounded-lg border px-4 py-2 text-[13px] font-semibold transition-colors"
        >
          🧮 Rebuilt data — the new model (full screen) →
        </a>

        <ExploreView model={model} profiles={profiles} tabs={tabs}>
          {/* One wrapper element: an RSC-serialized child array would demand
              list keys and warn regardless of static JSX. */}
          <div>
            <Coverage model={model} />
            <DataChanges />
          </div>
        </ExploreView>

        <Footer />
      </div>
    </main>
  );
}
