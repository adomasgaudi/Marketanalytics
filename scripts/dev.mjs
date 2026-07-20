// `pnpm dev` — starts Next AND the legacy-template watcher together.
//
// Both are needed because the app serves two things: the Next routes (hot-reloaded by
// next dev) and the generated legacy dashboard embedded in /ugly (rebuilt by the watcher).
// Running only `next dev` would silently serve a stale dashboard after a template edit.
import { spawn } from "node:child_process";

const opts = { stdio: "inherit", shell: process.platform === "win32" };
const children = [
  spawn("node", ["scripts/watch-legacy.mjs"], opts),
  // -H 0.0.0.0 binds every interface, so phones on the same Wi-Fi can hit http://<lan-ip>:3000.
  spawn("pnpm", ["exec", "next", "dev", "-H", "0.0.0.0"], opts),
];

// If either process dies, take the other down too — a half-running dev setup is a trap
// (you'd be editing the template with no watcher, seeing stale output and not knowing why).
let closing = false;
const shutdown = (code = 0) => {
  if (closing) return;
  closing = true;
  for (const c of children) c.kill();
  process.exit(code);
};

for (const c of children) c.on("close", (code) => shutdown(code ?? 0));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
