#!/usr/bin/env python3
"""Append-only data change log — shared by scrapers and the backfill script.

Events live in data/data_events.json. Scrapers diff on write and append one
batch event per run. Git backfill seeds historical commits without field detail.
"""
import json
import os
import subprocess
import uuid
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EVENTS_PATH = os.path.join(ROOT, "data", "data_events.json")
REK_PATH = os.path.join(ROOT, "data", "rek_tabs.json")
COMPANIES_PATH = os.path.join(ROOT, "data2", "companies.json")
DATA_PATH = os.path.join(ROOT, "data", "data.json")

_brand_by_jar = None
_slug_by_jar = None

DATA_METRICS = (
    "employees", "avgSalary", "salaryCosts", "revenue", "profit",
    "nonSalaryCosts", "estimatedIncome", "city", "risk",
)


def _now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _strip_meta(rec):
    if not rec:
        return rec
    return {k: v for k, v in rec.items() if k != "_meta"}


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


def _load_jar_maps():
    """Index rek_tabs.json by "Įmonės kodas" once — brand and slug in one walk."""
    global _brand_by_jar, _slug_by_jar
    if _brand_by_jar is not None:
        return
    _brand_by_jar, _slug_by_jar = {}, {}
    if not os.path.exists(REK_PATH):
        return
    rek = json.load(open(REK_PATH, encoding="utf-8"))
    for block in rek.get("companies", []):
        brand = block.get("brand") or block.get("name")
        for tab in block.get("tabs", {}).values():
            for field, value in tab.get("rows", []):
                if field == "Įmonės kodas" and value:
                    code = str(value).strip()
                    _brand_by_jar[code] = brand
                    if block.get("slug"):
                        _slug_by_jar[code] = block["slug"]
    # companies.json carries the 14 agencies that have no rekvizitai page, so it
    # is the only place their brand is written down. rek_tabs wins where both
    # know a code — it is the scrape's own record of what that page said.
    if os.path.exists(COMPANIES_PATH):
        for company in json.load(open(COMPANIES_PATH, encoding="utf-8")):
            code = str(company.get("jarCode") or "").strip()
            if code and code not in _brand_by_jar:
                _brand_by_jar[code] = company.get("brand") or company.get("name")
                if company.get("slug"):
                    _slug_by_jar[code] = company["slug"]


def brand_for_jar(jar):
    _load_jar_maps()
    return _brand_by_jar.get(str(jar))


def slug_for_jar(jar):
    """The rek_tabs slug a company code belongs to — the name of its Sodra file
    (data/sodra/<slug>.json). None when the code is not in rek_tabs.json."""
    _load_jar_maps()
    return _slug_by_jar.get(str(jar))


def sodra_meta():
    return {"scrapedAt": _now_iso(), "source": "atvira.sodra.lt (open data)"}


def diff_sodra(old, new):
    """Field-level diff for one Sodra company file."""
    new = _strip_meta(new)
    old = _strip_meta(old)
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


def flatten_rek(block):
    if not block:
        return {}
    out = {}
    for tab_name, tab in (block.get("tabs") or {}).items():
        for field, value in tab.get("rows", []):
            out[f"{tab_name}:{field}"] = value
    return out


def diff_rek_company(old, new):
    slug = new.get("slug")
    brand = new.get("brand")
    name = new.get("name")
    base = {"slug": slug, "brand": brand, "name": name}

    if old is None:
        flat = flatten_rek(new)
        return {**base, "kind": "added", "fieldCount": len(flat)}

    old_f, new_f = flatten_rek(old), flatten_rek(new)
    added_n = len([k for k in new_f if k not in old_f])
    removed_n = len([k for k in old_f if k not in new_f])
    changed = []
    for key in sorted(set(old_f) & set(new_f)):
        if old_f[key] != new_f[key]:
            field = key.split(":", 1)[-1]
            changed.append({
                "field": field,
                "from": str(old_f[key])[:120],
                "to": str(new_f[key])[:120],
            })
        if len(changed) >= 12:
            break

    if not added_n and not removed_n and not changed:
        return None

    ch = {**base, "kind": "changed"}
    if added_n:
        ch["fieldsAdded"] = added_n
    if removed_n:
        ch["fieldsRemoved"] = removed_n
    if changed:
        ch["fieldsChanged"] = changed
    return ch


