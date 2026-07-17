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
}: {
  title: string;
  gold?: boolean;
  tabs: { label: string; content: React.ReactNode }[];
  hoisted?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);

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
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group mb-7">
      <summary className="mt-7 mb-3.5 flex cursor-pointer list-none items-center gap-2.5 text-[18px] font-bold [&::-webkit-details-marker]:hidden">
        <span className="text-muted text-[12px] transition-transform group-open:rotate-90">
          ▸
        </span>
        {title}
      </summary>
      {children}
    </details>
  );
}
