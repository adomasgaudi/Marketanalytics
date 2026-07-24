import type { Metadata } from "next";
import Script from "next/script";
import { DevCornerMount } from "@/dev/DevCornerMount";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://marketanalytics.lt"),
  title: {
    default: "Market Analytics — Lithuanian marketing & PR agency market",
    template: "%s · Market Analytics",
  },
  description:
    "Turnover, payroll and profit of 132 Lithuanian marketing, PR and communications agencies, 2019–2025. Every figure traced to a public registry.",
  keywords: [
    "Lithuanian marketing agencies",
    "PR agencies Lithuania",
    "agency market analytics",
    "reklamos agentūros",
    "marketingo agentūros",
  ],
  openGraph: {
    type: "website",
    siteName: "Market Analytics",
    url: "https://marketanalytics.lt",
    title: "Market Analytics — Lithuanian marketing & PR agency market",
    description:
      "Turnover, payroll and profit of 132 Lithuanian marketing, PR and communications agencies, 2019–2025.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Market Analytics — Lithuanian marketing & PR agency market",
    description:
      "Turnover, payroll and profit of 132 Lithuanian marketing, PR and communications agencies, 2019–2025.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

/** Cloudflare Web Analytics — free, cookieless, so no consent banner needed.
    Empty string = beacon not rendered. To turn on: add marketanalytics.lt at
    dash.cloudflare.com → Web Analytics, paste the site token here. */
const CF_ANALYTICS_TOKEN = "";

// Structured data: tells Google this is a website + dataset-backed dashboard.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Market Analytics",
  url: "https://marketanalytics.lt",
  description:
    "Turnover, payroll and profit of 132 Lithuanian marketing, PR and communications agencies, 2019–2025, from public registries.",
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
      <head>
        {/* GitHub Pages can't send CSP headers, so this meta tag carries the
            safe subset: no plugins, no <base> hijack. script-src is left open —
            Next's hydration runs on inline scripts. */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="object-src 'none'; base-uri 'self'"
        />
      </head>
      {/* URL-state (nuqs) is no longer provided here: the adapter's
          useSearchParams() forced every page to export as an empty HTML shell.
          Dashboard pages wrap themselves in <NuqsBoundary> instead. */}
      <body>
        {children}
        {/* Dev overlay — the Pepper dev corner (src/dev): edit/view trays,
            x-ray, depth experiments, version history. Dev mode only. */}
        <DevCornerMount />
        {/* X-ray switchboard (bottom-left); hidden until html[data-mode=dev]. */}
        <Script src="/devtools.js" strategy="afterInteractive" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {CF_ANALYTICS_TOKEN && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: CF_ANALYTICS_TOKEN })}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
