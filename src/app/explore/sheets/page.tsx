import { WorkbookViewer } from "@/features/explore/WorkbookViewer";
import { TopNav } from "@/features/market-rough/TopNav";
import "./workbook-viewer.css";

/**
 * Initial data — the source workbook, filling whatever height the nav leaves so
 * the grid reads like Google Sheets / Excel. TopNav stays (it owns the theme,
 * palette and Dev-mode switches, which the viewer follows); no page header or
 * Footer, everything below the nav is table. The viewer's own "⛶ Full screen"
 * still hides all of it. Its stylesheet is scoped to .wbv, hence the local import.
 */
export default function SheetsPage() {
  return (
    <main className="flex h-screen min-h-0 flex-col">
      <TopNav />
      <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden px-[clamp(8px,1.5vw,20px)] py-2">
        <WorkbookViewer />
      </div>
    </main>
  );
}