def diff_rek_payload(old_payload, new_payload):
    old_map = {c["slug"]: c for c in (old_payload or {}).get("companies", [])}
    new_map = {c["slug"]: c for c in (new_payload or {}).get("companies", [])}
    changes = []
    for slug in sorted(set(old_map) | set(new_map)):
        if slug not in new_map:
            o = old_map[slug]
            changes.append({
                "slug": slug,
                "brand": o.get("brand"),
                "name": o.get("name"),
                "kind": "removed",
            })
            continue
        ch = diff_rek_company(old_map.get(slug), new_map[slug])
        if ch:
            changes.append(ch)
    return changes


def _row_key(row):
    return (row.get("brand"), row.get("year"))


def diff_data_payload(old_rows, new_rows):
    old_map = {_row_key(r): r for r in (old_rows or [])}
    new_map = {_row_key(r): r for r in (new_rows or [])}
    changes = []
    for key in sorted(set(old_map) | set(new_map), key=lambda k: (str(k[0]), k[1] or 0)):
        brand, year = key
        if key not in new_map:
            changes.append({"brand": brand, "year": year, "kind": "removed"})
            continue
        if key not in old_map:
            fields = {f: new_map[key].get(f) for f in DATA_METRICS if new_map[key].get(f) is not None}
            changes.append({"brand": brand, "year": year, "kind": "added", "fields": fields})
            continue
        field_changes = {}
        for f in DATA_METRICS:
            ov, nv = old_map[key].get(f), new_map[key].get(f)
            if ov != nv:
                field_changes[f] = {"from": ov, "to": nv}
        if field_changes:
            changes.append({"brand": brand, "year": year, "kind": "changed", "fields": field_changes})
    return changes


def append_event(source, trigger, summary, changes=None, stats=None, at=None, commit=None):
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


def _batch_summary(source, changes, extra=""):
    n_added = sum(1 for c in changes if c.get("kind") == "added")
    n_changed = sum(1 for c in changes if c.get("kind") == "changed")
    n_removed = sum(1 for c in changes if c.get("kind") == "removed")
    parts = []
    if n_added:
        parts.append(f"{n_added} new")
    if n_changed:
        parts.append(f"{n_changed} updated")
    if n_removed:
        parts.append(f"{n_removed} removed")
    label = source.capitalize()
    summary = f"{label}: {', '.join(parts) or str(len(changes)) + ' changed'}"
    if extra:
        summary += f" ({extra})"
    return summary, {"added": n_added, "changed": n_changed, "removed": n_removed}


def append_sodra_batch(changes, trigger="scrape_sodra.py", written=0, scanned=0):
    if not changes:
        return None
    summary, stats = _batch_summary("sodra", changes, f"{written}/{scanned} written")
    stats.update({"written": written, "scanned": scanned})
    return append_event(source="sodra", trigger=trigger, summary=summary, stats=stats, changes=changes)


def append_rek_batch(changes, trigger="parse_company.py"):
    if not changes:
        return None
    summary, stats = _batch_summary("rekvizitai", changes)
    return append_event(source="rekvizitai", trigger=trigger, summary=summary, stats=stats, changes=changes)


def append_initial_batch(changes, trigger="estimate_2025.py", label="Initial"):
    if not changes:
        return None
    summary, stats = _batch_summary(label.lower(), changes)
    return append_event(source="initial", trigger=trigger, summary=summary, stats=stats, changes=changes)


def load_rek():
    if not os.path.exists(REK_PATH):
        return {"companies": []}
    return json.load(open(REK_PATH, encoding="utf-8"))


def write_rek_payload(payload, trigger, old_payload=None):
    if old_payload is None:
        old_payload = load_rek()
    changes = diff_rek_payload(old_payload, payload)
    with open(REK_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    if changes:
        append_rek_batch(changes, trigger=trigger)
    return changes


def load_data():
    if not os.path.exists(DATA_PATH):
        return []
    return json.load(open(DATA_PATH, encoding="utf-8"))


def write_data_json(rows, trigger, old_rows=None, summary_label="Initial"):
    if old_rows is None:
        old_rows = load_data()
    changes = diff_data_payload(old_rows, rows)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False)
    if changes:
        append_initial_batch(changes, trigger=trigger, label=summary_label)
    return changes


def set_provenance(row, field, source):
    prov = row.setdefault("_provenance", {})
    prov[field] = source
