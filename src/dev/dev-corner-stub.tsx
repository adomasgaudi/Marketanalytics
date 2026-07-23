"use client";

import { useState } from "react";

type HistoryEntry = { version: string; title: string; summary: string };

/**
 * Built-in dev corner when @adomas/dev-tools is not installed (CI, live site).
 * The optional package resolves to this file via next.config.ts.
 */
export function DevCorner({
  history,
}: {
  history?: { version: string; entries: HistoryEntry[] };
}) {
  const [open, setOpen] = useState(false);
  if (!history) return null;

  return (
    <div
      data-devcorner
      className="bottom-3 fixed right-3 flex flex-col items-end gap-2"
      style={{ zIndex: 500 }}
    >
      {open && (
        <div className="border-line bg-panel max-h-[min(60vh,420px)] w-[min(92vw,320px)] overflow-y-auto rounded-[10px] border p-2 shadow-[0_4px_20px_rgba(0,0,0,.4)]">
          {history.entries.map((entry) => (
            <div
              key={`${entry.version}-${entry.title}`}
              className="border-line border-b px-2 py-2 last:border-b-0"
            >
              <div className="text-[11px] font-bold">v{entry.version}</div>
              <div className="text-[12px] font-semibold">{entry.title}</div>
              {entry.summary ? (
                <p className="text-muted mt-0.5 text-[11px] leading-snug">{entry.summary}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="hist-fab border-line bg-panel2 text-muted hover:text-accent rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-[0_2px_8px_rgba(0,0,0,.25)]"
        onClick={() => setOpen((v) => !v)}
        title="Version history"
        aria-expanded={open}
      >
        v{history.version}
      </button>
    </div>
  );
}
