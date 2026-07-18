import type { Metadata } from "next";
import { DevCornerMount } from "@/dev/DevCornerMount";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Analytics",
  description: "Lithuanian marketing & PR agency market, 2019–2025.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Dark is the legacy dashboard's default; light is an explicit opt-in there.
    <html lang="en" data-theme="dark" data-mode="default">
      {/* NuqsAdapter lets the dashboard keep its selections (year, basis,
          filters) in the URL, so a view can be shared and survives a refresh. */}
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
        {/* Dev overlay — the Pepper dev corner (src/dev): edit/view trays,
            x-ray, depth experiments, version history. Dev mode only; the
            legacy iframe keeps its own /devtools.js copy. */}
        <DevCornerMount />
      </body>
    </html>
  );
}
