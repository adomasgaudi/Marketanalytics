// Watch the legacy dashboard template and rebuild on save.
//
// The dashboard you view is GENERATED: legacy-src/template.html -> build_site.py ->
// legacy-index.html + public/legacy/index.html. Editing the template alone changes
// nothing you can see, so this closes that gap: save the template, the build runs,
// and `next dev` (which serves public/) picks it up on refresh.
//
// Runs as part of `pnpm dev` — you should never need to call build_site.py by hand.
import { spawn } from "node:child_process";
import { watch } from "node:fs";

const TEMPLATE = new URL("../legacy-src/template.html", import.meta.url);
const SCRIPT = "legacy-src/build_site.py";
const PYTHON = process.platform === "win32" ? "py" : "python3";

let building = false;
let queued = false;

function build() {
  if (building) {
    queued = true; // a save landed mid-build; rebuild once this one finishes
    return;
  }
  building = true;
  const t0 = Date.now();
  const proc = spawn(PYTHON, [SCRIPT], { stdio: ["ignore", "pipe", "pipe"] });
  let err = "";
  proc.stderr.on("data", (d) => (err += d));
  proc.on("close", (code) => {
    building = false;
    if (code === 0) {
      console.log(`[legacy] rebuilt in ${Date.now() - t0}ms — refresh to see it`);
    } else {
      console.error(`[legacy] BUILD FAILED (exit ${code})\n${err.trim()}`);
    }
    if (queued) {
      queued = false;
      build();
    }
  });
}

// fs.watch fires more than once per save on Windows; debounce so one save = one build.
let timer;
watch(TEMPLATE, () => {
  clearTimeout(timer);
  timer = setTimeout(build, 120);
});

console.log("[legacy] watching legacy-src/template.html");
build(); // build once on startup so a stale copy never gets served
