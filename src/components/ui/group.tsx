"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Legacy grp-card: a section card with a title heading and pill tabs that
 * switch between panels ("Market 2025" / "Market all time").
 */
export function GroupCard({
  title,
  gold = false,
  tabs,
  /** Rendered above the tab row, visible on every tab (legacy "hoist"). */
  hoisted,
  /** Controlled mode: the active tab index lives with the caller. */
  active: controlled,
  onChange,
}: {
  title: string;
  gold?: boolean;
  tabs: { label: string; content: React.ReactNode }[];
  hoisted?: React.ReactNode;
  active?: number;
  onChange?: (index: number) => void;
}) {
  const [uncontrolled, setUncontrolled] = useState(0);
  const active = controlled ?? uncontrolled;
  const setActive = onChange ?? setUncontrolled;

  return (
    <section className="mb-7">
      <h2 className={cn("mt-7 mb-3.5 text-[18px] font-bold", gold && "text-gold")}>
        {title}
      </h2>
      {hoisted}
      <div className="mb-3.5 flex [scrollbar-width:none] gap-[5px] overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "min-h-8 flex-none cursor-pointer rounded-[7px] border px-[13px] text-[13px] font-semibold whitespace-nowrap transition-colors",
              i === active
                ? "border-accent bg-accent text-white"
                : "border-line bg-panel2 text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div key={tab.label} hidden={i !== active}>
          {tab.content}
        </div>
      ))}
    </section>
  );
}

/** Legacy collapsible grp-card — defaults closed, chevron in the summary. */
export function CollapsibleCard({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  /** Expanded on load. Still collapsible — this only sets the initial state. */
  defaultOpen?: boolean;
}) {
  return (
    <details className="group mb-7" open={defaultOpen}>
      <summary className="mt-7 mb-3.5 flex cursor-pointer list-none items-center gap-2.5 text-[18px] font-bold [&::-webkit-details-marker]:hidden">
        {/* Stroked chevron rather than the ▸ glyph, which renders as a
            different weight per-platform and never matched the icon set. */}
        <span className="text-muted transition-transform group-open:rotate-90">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="block"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </span>
        {title}
      </summary>
      {children}
    </details>
  );
}
