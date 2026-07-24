"use client";
import { useMemo, useState } from "react";

export type Row = {
  jarCode: string;
  name: string;
  evrk: string;
  year: number;
  turnover: number | null;
  profit: number | null;
  years: { year: number; turnover: number | null; profit: number | null }[];
};

const eur = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("lt-LT") + " €";

/** Search + sort over the full set; only the top slice is rendered. */
export function RestaurantsTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"turnover" | "profit">("turnover");
  const [limit, setLimit] = useState(100);

  const shown = useMemo(() => {
    const needle = q.toLowerCase();
    return rows
      .filter((r) => !needle || r.name.toLowerCase().includes(needle))
      .sort((a, b) => (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity));
  }, [rows, q, sort]);

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name…"
          className="border-line bg-panel2 w-64 rounded-lg border px-3 py-1.5 text-sm"
        />
        {(["turnover", "profit"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSort(k)}
            className={`border-line rounded-lg border px-3 py-1.5 text-sm ${sort === k ? "bg-panel2 font-semibold" : "text-muted"}`}
          >
            by {k}
          </button>
        ))}
        <span className="text-muted self-center text-sm">
          {shown.length} companies
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted border-line border-b text-left">
            <th className="py-1.5 pr-2">#</th>
            <th className="pr-2">Company</th>
            <th className="pr-2">Class</th>
            <th className="pr-2">FY</th>
            <th className="pr-2 text-right">Turnover</th>
            <th className="text-right">Net profit</th>
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
              <td className="text-right tabular-nums">{eur(r.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
