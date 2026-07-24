import { WorkbookViewer } from "@/features/explore/WorkbookViewer";
import { TopNav } from "@/features/market-rough/TopNav";
import "./workbook-viewer.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Source workbook",
  description:
    "The original source workbook rendered as a spreadsheet, with the disagreements the retired sheets recorded flagged in gold.",
  alternates: { canonical: "/explore/sheets" },
};

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
      <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-x-hidden px-[clamp(8px,1.5vw,20px)] py-2">
        <WorkbookViewer />
      </div>
    </main>
  );
}
