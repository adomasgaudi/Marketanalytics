import type { Metadata } from "next";
import Script from "next/script";
import { APP_VERSION_LABEL } from "@/app-version";
import { VersionButton } from "@/features/market-rough/VersionButton";
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
    <html lang="en" data-theme="dark">
      {/* NuqsAdapter lets the dashboard keep its selections (year, basis,
          filters) in the URL, so a view can be shared and survives a refresh. */}
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
        {/* Dev overlays — external to the page, not part of the site layout:
            x-ray corner bottom-left (shared /devtools.js, also loaded by the legacy
            iframe) and the floating version-history pill bottom-right. */}
        <Script src="/devtools.js" strategy="afterInteractive" />
        <VersionButton version={APP_VERSION_LABEL} />
      </body>
    </html>
  );
}
