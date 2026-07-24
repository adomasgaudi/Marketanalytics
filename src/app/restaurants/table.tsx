"use client";
import { useMemo, useState } from "react";

export type Row = {
  jarCode: string;
  name: string;
  evrk: string;
  insured: number | null;
  avgWage: number | null;
  year: number;
  turnover: number | null;
  profit: number | null;
  taxes: number | null;
  taxYear: number | null;
  years: { year: number; turnover: number | null; profit: number | null }[];
};

const eur = (n: number | null) =>
  n == null ? "—" : Math.round(n).toLocaleString("lt-LT") + " €";

const SEGMENTS = [
  "All",
  "Restoranai",
  "Barai",
  "Kita maitinimo veikla",
  "Pokylių aptarnavimas",
] as const;

/** A row with every source present: registry filing, VMI taxes, Sodra. */
const isFull = (r: Row) => r.turnover != null && r.taxes != null && r.insured != null;

export function RestaurantsTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<(typeof SEGMENTS)[number]>("All");
  const [fullOnly, setFullOnly] = useState(false);
  const [sort, setSort] = useState<"turnover" | "profit" | "taxes" | "insured">(
    "turnover",
  );
  const [limit, setLimit] = useState(100);

  const shown = useMemo(() => {
    const needle = q.toLowerCase();
    return rows
      .filter((r) => seg === "All" || r.evrk === seg)
      .filter((r) => !fullOnly || isFull(r))
      .filter((r) => !needle || r.name.toLowerCase().includes(needle))
      .sort((a, b) => (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity));
  }, [rows, q, seg, fullOnly, sort]);

  const totalTurnover = useMemo(
    () => shown.reduce((s, r) => s + (r.turnover ?? 0), 0),
    [shown],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SEGMENTS.map((s) => (
          <button
            key={s}
            onClick={() => setSeg(s)}
            className={`border-line rounded-full border px-3 py-1 text-[13px] ${seg === s ? "bg-panel2 font-semibold" : "text-muted"}`}
          >
            {s} ({s === "All" ? rows.length : rows.filter((r) => r.evrk === s).length})
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name…"
          className="border-line bg-panel2 w-64 rounded-lg border px-3 py-1.5 text-sm"
        />
        {(["turnover", "profit", "taxes", "insured"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSort(k)}
            className={`border-line rounded-lg border px-3 py-1.5 text-sm ${sort === k ? "bg-panel2 font-semibold" : "text-muted"}`}
          >
            by {k}
          </button>
        ))}
        <label className="text-muted flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={fullOnly}
            onChange={(e) => setFullOnly(e.target.checked)}
          />
          full data only ({rows.filter(isFull).length})
        </label>
        <span className="text-muted self-center text-sm">
          {shown.length} co · Σ turnover {eur(totalTurnover)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted border-line border-b text-left">
              <th className="py-1.5 pr-2">#</th>
              <th className="pr-2">Company</th>
              <th className="pr-2">Class</th>
              <th className="pr-2">FY</th>
              <th className="pr-2 text-right">Turnover</th>
              <th className="pr-2 text-right">Net profit</th>
              <th className="pr-2 text-right">VMI taxes (full yr)</th>
              <th className="pr-2 text-right">Insured</th>
              <th className="text-right">Avg wage</th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, limit).map((r, i) => (
              <tr key={r.jarCode} className="border-line/50 border-b">
                <td className="text-muted py-1.5 pr-2">{i + 1}</td>
                <td className="pr-2">{r.name}</td>
                <td className="text-muted pr-2">{r.evrk}</td>
                <td className="pr-2">{r.year}</td>
                <td className="pr-2 text-right tabular-nums">{eur(r.turnover)}</td>
                <td className="pr-2 text-right tabular-nums">{eur(r.profit)}</td>
                <td
                  className="pr-2 text-right tabular-nums"
                  title={r.taxYear ? `VMI ${r.taxYear}` : undefined}
                >
                  {eur(r.taxes)}
                </td>
                <td className="pr-2 text-right tabular-nums">{r.insured ?? "—"}</td>
                <td className="text-right tabular-nums">{eur(r.avgWage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > limit && (
        <button
          onClick={() => setLimit(limit + 200)}
          className="border-line bg-panel2 mt-3 rounded-lg border px-4 py-2 text-sm"
        >
          Show more ({shown.length - limit} left)
        </button>
      )}
    </div>
  );
}
