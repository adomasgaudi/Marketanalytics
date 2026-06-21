#!/usr/bin/env python3
"""PreToolUse hook: before a `git commit`, check the message's SUBJECT line
against the vz house format and warn (non-blocking) if it's off.

House format (derived from git log): `vN CODE-NN | description | n sp`
  e.g.  v40 DATA-46 | Data Explorer tab descriptions | 2 sp
        v39 BULD-14 | Fix MY_BRAND crash, unify version counter | 3 sp

WHY a hook here, and why this event:
- The defect is verifiable (a regex decides it, no judgment) -> it passes
  Schema.md's hook test, so a hook is the right mechanism, not prose.
- PreToolUse fires *before* the commit runs, so the warning lands while the AI
  can still re-issue a corrected `git commit`. PostToolUse would warn only after
  the bad message is already in history.
- Non-blocking by design (no exit 2, no decision:block), matching every other vz
  hook and Schema.md's "nothing here force-blocks" principle. It informs; the AI
  fixes it. A real one-off off-format commit can still proceed.

Mechanistically, step by step:

1. Claude Code runs this before a Bash tool call and pipes the hook JSON to
   stdin. We read `tool_input.command` (the shell string about to run). Any
   parse error -> sys.exit(0) (exit 0, no output = hook does nothing).
2. If the command isn't a `git commit`, exit silently. We only act on commits.
3. Extract the commit MESSAGE from the command. We handle the common forms:
   `-m "..."`, `-m '...'`, and `-m @'...'@` / `@"..."@` PowerShell here-strings
   (whose `@`/`@'`/`'@` delimiters are NOT part of the message and are stripped).
   `--amend` with no `-m` (editor/reuse) -> nothing to check, exit silently.
4. Take the SUBJECT (first non-empty line) and run deterministic checks:
   - stray here-string markers leaked into the text (a leading/standalone `@`),
   - unfilled placeholders (XX, TODO, CODE-XX, `SP:n`, `<...>`),
   - house-format shape: `vNN CODE-NN | ... | n sp`.
5. If anything is off, print hookSpecificOutput.additionalContext describing the
   problems + the expected format. That string is injected into context; the AI
   may fix the message and re-commit. Nothing is blocked.

It cannot block or force anything: no exit 2, no decision:block. It only injects
context. (See Schema.md: hooks here are aggressive *context*, not gates.)
"""
import re
import sys
import json

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

cmd = ((data.get("tool_input") or {}).get("command") or "")

# Act only on git commits.
if not re.search(r"\bgit\b.*\bcommit\b", cmd):
    sys.exit(0)


def extract_message(command):
    """Pull the commit message that follows the FIRST -m/--message in `command`.

    Handles -m "..."  /  -m '...'  /  -m @'...'@  /  -m @"..."@ (PowerShell
    here-strings). Returns None if there is no -m (e.g. bare --amend opens an
    editor / reuses a message — nothing for us to check)."""
    m = re.search(r"(?:-m|--message)\s+(.*)", command, re.S)
    if not m:
        return None
    rest = m.group(1).lstrip()

    # PowerShell here-string: @'...'@  or  @"..."@  (delimiters are NOT message).
    hs = re.match(r"@(['\"])(.*?)\1@", rest, re.S)
    if hs:
        return hs.group(2)

    # Normal single- or double-quoted string. Stop at the matching close quote;
    # good enough for the subject line (first line), which is all we inspect.
    q = re.match(r"(['\"])(.*?)\1", rest, re.S)
    if q:
        return q.group(2)

    # Unquoted -m token: take up to the next whitespace.
    return rest.split()[0] if rest.split() else None


msg = extract_message(cmd)
if not msg:
    sys.exit(0)

# Subject = first non-empty line.
subject = ""
for line in msg.splitlines():
    if line.strip():
        subject = line.strip()
        break
if not subject:
    sys.exit(0)

problems = []

# 1) Stray PowerShell here-string markers leaked into the message text.
if subject.startswith("@") or subject == "@":
    problems.append(
        "subject starts with a stray '@' — looks like a PowerShell here-string "
        "marker (@'...'@) leaked into the message; the @ delimiters are not part "
        "of the text."
    )

# 2) Unfilled placeholders left in the subject.
placeholder_hits = []
if re.search(r"\bXX\b", subject):
    placeholder_hits.append("XX")
if re.search(r"\bTODO\b", subject, re.I):
    placeholder_hits.append("TODO")
if re.search(r"\bCODE-?(?:XX|NN)\b", subject, re.I):
    placeholder_hits.append("CODE-XX")
if re.search(r"-XX\b", subject):           # e.g. DATA-XX
    placeholder_hits.append("CODE suffix -XX")
if re.search(r"SP:\s*n\b", subject, re.I):
    placeholder_hits.append("SP:n")
if re.search(r"<[^>]+>", subject):         # e.g. <code>, <date>
    placeholder_hits.append("<...> angle-bracket placeholder")
if placeholder_hits:
    problems.append(
        "unfilled placeholder(s) in subject: " + ", ".join(placeholder_hits)
        + " — replace with the real value."
    )

# 3) House-format shape: `vNN CODE-NN | description | n sp`.
#    vN at the start, a CODE-NN ticket, pipe-separated, ending in `n sp`.
HOUSE = re.compile(
    r"^v\d+\s+[A-Z]{2,5}-\d+\s*\|\s*.+\s*\|\s*\d+(?:\.\d+)?\s*sp\s*$"
)
if not HOUSE.match(subject):
    problems.append(
        "subject doesn't match the house format `vN CODE-NN | description | n sp`"
        " (e.g. `v40 DATA-46 | Data Explorer tab descriptions | 2 sp`)."
    )

if not problems:
    sys.exit(0)

advice = (
    "Commit-message check (non-blocking) — the subject line looks off:\n  \""
    + subject
    + "\"\n\nProblems:\n- "
    + "\n- ".join(problems)
    + "\n\nExpected: `vN CODE-NN | short description | n sp`  "
    "(see DATA-05 / recent git log). The commit was NOT blocked; if this was "
    "intentional you can proceed, otherwise re-run git commit with a fixed "
    "subject."
)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "additionalContext": advice,
    }
}))

sys.exit(0)
