"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { fmtEurFull, fmtPct } from "./format";
import { revBreakdown } from "./money-flow-breakdown";
import type { YearFlow } from "./MoneyFlowByYear";

/**
 * Every figure behind one bar of the money-flow chart.
 *
 * The hover tooltip carries four lines and vanishes on move; the revenue band's
 * three slices — employer labour, opex, profit tax — were drawn but nowhere
 * readable. This is the click target for all of it, in full euros rather than
 * the chart's compact form, each line also as a share of that year's turnover.
 */
export function YearDetailsDialog({
  row,
  prev,
  onClose,
}: {
  row: YearFlow | null;
  /** Previous year, for the turnover change. Null on the first bar. */
  prev: YearFlow | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [row, onClose]);

  if (!row || typeof document === "undefined") return null;

  const profit = Math.max(0, row.profit);
  const revRest = Math.max(0, row.revenue - profit);
  const parts = revBreakdown(revRest, row.payroll, row.customOpex);
  const yoy = prev && prev.turnover > 0 ? row.turnover / prev.turnover - 1 : null;
  // Turnover is the whole bar, so it is the natural denominator — the same one
  // the chart's "% of turnover" scale uses.
  const share = (v: number) => (row.turnover > 0 ? `${((v / row.turnover) * 100).toFixed(1)}%` : "–");

  const lines: { label: string; value: number | null | undefined; dim?: boolean }[] = [
    { label: "Turnover", value: row.turnover },
    { label: "Revenue", value: row.revenue },
    { label: "Payroll (Sodra wage bill)", value: row.payroll },
    { label: "…employer cost incl. Sodra", value: parts?.employer, dim: true },
    { label: "…other operating cost", value: parts?.opex, dim: true },
    { label: "…profit tax", value: parts?.profitTax, dim: true },
    { label: "Net profit", value: row.profit },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/55 p-3"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="year-dialog-title"
        className="border-line bg-panel max-h-[calc(100dvh-24px)] w-full max-w-[420px] overflow-y-auto rounded-xl border p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-muted text-[11px] font-semibold tracking-[.14em] uppercase">
              Money flow
            </p>
            <h2 id="year-dialog-title" className="text-xl font-bold">
              {row.year}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close year details"
            onClick={onClose}
            className="text-muted hover:text-ink cursor-pointer text-xl"
          >
            ×
          </button>
        </div>

        <table className="border-line w-full border-y text-[12.5px]">
          <thead>
            <tr className="text-muted text-[11px]">
              <th className="py-1.5 text-left font-medium">Figure</th>
              <th className="py-1.5 text-right font-medium">Amount</th>
              <th className="py-1.5 text-right font-medium">of turnover</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.label} className={line.dim ? "text-muted" : ""}>
                <td className={`py-1 ${line.dim ? "pl-3" : "font-medium"}`}>
                  {line.label}
                </td>
                <td className="py-1 text-right tabular-nums">
                  {fmtEurFull(line.value)}
                </td>
                <td className="py-1 text-right tabular-nums">
                  {line.value == null ? "–" : share(line.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-muted mt-3 text-xs">
          {yoy == null ? (
            "No earlier year to compare against."
          ) : (
            <>
              Turnover {yoy >= 0 ? "up" : "down"}{" "}
              <span className={yoy >= 0 ? "text-green" : "text-red"}>{fmtPct(yoy)}</span>{" "}
              on {prev?.year}.
            </>
          )}
          {!parts && " Revenue split unavailable — no payroll figure for this year."}
        </p>
      </section>
    </div>,
    document.body,
  );
}
