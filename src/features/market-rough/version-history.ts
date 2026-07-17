export type VersionEntry = {
  v: string;
  date: string;
  sp?: number;
  title: string;
  desc?: string;
};

/** Next.js-era history (newest first). The full legacy changelog lives in /ugly. */
export const VERSIONS: VersionEntry[] = [
  {
    v: "v3.3.0",
    date: "2026-07-17",
    sp: 5,
    title: "Finish rough-page migration",
    desc: "Rough page completes the migration with a sortable Explorer table.",
  },
  {
    v: "v3.2.1",
    date: "2026-07-12",
    sp: 3,
    title: "Prettier auto-format hook",
    desc: "Repo hook auto-formats on save with loop-safe hook laws.",
  },
  {
    v: "v3.1.3",
    date: "2026-07-12",
    sp: 3,
    title: "Hoist Next app to repo root",
    desc: "Moved the app from next-app/ to the repository root.",
  },
  {
    v: "v3.1.2",
    date: "2026-07-12",
    sp: 1,
    title: "Version from package metadata",
    desc: "App version label is generated from package metadata.",
  },
  {
    v: "v3.1.1",
    date: "2026-07-12",
    title: "Checkpoint migration tracks",
  },
  {
    v: "v3.0",
    date: "2026-07-12",
    title: "Scaffold Next.js migration app",
    desc: "New Next.js track alongside the legacy dashboard (kept at /ugly).",
  },
];
