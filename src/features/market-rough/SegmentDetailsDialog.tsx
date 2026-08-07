"use client";

import { createPortal } from "react-dom";

type SegmentDetails = {
  key: string;
  name: string;
  year: number;
  metric: string;
  value: string;
  share: string;
  companies: number;
  employees: number;
  leaders: string[];
  color: string;
};

export function SegmentDetailsDialog({
  details,
  onClose,
  onFilter,
}: {
  details: SegmentDetails | null;
  onClose: () => void;
  onFilter: (segment: string) => void;
}) {
  if (!details || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/55 p-3"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="segment-dialog-title"
        className="border-line bg-panel max-h-[calc(100dvh-24px)] w-full max-w-[380px] overflow-y-auto rounded-xl border p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-start gap-2.5">
          <span
            className="mt-1 h-4 w-4 flex-none rounded-[4px]"
            style={{ background: details.color }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-muted text-[11px] font-semibold tracking-[.14em] uppercase">
              {details.year} market segment
            </p>
            <h2 id="segment-dialog-title" className="text-xl font-bold">
              {details.name}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close segment details"
            onClick={onClose}
            className="text-muted hover:text-ink cursor-pointer text-xl"
          >
            ×
          </button>
        </div>

        <dl className="border-line mb-3 grid grid-cols-2 gap-2 border-y py-3 text-[12.5px]">
          <div>
            <dt className="text-muted">{details.metric}</dt>
            <dd className="font-semibold">{details.value}</dd>
          </div>
          <div>
            <dt className="text-muted">Market share</dt>
            <dd className="font-semibold">{details.share}</dd>
          </div>
          <div>
            <dt className="text-muted">Companies</dt>
            <dd className="font-semibold">{details.companies}</dd>
          </div>
          <div>
            <dt className="text-muted">Employees</dt>
            <dd className="font-semibold">{details.employees.toLocaleString("en")}</dd>
          </div>
        </dl>

        <p className="text-muted mb-4 text-xs">
          Leading companies: {details.leaders.join(", ") || "No reported companies"}.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-muted px-2.5 py-1.5 text-[13px]"
          >
            Keep full market
          </button>
          <button
            type="button"
            onClick={() => onFilter(details.key)}
            className="bg-accent cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white"
          >
            Filter Markets by {details.name}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
