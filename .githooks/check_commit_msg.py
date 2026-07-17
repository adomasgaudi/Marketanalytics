#!/usr/bin/env python3
"""Shared commit-subject format checker — git `commit-msg` hook backend.

Usage: <python> check_commit_msg.py <path-to-commit-msg-file>

Reads the commit message file git hands the commit-msg hook, checks the SUBJECT
(first non-empty, non-comment line) against the vz house format, and prints a
loud reminder to STDERR if it's off. Always exits 0 (warn-allow): the commit is
NOT rejected, but every client/editor/AI that commits through git sees the same
warning — this is the cross-client enforcement layer (Claude Code, VS Code,
Cursor, a plain terminal all run git hooks identically).

Why a git hook AND the Claude PreToolUse hook:
- The Claude hook only fires in clients that load .claude/settings.json.
- This git hook fires for ANY committer, so the rule lands the same everywhere.
- Both warn (never hard-block), matching the project's "inform, don't gate" style.
"""
import re
import sys

# vN (legacy, e.g. v70) or semver vX.Y[.Z] (stacked convention: minor = visual
# change, patch = non-visual), e.g. v3.11.0 / v2.9.1.
HOUSE = re.compile(r"^v\d+(?:\.\d+){0,2}\s+[A-Z]{2,5}-\d+\s*\|\s*.+\s*\|\s*\d+(?:\.\d+)?\s*sp\s*$")


def first_subject(text):
    for line in text.splitlines():
        s = line.strip()
        if s and not s.startswith("#"):
            return s
    return ""


def problems_for(subject):
    probs = []
    if re.search(r"\bXX\b", subject) or re.search(r"\bTODO\b", subject, re.I) \
            or re.search(r"CODE-?(?:XX|NN)", subject, re.I) or re.search(r"<[^>]+>", subject):
        probs.append("unfilled placeholder left in the subject (XX / TODO / CODE-XX / <...>).")
    if not HOUSE.match(subject):
        probs.append("subject doesn't match `vN CODE-NN | description | n sp`.")
    return probs


def main():
    if len(sys.argv) < 2:
        return 0
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            text = f.read()
    except Exception:
        return 0  # never break a commit over our own read error

    subject = first_subject(text)
    if not subject:
        return 0
    # merge commits are auto-generated; don't nag them
    if subject.lower().startswith("merge "):
        return 0

    probs = problems_for(subject)
    if not probs:
        return 0

    msg = (
        "\n[!] COMMIT FORMAT (GIT-01) - your subject is off:\n  \"" + subject + "\"\n"
        "Problems:\n  - " + "\n  - ".join(probs) + "\n"
        "Required: vN CODE-NN | short description | n sp\n"
        "  e.g.    v70 REPO-01 | scrape Adface + Adverum into rek_tabs.json | 2 sp\n"
        "  vN = patch digit only (v70, not v0.1.70); CODE-NN = driving rule id; n sp = story points\n"
        "(warning only - commit allowed; use `git commit --amend` to fix the subject)\n"
    )
    # stderr may be a cp1252 console on Windows; never crash on a non-encodable char
    try:
        sys.stderr.write(msg)
    except Exception:
        sys.stderr.write(msg.encode("ascii", "replace").decode("ascii"))
    return 0  # warn-allow


if __name__ == "__main__":
    sys.exit(main())
