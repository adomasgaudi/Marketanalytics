import { Suspense } from "react";
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
    // data-skin is fixed: the refined skin IS the design now, and the
    // classic fallback it used to switch back to is gone. The attribute stays
    // because ~55 rules in globals.css are scoped to it.
    <html lang="en" data-theme="dark" data-mode="default" data-skin="refined">
      {/* NuqsAdapter lets the dashboard keep its selections (year, basis,
          filters) in the URL, so a view can be shared and survives a refresh. */}
      <body>
        {/* Suspense is required for the static export: nuqs reads
            useSearchParams, which has no value at prerender time, so the page
            must be allowed to bail out to the client instead of failing. */}
        <Suspense>
          <NuqsAdapter>{children}</NuqsAdapter>
        </Suspense>
        {/* Dev overlay — the Pepper dev corner (src/dev): edit/view trays,
            x-ray, depth experiments, version history. Dev mode only. */}
        <DevCornerMount />
      </body>
    </html>
  );
}
