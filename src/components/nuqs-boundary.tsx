"use client";

import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

/**
 * NuqsAdapter calls useSearchParams(), which at prerender time forces a
 * client-side-rendering bailout up to the nearest Suspense boundary. When the
 * adapter sat in the root layout, that boundary swallowed EVERY page — the
 * whole site exported as empty HTML shells, invisible to search engines.
 *
 * So the adapter now lives here, and only the pages that actually keep state
 * in the URL (the two dashboards) wrap themselves in it. Pages that don't —
 * the 132 /companies/<slug> profiles, /explore — export real, crawlable HTML.
 */
export function NuqsBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <NuqsAdapter>{children}</NuqsAdapter>
    </Suspense>
  );
}
