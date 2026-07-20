"use client";

import { memo, useState } from "react";

/**
 * A minimal read-only lazy JSON tree (DevTools-style). Efficiency contract:
 * a collapsed node renders ONE row and none of its children, and arrays/objects
 * with more than CHUNK entries expand into [i … j] chunk rows first — so the
 * DOM only ever contains what is actually open, never the whole dataset.
 */
const CHUNK = 100;

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function preview(v: Json): string {
  if (Array.isArray(v)) return `[…] ${v.length} items`;
  if (v && typeof v === "object") return `{…} ${Object.keys(v).length} keys`;
  return "";
}

function Leaf({ v }: { v: string | number | boolean | null }) {
  const cls =
    v === null
      ? "text-muted italic"
      : typeof v === "string"
        ? "text-green"
        : typeof v === "number"
          ? "text-accent"
          : "text-amber";
  return (
    <span className={`${cls} break-all whitespace-pre-wrap`}>
      {typeof v === "string" ? `"${v}"` : String(v)}
    </span>
  );
}

/** One key: value row; expandable when the value is an object/array. */
const Node = memo(function Node({ label, value }: { label: string; value: Json }) {
  const [open, setOpen] = useState(false);
  const isObj = value !== null && typeof value === "object";

  if (!isObj)
    return (
      <div className="pl-4">
        <span className="text-ink/80">{label}</span>
        <span className="text-muted">: </span>
        <Leaf v={value as string | number | boolean | null} />
      </div>
    );

  return (
    <div className="pl-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-ink/80 cursor-pointer select-text"
      >
        <span className="text-muted mr-1 inline-block w-2.5">{open ? "▾" : "▸"}</span>
        {label}
        <span className="text-muted">
          : <span className="italic">{preview(value)}</span>
        </span>
      </button>
      {open && <Children value={value as Json[] | { [k: string]: Json }} />}
    </div>
  );
});

/** Expanded children of one node, chunked when large. */
function Children({
  value,
  from = 0,
  to,
}: {
  value: Json[] | { [k: string]: Json };
  from?: number;
  to?: number;
}) {
  const keys = Array.isArray(value)
    ? null
    : Object.keys(value).slice(from, to ?? undefined);
  const len = Array.isArray(value) ? value.length : keys!.length + from;
  const end = to ?? len;

  // Too many entries for one level: render chunk rows, each lazily expandable.
  if (end - from > CHUNK)
    return (
      <div>
        {Array.from({ length: Math.ceil((end - from) / CHUNK) }, (_, i) => {
          const a = from + i * CHUNK;
          const b = Math.min(a + CHUNK, end);
          return <Chunk key={a} value={value} from={a} to={b} />;
        })}
      </div>
    );

  if (Array.isArray(value))
    return (
      <div>
        {value.slice(from, end).map((v, i) => (
          <Node key={from + i} label={String(from + i)} value={v} />
        ))}
      </div>
    );

  return (
    <div>
      {keys!.map((k) => (
        <Node key={k} label={k} value={value[k]} />
      ))}
    </div>
  );
}

function Chunk({
  value,
  from,
  to,
}: {
  value: Json[] | { [k: string]: Json };
  from: number;
  to: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pl-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-muted cursor-pointer italic"
      >
        <span className="mr-1 inline-block w-2.5">{open ? "▾" : "▸"}</span>[{from} …{" "}
        {to - 1}]
      </button>
      {open && <Children value={value} from={from} to={to} />}
    </div>
  );
}

export function JsonTree({ value, rootLabel }: { value: Json; rootLabel: string }) {
  return (
    <div className="-ml-4 font-mono text-[12px] leading-[1.6]">
      <Node label={rootLabel} value={value} />
    </div>
  );
}
