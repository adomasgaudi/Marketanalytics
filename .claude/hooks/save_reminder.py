#!/usr/bin/env python3
# Stop hook: at end of turn, remind to Save (REPO-01) if the git working tree
# is dirty or main isn't pushed to origin. Non-blocking reminder; silent when
# the tree is clean and pushed.
#
# Mechanistically, step by step:
#
# 1. Claude Code runs this script when the main agent finishes responding (the
#    Stop event) and pipes the hook JSON to stdin. We don't need the payload —
#    we ask git directly about the repo state.
# 2. `git status --porcelain` lists uncommitted/untracked changes; non-empty
#    output means the tree is DIRTY.
# 3. `git rev-list --count @{upstream}..HEAD` counts local commits not on the
#    CURRENT branch's tracking remote; > 0 means UNPUSHED commits. We compare
#    against @{upstream} (e.g. origin/sodra on the sodra branch), NOT a hardcoded
#    origin/main — otherwise any work on a feature branch is falsely flagged as
#    unpushed even after it's pushed to its own remote. If the branch has no
#    upstream yet (never pushed), fall back to counting all commits since
#    origin/main so brand-new branches still get nudged.
# 4. If either is true, print a JSON object whose
#    hookSpecificOutput.additionalContext nudges to commit + push. Claude Code
#    injects that string into context. Clean + pushed -> print nothing.
#
# It cannot block: no exit 2, no decision:block. It only informs (Schema.md:
# hooks here are aggressive context, not gates). Any git/parse error -> exit 0
# silently so a non-repo or odd state never disrupts the turn.
import json, sys, subprocess

def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True,
                          timeout=8).stdout.strip()

try:
    json.load(sys.stdin)  # drain stdin; payload unused
except Exception:
    pass

def count_rev(spec):
    try:
        return int(git("rev-list", "--count", spec) or "0")
    except ValueError:
        return 0

try:
    dirty = bool(git("status", "--porcelain"))
    # Prefer the current branch's own upstream; fall back to origin/main only if
    # the branch has no upstream set (e.g. a fresh, never-pushed branch).
    upstream = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}")
    ref = upstream if upstream else "origin/main"
    unpushed = count_rev(f"{ref}..HEAD")
except Exception:
    sys.exit(0)

if not dirty and unpushed == 0:
    sys.exit(0)

bits = []
if dirty:
    bits.append("uncommitted changes in the working tree")
if unpushed:
    bits.append(f"{unpushed} commit(s) not pushed to {ref}")

msg = ("REPO-01 (Save) reminder: " + " and ".join(bits) +
       ". The owner only sees the live site — commit + push to main before "
       "ending, then send the rebuilt index.html if it changed.")

print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": msg,
}}))
sys.exit(0)
