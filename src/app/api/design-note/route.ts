import { appendFile } from "node:fs/promises";
import path from "node:path";

/**
 * The dev corner's `save for agent`: appends one edit note to
 * design-notes.jsonl at the repo root, for an agent to fold into the source.
 * Dev-server only — production builds refuse.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production")
    return new Response("dev only", { status: 403 });
  const note = await req.json();
  const line = JSON.stringify(note) + "\n";
  await appendFile(path.join(process.cwd(), "design-notes.jsonl"), line, "utf8");
  return Response.json({ ok: true });
}
