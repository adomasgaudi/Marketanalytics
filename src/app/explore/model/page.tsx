import { ModelSheet } from "@/features/explore/ModelSheet";
import { TopNav } from "@/features/market-rough/TopNav";
import "../sheets/workbook-viewer.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rebuilt dataset",
  description:
    "The rebuilt registry-sourced dataset as a full-screen sheet — every figure traceable to a public filing.",
  alternates: { canonical: "/explore/model" },
};

/**
 * The rebuilt dataset. Same full-screen shell as /explore/sheets — it borrows
 * that page's stylesheet rather than copying it, so both sheets stay one look.
 */
export default function ModelPage() {
  return (
    <main className="flex h-screen min-h-0 flex-col">
      <TopNav />
      <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-x-hidden px-[clamp(8px,1.5vw,20px)] py-2">
        <ModelSheet />
      </div>
    </main>
  );
}
