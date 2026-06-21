#!/usr/bin/env python3
"""Warn (never block) when committing/pushing to main on a desktop session.
Web/remote sessions (DATA-06) are exempt — they must push to main per REPO-01."""
import json, sys, re, subprocess, os

data = json.load(sys.stdin)
cmd = data.get("tool_input", {}).get("command", "")

push_to_main = bool(re.search(r'\bgit\s+push\b.*\bmain\b', cmd))
commit_on_main = bool(re.search(r'\bgit\s+commit\b', cmd))

if push_to_main or commit_on_main:
    branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True, text=True
    ).stdout.strip()

    # Web/remote sessions are identified by the Claude Code remote env var.
    # They are exempt from the branch rule (DATA-06) and MUST push to main (REPO-01).
    is_web_session = bool(os.environ.get("CLAUDE_CODE_REMOTE") or os.environ.get("CLAUDE_REMOTE"))

    if branch == "main" and not is_web_session:
        # Warn only — never block (REPO-01 is TOP priority; blocking causes missed pushes)
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "warn",
                "permissionDecisionReason": (
                    "Desktop session: you are committing/pushing directly to main. "
                    "Prefer a feature branch (REPO-02). Proceeding anyway per REPO-01."
                )
            }
        }))
        sys.exit(0)

# Allow everything
print(json.dumps({}))
