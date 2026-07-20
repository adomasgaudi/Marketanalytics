// One-shot build of the legacy dashboard (template.html -> the generated HTML).
// Runs before `next build` so a production build can never ship a stale dashboard.
import { spawnSync } from "node:child_process";

const PYTHON = process.platform === "win32" ? "py" : "python3";
const res = spawnSync(PYTHON, ["legacy-src/build_site.py"], { stdio: "inherit" });

if (res.error || res.status !== 0) {
  console.error("[legacy] build_site.py failed — the dashboard would be stale.");
  process.exit(res.status || 1);
}
