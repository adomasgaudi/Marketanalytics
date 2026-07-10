#!/usr/bin/env python3
"""One-time (re-runnable) backfill of data/data_events.json from git history.

    python3 scripts/backfill_data_events.py
    python3 scripts/backfill_data_events.py --force   # replace backfill events

Walks `git log -- data/` and creates summary events (no field-level diffs for
old commits — those only exist for future scrapes).
"""
import argparse
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from data_events import EVENTS_PATH, append_event, load_events, save_events

SODRA_RE = re.compile(r"sodra", re.I)
REK_RE = re.compile(r"rekvizitai|rek_tabs|scrape", re.I)
DATA_RE = re.compile(r"data\.json|2025|turnover|estimate|import", re.I)


def git_log():
    out = subprocess.check_output(
        ["git", "log", "--format=%H|%aI|%s", "--", "data/"],
        cwd=ROOT, text=True,
    )
    rows = []
    for line in out.splitlines():
        if "|" not in line:
            continue
        sha, at, subj = line.split("|", 2)
        rows.append({"sha": sha[:7], "at": at.replace("+00:00", "Z"), "subject": subj})
    return rows


def files_in_commit(sha):
    out = subprocess.check_output(
        ["git", "diff-tree", "--no-commit-id", "--name-only", "-r", sha],
        cwd=ROOT, text=True,
    )
    return [ln.strip() for ln in out.splitlines() if ln.strip().startswith("data/")]


def infer_source(subject, files):
    sodra_n = sum(1 for f in files if f.startswith("data/sodra/"))
    rek = any("rek_tabs" in f for f in files)
    data = any(f.endswith("data.json") for f in files)
    subj = subject
    if sodra_n and not rek and not data:
        return "sodra"
    if rek and not data and sodra_n == 0:
        return "rekvizitai"
    if data and sodra_n == 0 and not rek:
        return "initial"
    if SODRA_RE.search(subj) and sodra_n:
        return "sodra"
    if REK_RE.search(subj):
        return "rekvizitai"
    if DATA_RE.search(subj) or data:
        return "initial"
    if sodra_n:
        return "sodra"
    if rek:
        return "rekvizitai"
    return "mixed"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="drop prior backfill events and rebuild")
    args = ap.parse_args()

    doc = load_events()
    if args.force:
        doc["events"] = [e for e in doc.get("events", []) if e.get("trigger") != "git-backfill"]
    existing_commits = {e.get("commit") for e in doc.get("events", []) if e.get("commit")}

    added = 0
    for row in git_log():
        if row["sha"] in existing_commits:
            continue
        files = files_in_commit(row["sha"])
        if not files:
            continue
        source = infer_source(row["subject"], files)
        stats = {
            "sodraFiles": sum(1 for f in files if f.startswith("data/sodra/")),
            "rekTabs": 1 if any("rek_tabs" in f for f in files) else 0,
            "dataJson": 1 if any(f.endswith("data.json") for f in files) else 0,
            "fileCount": len(files),
        }
        append_event(
            source=source,
            trigger="git-backfill",
            summary=row["subject"],
            stats=stats,
            at=row["at"],
            commit=row["sha"],
        )
        added += 1

    print(f"Backfill done: {added} events added -> {EVENTS_PATH}")
    print(f"Total events: {len(load_events().get('events', []))}")


if __name__ == "__main__":
    main()
