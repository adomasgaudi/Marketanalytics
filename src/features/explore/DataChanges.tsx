"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import eventsJson from "../../../data/data_events.json";

/* ── 📜 Data changes — port of legacy template.html chg-wrap section ── */

type FieldDelta = { from?: string | number | null; to?: string | number | null };
type FieldsChanged = { field: string; from?: unknown; to?: unknown };
type MonthUpdate = { month?: string } & Record<string, unknown>;

interface Change {
  kind?: string;
  brand?: string;
  name?: string;
  slug?: string;
  jarCode?: string | number;
  year?: number | string | null;
  fields?: Record<string, unknown> | null;
  fieldCount?: number;
  fieldsAdded?: number | string | null;
  fieldsRemoved?: number | string | null;
  fieldsChanged?: FieldsChanged[] | null;
  monthCount?: number | null;
  latestMonth?: string | null;
  monthsAdded?: string[] | null;
  monthsUpdated?: MonthUpdate[] | null;
  latest?: Record<string, FieldDelta> | null;
}

interface ChgEvent {
  id: string;
  at?: string;
  source?: string;
  trigger?: string;
  commit?: string;
  summary?: string;
  stats?: { fileCount?: number; sodraFiles?: number; added?: number; changed?: number };
  changes?: Change[];
}

const DATA_EVENTS = eventsJson as { events?: ChgEvent[] };

function fmtChgDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10) + " " + d.toISOString().slice(11, 16) + "Z";
}

function isDelta(v: unknown): v is FieldDelta {
  return typeof v === "object" && v !== null;
}
function deltaStr(v: unknown): string {
  if (isDelta(v)) return `${v.from ?? "—"} → ${v.to ?? "—"}`;
  return `${v ?? "—"}`;
}

function chgDetailRows(ch: Change): [string, string][] {
  const rows: [string, string][] = [];
  if (ch.year != null) {
    if (ch.kind === "removed") {
      rows.push(["Removed", `${ch.brand} ${ch.year}`]);
      return rows;
    }
    if (ch.kind === "added") {
      const bits = Object.entries(ch.fields || {}).map(([k, v]) => `${k}=${v}`);
      rows.push(["New year row", bits.join(", ") || "—"]);
      return rows;
    }
    if (ch.fields) {
      Object.entries(ch.fields).forEach(([f, v]) => rows.push([f, deltaStr(v)]));
      return rows;
    }
    return rows;
  }
  if (ch.slug != null || ch.fieldsAdded != null || ch.fieldsChanged != null) {
    if (ch.kind === "added") {
      rows.push(["New Rekvizitai import", `${ch.fieldCount || 0} fields`]);
      return rows;
    }
    if (ch.kind === "removed") {
      rows.push(["Removed", ch.slug || ch.name || "?"]);
      return rows;
    }
    if (ch.fieldsAdded) rows.push(["Fields added", String(ch.fieldsAdded)]);
    if (ch.fieldsRemoved) rows.push(["Fields removed", String(ch.fieldsRemoved)]);
    (ch.fieldsChanged || []).forEach((fc) =>
      rows.push([fc.field, `${fc.from} → ${fc.to}`]),
    );
    return rows;
  }
  if (ch.kind === "added" && ch.monthCount != null) {
    rows.push([
      "New company",
      `${ch.monthCount || 0} months` +
        (ch.latestMonth ? `, latest ${ch.latestMonth}` : ""),
    ]);
    return rows;
  }
  if (ch.monthsAdded?.length) rows.push(["Months added", ch.monthsAdded.join(", ")]);
  (ch.monthsUpdated || []).forEach((mu) => {
    const bits = Object.keys(mu)
      .filter((k) => k !== "month")
      .map((k) => `${k}: ${deltaStr(mu[k])}`);
    if (bits.length) rows.push([`Month ${mu.month}`, bits.join("; ")]);
  });
  if (ch.latest) {
    const bits = Object.keys(ch.latest).map((k) => `${k}: ${deltaStr(ch.latest![k])}`);
    if (bits.length) rows.push(["Latest", bits.join("; ")]);
  }
  return rows;
}

function chgLabel(ch: Change): string {
  if (ch.brand && ch.year) return `${ch.brand} ${ch.year}`;
  return ch.brand || ch.name || ch.slug || String(ch.jarCode ?? "") || "?";
}

const SRC_CLS: Record<string, string> = {
  sodra: "bg-amber/20 text-amber",
  rekvizitai: "bg-accent/20 text-accent",
  initial: "bg-green/20 text-green",
  mixed: "bg-panel text-muted border-line border",
};

