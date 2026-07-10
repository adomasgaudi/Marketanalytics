#!/usr/bin/env python3
"""Append-only data change log — shared by scrapers and the backfill script.

Events live in data/data_events.json. Each Sodra scrape diffs files on write
and appends one batch event. Git backfill seeds historical commits without
field-level detail.
"""
import json
import os
import subprocess
import uuid
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVENTS_PATH = os.path.join(ROOT, "data", "data_events.json")
REK_PATH = os.path.join(ROOT, "data", "rek_tabs.json")

_brand_by_jar = None


def _now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_events():
    if not os.path.exists(EVENTS_PATH):
        return {"events": []}
    with open(EVENTS_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_events(doc):
    os.makedirs(os.path.dirname(EVENTS_PATH), exist_ok=True)
    with open(EVENTS_PATH, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")


def git_head():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT, text=True, stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return None


def brand_for_jar(jar):
    global _brand_by_jar
    if _brand_by_jar is None:
        _brand_by_jar = {}
        if os.path.exists(REK_PATH):
            rek = json.load(open(REK_PATH, encoding="utf-8"))
            for block in rek.get("companies", []):
                brand = block.get("brand") or block.get("name")
                for tab in block.get("tabs", {}).values():
                    for field, value in tab.get("rows", []):
                        if field == "Įmonės kodas" and value:
                            _brand_by_jar[str(value).strip()] = brand
    return _brand_by_jar.get(str(jar))


def diff_sodra(old, new):
    """Field-level diff for one Sodra company file. None if old is missing (new file)."""
    jar = str(new.get("jarCode", ""))
    brand = brand_for_jar(jar)
    base = {"jarCode": jar, "brand": brand, "name": new.get("name")}

    if old is None:
        months = new.get("months") or []
        return {
            **base,
            "kind": "added",
            "monthCount": len(months),
            "latestMonth": (new.get("latest") or {}).get("month"),
        }

    old_months = {m["month"]: m for m in old.get("months") or []}
    new_months = {m["month"]: m for m in new.get("months") or []}
    added = sorted(set(new_months) - set(old_months))
    updated = []
    for month in sorted(set(old_months) & set(new_months)):
        om, nm = old_months[month], new_months[month]
        fields = {}
        for key in ("numInsured", "avgWage", "tax"):
            if om.get(key) != nm.get(key):
                fields[key] = {"from": om.get(key), "to": nm.get(key)}
        if fields:
            updated.append({"month": month, **fields})

    latest_old = old.get("latest") or {}
    latest_new = new.get("latest") or {}
    latest_changed = {}
    for key in ("month", "numInsured", "avgWage"):
        if latest_old.get(key) != latest_new.get(key):
            latest_changed[key] = {"from": latest_old.get(key), "to": latest_new.get(key)}

    if not added and not updated and not latest_changed:
        return None

    ch = {**base, "kind": "changed"}
    if added:
        ch["monthsAdded"] = added
    if updated:
        ch["monthsUpdated"] = updated
    if latest_changed:
        ch["latest"] = latest_changed
    return ch


def append_event(source, trigger, summary, changes=None, stats=None, at=None, commit=None):
    """Append one event. Returns the new event dict."""
    doc = load_events()
    ev = {
        "id": "evt-" + uuid.uuid4().hex[:12],
        "at": at or _now_iso(),
        "source": source,
        "trigger": trigger,
        "commit": commit or git_head(),
        "summary": summary,
    }
    if stats:
        ev["stats"] = stats
    if changes:
        ev["changes"] = changes
    doc["events"].append(ev)
    save_events(doc)
    return ev


def append_sodra_batch(changes, trigger="scrape_sodra.py", written=0, scanned=0):
    """Log one Sodra scrape run."""
    if not changes:
        return None
    n_added = sum(1 for c in changes if c.get("kind") == "added")
    n_changed = sum(1 for c in changes if c.get("kind") == "changed")
    parts = []
    if n_added:
        parts.append(f"{n_added} new")
    if n_changed:
        parts.append(f"{n_changed} updated")
    summary = f"Sodra: {', '.join(parts) or str(len(changes)) + ' changed'} ({written}/{scanned} written)"
    return append_event(
        source="sodra",
        trigger=trigger,
        summary=summary,
        stats={"written": written, "scanned": scanned, "added": n_added, "changed": n_changed},
        changes=changes,
    )
