#!/usr/bin/env python3
"""PostToolUse: after a template.html edit, remind to bump the version + rebuild.

Two properties this hook must have, both learned the hard way:

1. IT MUST BE ABLE TO GO QUIET. The old version fired on *every* template.html
   edit — including the edits made to satisfy it. Four in a row, during the fix.
   Now it only speaks when the version badge still matches package.json's version,
   i.e. when the bump genuinely has not happened yet. Do the work and it shuts up.

2. IT MUST NOT REPEAT ITSELF. Even when the condition holds, `say()` mutes an
   identical message for a cooldown window, so a burst of edits produces one
   reminder, not one per keystroke.

Non-blocking by construction: no exit 2, no decision:block. It injects context and
nothing more, and every failure path exits silently. A reminder must never be the
reason a session cannot proceed.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refractory import say, stdin_json  # noqa: E402

# Absolute, not relative: hooks are launched with whatever cwd the agent happens to
# hold. A relative path here silently breaks the moment the shell steps into a
# subdirectory — which is exactly how this repo's hooks once locked the agent out.
ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)

MESSAGE = (
    "template.html changed and its version badge still matches the last release — "
    "bump the badge, prepend a VERSIONS entry (title/desc/detail + sp), then let the "
    "watcher rebuild. Minor digit = visible UI change; patch = everything else."
)


def _read(*parts):
    try:
        with open(os.path.join(ROOT, *parts), encoding="utf-8") as fh:
            return fh.read()
    except Exception:
        return ""


def _version_in(text: str):
    m = re.search(r'id="navVersion"[^>]*>v([\d.]+)<', text)
    return m.group(1) if m else None


def _needs_bump() -> bool:
    """True only if the working template still carries the COMMITTED version.

    The badge and the newest VERSIONS entry are always in sync (one derives from the
    other), so comparing them tells you nothing. The real question is whether this
    edit has moved the version at all — so compare the working file against the last
    commit. Bumped already? Silence. Untouched? The bump is genuinely still owed.
    """
    working = _version_in(_read("legacy-src", "template.html"))
    if not working:
        return False  # can't tell -> say nothing, never nag on a guess

    try:
        import subprocess
        committed = subprocess.run(
            ["git", "show", "HEAD:legacy-src/template.html"],
            cwd=ROOT, capture_output=True, text=True, timeout=5,
        ).stdout
    except Exception:
        return False  # no git, no signal -> stay quiet rather than guess

    prior = _version_in(committed)
    return bool(prior) and working == prior


def main() -> None:
    path = (stdin_json().get("tool_input") or {}).get("file_path", "")
    if os.path.basename(path.replace("\\", "/")).lower() != "template.html":
        return
    if _needs_bump():
        say(MESSAGE)


if __name__ == "__main__":
    main()
