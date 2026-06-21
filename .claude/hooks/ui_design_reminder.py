#!/usr/bin/env python3
"""UserPromptSubmit hook: when the prompt is about a UI / design change, inject
UI.md (the rubric + render-critique process) into context AND instruct the AI to
ask the owner for a screenshot via the AskUserQuestion interface before editing.

Why: AIs ship ugly-but-functional layouts that pass a quick "looks correct"
glance (saliency bias + prompt anchoring). The fix is a render -> critique ->
refine loop scored against a fixed rubric, made durable by this hook (PROC-01).

Mechanistically, step by step:

1. Claude Code runs this script *before the AI reads your prompt* (UserPromptSubmit)
   and pipes the hook JSON to stdin. `json.load(sys.stdin)` parses it; on any
   parse error, `sys.exit(0)` (exit 0, no output -> hook does nothing).
2. `data.get("prompt")` is your raw message; `.lower()` makes matching
   case-insensitive.
3. The trigger is a single OR over UI/design signals: the project tags
   (#ui #design #cram #cramp #toggle #joy-of-less #ui), or UI/design nouns
   (layout, badge, column, button, modal, dropdown, chart, spacing, padding,
   margin, align, font, colour/color, responsive, mobile, css, style, ux, ui).
   Any one match fires. Kept broad on purpose: a false *miss* on a UI prompt is
   worse than a false *fire* (this is the rule that keeps slipping).
4. Locates UI.md relative to THIS file (`__file__` -> `.claude/hooks/`, so
   `../../UI.md` is the repo root). Read failure -> `sys.exit(0)`.
5. Prepends a short "ask for a screenshot first" instruction, then `print`s a
   JSON object. Claude Code injects `hookSpecificOutput.additionalContext` into
   the model's context for this turn — that string (instruction + UI.md) is the
   entire effect.

It cannot block or force anything: no `exit 2`, no `decision: block`. It only
injects context — the AI may still ignore it. (Schema.md: hooks here are
aggressive *context*, not gates.)
"""
import os
import re
import sys
import json

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

prompt = (data.get("prompt") or "").lower()

# Fire on any UI/design signal: project tags or common UI/design nouns.
ui_tags = ("#ui", "#design", "#cram", "#cramp", "#toggle", "#joy-of-less")
has_tag = any(tag in prompt for tag in ui_tags)
has_noun = re.search(
    r"\b(ui|ux|layout|badge|column|button|modal|dropdown|chart|spacing|"
    r"padding|margin|align(?:ment)?|font|colou?r|responsive|mobile|css|"
    r"styl(?:e|ing)|design|whitespace|cramp?ed|rounding|pill)\b",
    prompt,
) is not None

if not (has_tag or has_noun):
    sys.exit(0)

# UI.md lives at the repo root; this script lives in .claude/hooks/.
ui_path = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "UI.md")
)
try:
    with open(ui_path, encoding="utf-8") as fh:
        ui_doc = fh.read()
except Exception:
    sys.exit(0)

msg = (
    "This looks like a UI / design change. Before you edit anything: you cannot "
    "see the live site (CONV-02), so use the AskUserQuestion interface (CONV-03) "
    "to ask the owner for a current screenshot of the screen you're changing "
    "(phone screenshot preferred). Then score that render against the rubric in "
    "UI.md below, and treat UI work as a render -> critique -> refine loop, not a "
    "one-shot edit. UI.md follows.\n\n" + ui_doc
)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": msg,
    }
}))

sys.exit(0)
