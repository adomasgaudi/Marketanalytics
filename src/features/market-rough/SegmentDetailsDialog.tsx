"use client";

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
  if (!details) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-end justify-center bg-black/55 p-3 sm:items-center"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="segment-dialog-title"
        className="border-line bg-panel w-full max-w-[430px] rounded-2xl border p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <span
            className="mt-1 h-4 w-4 flex-none rounded-[4px]"
            style={{ background: details.color }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-muted text-[11px] font-semibold tracking-[.14em] uppercase">
              {details.year} market segment
            </p>
            <h2 id="segment-dialog-title" className="text-[22px] font-bold">
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

        <dl className="border-line mb-4 grid grid-cols-2 gap-3 border-y py-4 text-[13px]">
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

        <p className="text-muted mb-5 text-[12.5px]">
          Leading companies: {details.leaders.join(", ") || "No reported companies"}.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-muted px-3 py-2 text-sm"
          >
            Keep full market
          </button>
          <button
            type="button"
            onClick={() => onFilter(details.key)}
            className="bg-accent cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            Filter Markets by {details.name}
          </button>
        </div>
      </section>
    </div>
  );
}
