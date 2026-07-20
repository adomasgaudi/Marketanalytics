"use client";

import { useState } from "react";
import eventsJson from "../../../data/data_events.json";
import dataJson from "../../../data/data.json";
// The key-value COPY of sheets_data.json (rows as {column: value} objects, not
// columns+rows arrays) — viewer-only for now; the site still uses the original.
import sheetsJson from "../../../data/sheets_data_kv.json";
import type { RekTabsFile } from "./FieldData";
import { JsonTree } from "./JsonTree";

/**
 * The "Raw JSON" mode of /explore: every dataset behind the explorer, browsable
 * as a read-only collapsible JSON tree (@uiw/react-json-view). Trees are only
 * mounted once their section is opened — sheets_data + rek_tabs are megabytes.
 */
const DATASETS = (tabs: RekTabsFile) =>
  [
    {
      key: "data",
      title: "data.json — canonical annual company dataset",
      value: dataJson as object,
    },
    {
      key: "rek_tabs",
      title: "rek_tabs.json — Rekvizitai tabs (+ Sodra attached per company)",
      value: tabs as unknown as object,
    },
    {
      key: "data_events",
      title: "data_events.json — data-change audit log",
      value: eventsJson as object,
    },
    {
      key: "sheets_data",
      title: "sheets_data_kv.json — raw Excel sheets, rows as key-value objects",
      value: sheetsJson as object,
    },
  ] as const;

function JsonSection({
  title,
  root,
  value,
}: {
  title: string;
  root: string;
  value: object;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <details
      className="border-line bg-panel group mb-4 overflow-hidden rounded-[10px] border"
      onToggle={(e) => e.currentTarget.open && setOpened(true)}
    >
      <summary className="text-ink flex cursor-pointer list-none flex-wrap items-center gap-2 px-3.5 py-[11px] text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
        <span className="text-muted inline-block transition-transform group-open:rotate-90">
          ▸
        </span>
        {"{ }"} {title}
      </summary>
      <div className="px-3.5 pb-3.5">
        {opened && (
          <div className="scroll-pane border-line bg-panel2 max-h-[80vh] overflow-auto rounded-lg border p-2">
            <JsonTree value={value as never} rootLabel={root} />
          </div>
        )}
      </div>
    </details>
  );
}

export function RawJson({ tabs }: { tabs: RekTabsFile }) {
  return (
    <>
      {DATASETS(tabs).map((d) => (
        <JsonSection key={d.key} title={d.title} root={d.key} value={d.value} />
      ))}
    </>
  );
}