function EventRow({ ev }: { ev: ChgEvent }) {
  const [open, setOpen] = useState(false);
  const stats = ev.stats || {};
  const meta = [
    ev.commit,
    stats.fileCount ? `${stats.fileCount} files` : null,
    stats.sodraFiles ? `${stats.sodraFiles} Sodra` : null,
    stats.added != null ? `${stats.added} new / ${stats.changed} updated` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const chRows = ev.changes || [];
  const src = ev.source || "mixed";
  const toggle = () => setOpen((o) => !o);
  return (
    <div className="border-line bg-panel2 overflow-hidden rounded-lg border">
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        // Phone: date + badge on their own line, summary below at full width.
        // From sm: the original single wrapping row.
        className="hover:bg-panel flex cursor-pointer flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-start sm:gap-2.5"
      >
        <div className="flex items-center gap-2 sm:contents">
          <span className="text-muted text-[11px] whitespace-nowrap sm:min-w-[88px]">
            {fmtChgDate(ev.at)}
          </span>
          <span
            className={cn(
              "rounded-[10px] px-2 py-0.5 text-[10px] font-bold tracking-[.04em] whitespace-nowrap uppercase",
              SRC_CLS[src] || SRC_CLS.mixed,
            )}
          >
            {src}
          </span>
        </div>
        <span className="text-ink text-[13px] sm:min-w-[120px] sm:flex-1">
          {ev.summary || ""}
        </span>
        <span className="text-muted text-[11px]">{meta}</span>
      </div>
      {open && (
        <div className="border-line border-t px-3 pt-2 pb-3 text-[12px]">
          {chRows.length ? (
            // 3 columns won't fit ~280px of phone width — let the table keep its
            // own minimum and scroll sideways inside the card instead.
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[420px] border-collapse text-[12px]">
                <thead>
                  <tr>
                    {["Company", "Change", "Detail"].map((h) => (
                      <th
                        key={h}
                        className="border-line text-muted border-b px-2 py-[5px] text-left align-top text-[10px] tracking-[.04em] uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chRows.map((ch, i) => {
                    const det = chgDetailRows(ch);
                    const kind = ch.kind || "changed";
                    return (
                      <tr key={i}>
                        <td className="border-line border-b px-2 py-[5px] align-top">
                          {chgLabel(ch)}
                        </td>
                        <td className="border-line border-b px-2 py-[5px] align-top">
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase",
                              kind === "added"
                                ? "text-green"
                                : kind === "changed"
                                  ? "text-amber"
                                  : "text-muted",
                            )}
                          >
                            {kind}
                          </span>
                        </td>
                        <td className="border-line border-b px-2 py-[5px] align-top">
                          {det.length
                            ? det.map((r, j) => <div key={j}>{`${r[0]}: ${r[1]}`}</div>)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : ev.trigger === "git-backfill" ? (
            <div className="text-muted text-[12px]">
              Historical commit — file counts only (no field-level diff saved).
            </div>
          ) : (
            <div className="text-muted text-[12px]">No per-company detail recorded.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function DataChanges() {
  const [srcF, setSrcF] = useState("");
  const [search, setSearch] = useState("");

  const events = useMemo(
    () =>
      (DATA_EVENTS.events || [])
        .slice()
        .sort((a, b) => String(b.at).localeCompare(String(a.at))),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (srcF && ev.source !== srcF) return false;
      if (!q) return true;
      if ((ev.summary || "").toLowerCase().includes(q)) return true;
      if ((ev.commit || "").toLowerCase().includes(q)) return true;
      return (ev.changes || []).some(
        (c) =>
          (c.brand || "").toLowerCase().includes(q) ||
          (c.name || "").toLowerCase().includes(q) ||
          (c.slug || "").toLowerCase().includes(q) ||
          String(c.jarCode || "").includes(q),
      );
    });
  }, [events, srcF, search]);

  return (
    <details
      open
      className="border-line bg-panel group mb-4 overflow-hidden rounded-[10px] border"
    >
      <summary className="text-ink flex cursor-pointer list-none flex-wrap items-center gap-2 px-3.5 py-[11px] text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
        <span className="text-muted inline-block transition-transform duration-150 group-open:rotate-90">
          ▸
        </span>
        📜 Data changes{" "}
        <span className="text-muted text-[12px] font-normal">
          · {filtered.length} of {events.length} events
        </span>
      </summary>
      <div className="px-3.5 pt-0.5 pb-3.5">
        <div className="mt-1 mb-3 flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter by source"
            value={srcF}
            onChange={(e) => setSrcF(e.target.value)}
            className="border-line bg-panel2 text-ink rounded-lg border px-3 py-1.5 text-[13px]"
          >
            <option value="">All sources</option>
            <option value="sodra">Sodra</option>
            <option value="rekvizitai">Rekvizitai</option>
            <option value="initial">Initial</option>
            <option value="mixed">Mixed</option>
          </select>
          <input
            type="text"
            placeholder="Filter company or summary…"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-line bg-panel2 text-ink min-w-[170px] rounded-lg border px-3 py-1.5 text-[13px]"
          />
        </div>
        <div className="scroll-pane flex max-h-[70vh] flex-col gap-2 overflow-auto">
          {filtered.length ? (
            filtered.map((ev) => <EventRow key={ev.id} ev={ev} />)
          ) : (
            <div className="text-muted px-1 py-2 text-[12px]">No matching events.</div>
          )}
        </div>
      </div>
    </details>
  );
}
