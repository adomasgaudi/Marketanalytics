#!/usr/bin/env python3
"""PostToolUse: run Prettier on whatever file the agent just edited.

WHY THIS EXISTS
An AI cannot be trusted to remember your formatting conventions — that is a preference,
and preferences drift. This is the guarantee: whatever the agent writes, it is formatted
on the way to disk. Sloppy output never survives long enough to become the "existing
style" a later edit imitates. The formatter always gets the last word.

WHY IT CANNOT LOOP (HOOK-02, HOOK-03)
It runs AFTER the write has already succeeded, so it has no verdict to render and nothing
to reject. It never exits 2. It cannot block, so it cannot trap the agent in a
retry cycle. Prettier is idempotent — format(format(x)) == format(x) — so it also cannot
oscillate with itself. The worst case here is an unformatted file.

WHY IT IS SILENT (HOOK-03)
It prints nothing on success. A hook that announces itself on every single edit is noise,
and noise is what trains an agent to stop reading hook output. It speaks only when
Prettier itself is broken — a state the agent can actually act on — and even then at most
once per cooldown (HOOK-04).

FAIL OPEN (HOOK-05)
No Prettier, no node, bad stdin, timeout: exit 0, say nothing. A formatter must never be
the reason work cannot proceed.
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refractory import say, stdin_json  # noqa: E402

# HOOK-01: absolute, never relative to the agent's wandering cwd.
ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)

# Prettier owns these. Everything else (.py, .md, .html) is left alone — see
# .prettierignore for the files that are generated and must not be touched.
EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".json"}


def main() -> None:
    path = (stdin_json().get("tool_input") or {}).get("file_path", "")
    if not path or os.path.splitext(path)[1].lower() not in EXTENSIONS:
        return
    if not os.path.isabs(path):
        path = os.path.join(ROOT, path)
    if not os.path.exists(path):
        return

    try:
        proc = subprocess.run(
            # --write formats in place. --ignore-unknown so an unsupported file is a
            # no-op rather than an error. --no-error-on-unmatched-pattern so a path
            # excluded by .prettierignore exits clean instead of shouting.
            ["npx", "--no-install", "prettier", "--write", "--ignore-unknown", path],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=20,
            shell=(os.name == "nt"),  # npx is a .cmd on Windows
        )
    except Exception:
        return  # HOOK-05: prettier missing/hanging -> stay silent, never block

    if proc.returncode != 0:
        # Prettier failed. Usually a syntax error in what the agent just wrote — which
        # is genuinely worth surfacing, because it means the edit is broken. Actionable
        # state the agent controls (HOOK-03), rate-limited (HOOK-04).
        err = (proc.stderr or "").strip().splitlines()
        detail = err[0] if err else "unknown error"
        say(f"Prettier could not format {os.path.basename(path)}: {detail}")


if __name__ == "__main__":
    main()
