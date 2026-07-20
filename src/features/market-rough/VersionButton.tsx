"use client";

import { useEffect, useRef, useState } from "react";
import { VERSIONS } from "./version-history";

/**
 * Floating dev overlay (bottom-right, like the x-ray corner bottom-left) — NOT part of
 * the page layout. The pill opens the version-history popup upward.
 */
export function VersionButton({ version }: { version: string }) {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    // hist-fab analog: Dev-mode-only, like the legacy's floating changelog badge.
    <div
      className="hist-fab fixed right-3 bottom-3 z-[99998]"
      data-devcorner=""
      ref={popRef}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="border-line bg-panel2 text-muted hover:text-ink cursor-pointer rounded-[20px] border px-2.5 py-0.5 text-[13px] font-semibold transition-colors"
      >
        {version}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Version history"
          className="border-line bg-panel absolute right-0 bottom-[calc(100%+8px)] max-h-[70vh] w-[340px] overflow-y-auto rounded-lg border p-3 shadow-lg max-sm:w-[280px]"
        >
          <p className="text-ink mb-2 text-[13px] font-bold">Version history</p>
          <ul className="flex flex-col gap-2">
            {VERSIONS.map((entry) => (
              <li key={entry.v} className="border-line border-b pb-2 last:border-b-0">
                <p className="text-ink text-[13px] font-semibold">
                  {entry.v}
                  <span className="text-muted ml-2 font-normal">{entry.date}</span>
                  {entry.sp != null && (
                    <span className="border-line text-muted ml-2 rounded-[10px] border px-1.5 text-[11px]">
                      {entry.sp} sp
                    </span>
                  )}
                </p>
                <p className="text-ink text-[13px]">{entry.title}</p>
                {entry.desc && <p className="text-muted text-[12px]">{entry.desc}</p>}
              </li>
            ))}
          </ul>
          <a href="/v2" className="text-accent mt-2 block text-[12px] hover:underline">
            Full legacy changelog → /v2
          </a>
        </div>
      )}
    </div>
  );
}
