#!/usr/bin/env python3
"""Download labels people contributed on the public page, and choose whose labels to train on.

  python3 training/pull_labels.py              download new contributions, then list contributors
  python3 training/pull_labels.py list         list contributors and their status
  python3 training/pull_labels.py show ID      songs and label counts for one contributor
  python3 training/pull_labels.py approve ID   train on this contributor's labels (ID prefix is enough)
  python3 training/pull_labels.py block ID     never train on this contributor's labels
  python3 training/pull_labels.py pending ID   undo approve/block

Contributors start as pending; only approved contributors' labels are used by finetune.py.
Needs ~/.cache/cowbell-detector/share.json: {"api": "https://...workers.dev", "token": "..."}.
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict

DATA = os.path.expanduser(os.environ.get("COWBELL_DATA", "~/.cache/cowbell-detector"))
SHARED = f"{DATA}/shared"
LABELS = f"{SHARED}/labels"


def load(path, default):
    try:
        return json.load(open(path))
    except (OSError, ValueError):
        return default


def save(path, obj):
    tmp = path + ".tmp"
    json.dump(obj, open(tmp, "w"), indent=1)
    os.replace(tmp, path)


def label_files():
    return sorted(f for f in os.listdir(LABELS) if f.endswith(".json")) if os.path.isdir(LABELS) else []


def pull():
    cfg = load(f"{DATA}/share.json", None)
    if not cfg or not cfg.get("api") or not cfg.get("token"):
        sys.exit(f"Missing {DATA}/share.json with the Worker URL and ADMIN_TOKEN.")
    os.makedirs(LABELS, exist_ok=True)
    cursor = load(f"{SHARED}/cursor.json", {"since": 0, "since_id": 0})
    got = removed = 0
    while True:
        req = urllib.request.Request(f"{cfg['api'].rstrip('/')}/export?since={cursor['since']}&since_id={cursor['since_id']}",
                                     headers={"Authorization": f"Bearer {cfg['token']}",
                                              # Cloudflare blocks Python's default user agent as a bot.
                                              "User-Agent": "cowbell-detector-pull/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                page = json.load(r)
        except urllib.error.HTTPError as e:
            sys.exit(f"The label server said {e.code}: {e.read()[:200].decode(errors='replace')}")
        for row in page["rows"]:
            key = f"{row['contributor']}__{row['song']}__{row['frame']}"
            meta_path, patch_path = f"{LABELS}/{key}.json", f"{LABELS}/{key}.i16"
            if row["y"] is None:
                for p in (meta_path, patch_path):
                    if os.path.exists(p):
                        os.remove(p)
                removed += 1
                continue
            if row["patch"]:
                open(patch_path, "wb").write(base64.b64decode(row["patch"]))
            meta = {k: row[k] for k in ("contributor", "song", "title", "frame", "y", "start", "frames", "updated")}
            save(meta_path, meta)
            got += 1
        cursor = page["next"]
        save(f"{SHARED}/cursor.json", cursor)
        if not page["more"]:
            break
    print(f"Downloaded {got} label changes, {removed} withdrawn.")


def summary():
    status = load(f"{SHARED}/contributors.json", {})
    per = defaultdict(lambda: {"labels": 0, "pos": 0, "songs": set(), "titles": Counter()})
    for f in label_files():
        m = load(f"{LABELS}/{f}", None)
        if not m:
            continue
        s = per[m["contributor"]]
        s["labels"] += 1
        s["pos"] += m["y"]
        s["songs"].add(m["song"])
        s["titles"][m.get("title") or "untitled"] += 1
    for c in per:
        status.setdefault(c, "pending")
    save(f"{SHARED}/contributors.json", status)
    return status, per


def find(prefix, status):
    hits = [c for c in status if c.startswith(prefix)]
    if len(hits) != 1:
        sys.exit(f"'{prefix}' matches {len(hits)} contributors. Use more characters.")
    return hits[0]


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else "pull"
    if cmd == "pull":
        pull()
    status, per = summary()
    if cmd in ("approve", "block", "pending"):
        c = find(args[1], status)
        status[c] = {"approve": "approved", "block": "blocked", "pending": "pending"}[cmd]
        save(f"{SHARED}/contributors.json", status)
        print(f"{c}: {status[c]}")
        return
    if cmd == "show":
        c = find(args[1], status)
        print(f"{c} ({status[c]})")
        for t, n in per[c]["titles"].most_common():
            print(f"  {n:4d}  {t}")
        return
    if not per:
        print("No contributed labels yet.")
        return
    print(f"\n{'contributor':<14} {'status':<9} {'labels':>6} {'cowbell':>7} {'songs':>5}  top song")
    for c, s in sorted(per.items(), key=lambda kv: (status[kv[0]] != "pending", -kv[1]["labels"])):
        top = s["titles"].most_common(1)[0][0][:40]
        print(f"{c[:12]:<14} {status[c]:<9} {s['labels']:>6} {s['pos']:>7} {len(s['songs']):>5}  {top}")
    pend = [c for c in per if status[c] == "pending"]
    if pend:
        print(f"\n{len(pend)} pending. Check with `show ID`, then `approve ID` or `block ID`.")


if __name__ == "__main__":
    main()
