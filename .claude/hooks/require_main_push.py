#!/usr/bin/env python3
"""PreToolUse(Bash) hook: warn when a `git push` targets a branch other than
main. REPO-01 — the owner only sees the live site, which deploys from main, so
work stranded on a feature branch is invisible to them. This is the machine
check for the rule that kept slipping (PROC-01): an AI started on a feature
branch and pushed there instead of main.

Mechanistically, step by step:

1. Claude Code runs this before a Bash tool call and pipes the hook JSON to
   stdin. `json.load` parses it; any error -> exit 0 (no output -> allow).
2. `tool_input.command` is the shell line. If it isn't a `git push`, print `{}`
   (explicit allow) and exit.
3. If the command explicitly names `main` as the target (e.g.
   `git push origin main`, `git push origin HEAD:main`), that's the desired
   case -> allow silently.
4. Otherwise resolve the current branch. A bare `git push` while ON main is
   fine -> allow. Any other push (a feature branch) -> emit a non-blocking
   `warn` telling the AI to move the work to main and push main.

Non-blocking by design (permissionDecision: "warn", never block): blocking a
push is risky and the project's house style is aggressive *context*, not gates
(see guard_main_push.py / Schema.md). The owner can still proceed.
"""
import json
import sys
import re
import subprocess

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

cmd = (data.get("tool_input") or {}).get("command", "")

# Not a push -> nothing to say.
if not re.search(r"\bgit\s+push\b", cmd):
    print(json.dumps({}))
    sys.exit(0)

# Explicitly pushing to main is exactly what we want.
if re.search(r"\bmain\b", cmd):
    print(json.dumps({}))
    sys.exit(0)

# A bare `git push` while already on main is fine.
try:
    branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True, text=True, timeout=8,
    ).stdout.strip()
except Exception:
    branch = ""

if branch == "main":
    print(json.dumps({}))
    sys.exit(0)

reason = (
    "REPO-01: the owner only sees the live site, which deploys from main — work "
    f"left on '{branch or 'a feature branch'}' is invisible to them. Move it to "
    "main and push main instead: "
    f"git checkout main && git merge --ff-only {branch or '<branch>'} && "
    "git push origin main."
)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "warn",
        "permissionDecisionReason": reason,
    }
}))
sys.exit(0)
