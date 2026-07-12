#!/usr/bin/env python3
"""Refractory period for hooks — a hook may not shout the same thing twice in a row.

THE PROBLEM (observed, not theoretical)
A non-blocking hook still loops. version_reminder fired "bump the version" on four
consecutive template.html edits: each edit re-triggered it, including the edits that
were me *complying with it*. A warning that re-fires while you are acting on it is
noise, and noise is indistinguishable from a wall — you learn to ignore it, or you
thrash. The hook interrupted the fix it was asking for.

THE RULE
After a hook fires a given message, that message is muted for COOLDOWN seconds. The
agent gets a window to actually do the thing before being told again. If the condition
is genuinely still unmet after the window, it fires once more — so nothing is lost,
it is just rate-limited.

WHY TIME AND NOT A COUNTER
A counter ("warn at most twice") needs a reset, and whoever resets it becomes the new
bug. Time self-clears. The window is state that expires on its own, so an unforeseen
environment change can, at worst, delay a warning — never trap anyone in a loop.

FAIL-OPEN, ALWAYS
Every failure path here exits silently rather than raising. A hook that breaks must
degrade to "said nothing", never to "blocked the agent". The one thing this file must
never do is become the reason work cannot proceed.
"""
import hashlib
import json
import os
import sys
import tempfile
import time

COOLDOWN = 90  # seconds a given message stays muted after firing


def _state_path(key: str) -> str:
    # Keyed by message content: fixing one warning must not mute a different one.
    digest = hashlib.sha1(key.encode("utf-8", "replace")).hexdigest()[:16]
    return os.path.join(tempfile.gettempdir(), f"claude-hook-{digest}")


def recently_fired(key: str, cooldown: int = COOLDOWN) -> bool:
    """True if `key` fired within the cooldown, i.e. stay quiet now."""
    try:
        path = _state_path(key)
        if os.path.exists(path) and (time.time() - os.path.getmtime(path)) < cooldown:
            return True
        # Touch first: if the caller dies mid-print we still hold the mute, so a
        # crash-looping hook cannot spam. Better a lost warning than a lost session.
        with open(path, "w") as fh:
            fh.write("")
        return False
    except Exception:
        return False  # unwritable temp dir -> behave like a normal hook, just noisier


def say(message: str, event: str = "PostToolUse", cooldown: int = COOLDOWN) -> None:
    """Inject `message` into the agent's context, at most once per cooldown."""
    try:
        if recently_fired(message, cooldown):
            return
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": event,
                "additionalContext": message,
            }
        }))
    except Exception:
        pass  # never let a reminder break the tool call it is attached to


def stdin_json() -> dict:
    try:
        return json.load(sys.stdin) or {}
    except Exception:
        return {}
