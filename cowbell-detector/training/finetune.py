"""Fine-tune the cowbell CNN on the hits you confirmed or rejected in the app.

Starts from the original model (base.pt) every time and mixes your labels with the STAR Drums
replay set so the model keeps what it already knows. Writes models/current.json for the page.

Data lives in ~/.cache/cowbell-detector (override with COWBELL_DATA):
  base.pt               original checkpoint (weights + mel normalization)
  replay/               STAR Drums log-mels + index.json
  user/<id>.f32/.json   log-mels and labels saved by the app
  shared/               labels contributed on the public page (pull_labels.py); only approved contributors are used
  models/               fine-tuned weights, metrics, training status
"""
import argparse
import json
import os
import random
import sys
import time
import traceback

import numpy as np
import torch
import torch.nn.functional as Fn

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from model import NM, Net, export_spec  # noqa: E402

DATA = os.path.expanduser(os.environ.get("COWBELL_DATA", "~/.cache/cowbell-detector"))
CROP, TH = 400, 0.3  # TH matches the hit threshold in index.html


def status(**kw):
    kw["time"] = time.time()
    tmp = f"{DATA}/models/status.json.tmp"
    json.dump(kw, open(tmp, "w"))
    os.replace(tmp, f"{DATA}/models/status.json")


def soft_target(T, times):
    y = np.zeros(T, np.float32)
    for t in times:
        k = int(round(t * 100))
        for d, v in ((0, 1.0), (-1, 0.5), (1, 0.5)):
            if 0 <= k + d < T:
                y[k + d] = max(y[k + d], v)
    return y


@torch.no_grad()
def activations(net, mel, dev):
    net.eval()
    m = torch.tensor(mel).T[None, None].to(dev)
    out = []
    for a in range(0, m.shape[-1], 6000):
        lo, hi = max(0, a - 40), min(m.shape[-1], a + 6040)
        p = torch.sigmoid(net(m[..., lo:hi]))[0].cpu().numpy()
        out.append(p[a - lo: a - lo + min(6000, m.shape[-1] - a)])
    net.train()
    return np.concatenate(out)


def peaks(p, th=TH):
    return [i for i in range(len(p)) if p[i] >= th and p[i] == p[max(0, i - 3):i + 4].max()]


def star_metrics(net, val, dev):
    tp = fp = fn = 0
    for it in val:
        pk = [i / 100 for i in peaks(activations(net, it["mel"], dev))]
        used = set()
        for t in pk:
            m = next((g for g in it["cb"] if abs(g - t) < 0.05 and g not in used), None)
            if m is None:
                fp += 1
            else:
                tp += 1
                used.add(m)
        fn += len(it["cb"]) - len(used)
    p, r = tp / max(1, tp + fp), tp / max(1, tp + fn)
    return {"precision": round(p, 3), "recall": round(r, 3), "f1": round(2 * p * r / max(1e-9, p + r), 3)}


def label_accuracy(net, songs, dev):
    right = total = 0
    for s in songs:
        act = activations(net, s["mel"], dev)
        for lab in s["labels"]:
            k = int(round(lab["t"] * 100))
            near = act[max(0, k - 3):k + 4].max() if len(act) else 0
            right += int((near >= TH) == bool(lab["y"]))
            total += 1
    return {"correct": right, "total": total}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", type=int, default=600)
    args = ap.parse_args()
    os.makedirs(f"{DATA}/models", exist_ok=True)
    status(state="loading", step=0, steps=args.steps)
    dev = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    torch.manual_seed(0); random.seed(0); np.random.seed(0)

    base = torch.load(f"{DATA}/base.pt", map_location="cpu")
    mu, sd = np.array(base["mu"], np.float32), np.array(base["sd"], np.float32)
    norm = lambda m: ((m - mu) / sd).astype(np.float32)

    replay = json.load(open(f"{DATA}/replay/index.json"))
    for it in replay:
        it["mel"] = norm(np.fromfile(f"{DATA}/replay/{it['file']}", dtype=np.float32).reshape(-1, NM))
        it["y"] = soft_target(len(it["mel"]), it["cb"] or [])
    train = [it for it in replay if it["split"] == "train"]
    val = [it for it in replay if it["split"] == "val"]
    cb_events = [(i, t) for i, it in enumerate(train) for t in (it["cb"] or [])]

    def prepare(meta):
        T = len(meta["mel"])
        y, mask = np.zeros(T, np.float32), np.zeros(T, np.float32)
        for lab in meta["labels"]:
            k = int(round(lab["t"] * 100))
            lo, hi = max(0, k - 12), min(T, k + 13)
            mask[lo:hi] = np.maximum(mask[lo:hi], 1.0)
            if lab["y"]:
                for d, v in ((0, 1.0), (-1, 0.5), (1, 0.5)):
                    if 0 <= k + d < T:
                        y[k + d] = max(y[k + d], v)
            else:
                mask[max(0, k - 2):k + 3] = 3.0  # rejected hits count extra
        meta["y"], meta["mask"] = y, mask
        return meta

    songs = []
    for f in sorted(os.listdir(f"{DATA}/user")):
        if not f.endswith(".json"):
            continue
        meta = json.load(open(f"{DATA}/user/{f}"))
        mel_path = f"{DATA}/user/{f[:-5]}.f32"
        if not meta.get("labels") or not os.path.exists(mel_path):
            continue
        meta["mel"] = norm(np.fromfile(mel_path, dtype=np.float32).reshape(-1, NM))
        meta["keys"] = [f"{meta['id']}|{lab['t']}|{lab['y']}" for lab in meta["labels"]]
        songs.append(prepare(meta))
    # Labels from the public page: a spectrogram window per hit, only from contributors you approved.
    approved = {c for c, st in json.load(open(f"{DATA}/shared/contributors.json")).items() if st == "approved"} \
        if os.path.exists(f"{DATA}/shared/contributors.json") else set()
    n_shared = 0
    shared_dir = f"{DATA}/shared/labels"
    for f in sorted(os.listdir(shared_dir)) if os.path.isdir(shared_dir) else []:
        if not f.endswith(".json"):
            continue
        m = json.load(open(f"{shared_dir}/{f}"))
        patch = f"{shared_dir}/{f[:-5]}.i16"
        if m["contributor"] not in approved or not os.path.exists(patch):
            continue
        mel = np.fromfile(patch, dtype="<i2").astype(np.float32).reshape(-1, NM) / 1000.0
        songs.append(prepare({"id": f[:-5], "mel": norm(mel), "labels": [{"t": (m["frame"] - m["start"]) / 100, "y": m["y"]}],
                              "keys": [f"shared:{m['contributor']}|{m['song']}|{m['frame']}|{m['y']}"]}))
        n_shared += 1
    n_labels = sum(len(s["labels"]) for s in songs)
    if not n_labels:
        status(state="error", message="No labeled hits yet. Mark some hits as cowbell or not cowbell first.")
        return
    user_events = [(i, lab["t"]) for i, s in enumerate(songs) for lab in s["labels"]]

    net = Net().to(dev)
    net.load_state_dict(base["state"])
    status(state="evaluating", step=0, steps=args.steps, phase="before")
    before = {"star": json.load(open(f"{DATA}/models/base_metrics.json")) if os.path.exists(f"{DATA}/models/base_metrics.json") else None,
              "labels": label_accuracy(net, songs, dev)}
    if before["star"] is None:
        before["star"] = star_metrics(net, val, dev)
        json.dump(before["star"], open(f"{DATA}/models/base_metrics.json", "w"))

    def crop(m, y, mask, start):
        start = max(0, min(start, len(m) - CROP))
        seg, ys, ms = m[start:start + CROP], y[start:start + CROP], mask[start:start + CROP]
        if len(seg) < CROP:
            pad = CROP - len(seg)
            seg = np.pad(seg, ((0, pad), (0, 0)), constant_values=float(seg.min()))
            ys, ms = np.pad(ys, (0, pad)), np.pad(ms, (0, pad))
        return seg, ys, ms

    opt = torch.optim.Adam(net.parameters(), 3e-4)
    posw = torch.tensor(8.0, device=dev)
    net.train()
    for step in range(1, args.steps + 1):
        X, Y, W = [], [], []
        for b in range(20):  # replay: half centered on STAR cowbells
            if b % 2 == 0:
                i, t = random.choice(cb_events); it = train[i]; s = int(t * 100) - random.randint(20, CROP - 20)
            else:
                it = random.choice(train); s = random.randint(0, max(0, len(it["mel"]) - CROP))
            seg, ys, _ = crop(it["mel"], it["y"], np.ones(len(it["y"]), np.float32), s)
            X.append(seg); Y.append(ys); W.append(np.where(ys > 0, 8.0, 1.0).astype(np.float32))
        for _ in range(12):  # your labels, loss only near labeled moments
            i, t = random.choice(user_events); s_ = songs[i]
            seg, ys, ms = crop(s_["mel"], s_["y"], s_["mask"], int(t * 100) - random.randint(20, CROP - 20))
            X.append(seg); Y.append(ys); W.append(ms * np.where(ys > 0, 8.0, 1.0).astype(np.float32) * 2.0)
        X = torch.tensor(np.stack(X)).transpose(1, 2).unsqueeze(1).to(dev)
        Y = torch.tensor(np.stack(Y)).to(dev); Wt = torch.tensor(np.stack(W)).to(dev)
        loss = (Fn.binary_cross_entropy_with_logits(net(X), Y, reduction="none") * Wt).sum() / Wt.sum()
        opt.zero_grad(); loss.backward(); opt.step()
        if step % 25 == 0:
            status(state="training", step=step, steps=args.steps)

    status(state="evaluating", step=args.steps, steps=args.steps, phase="after")
    after = {"star": star_metrics(net, val, dev), "labels": label_accuracy(net, songs, dev)}
    spec = export_spec(net.state_dict(), mu, sd)
    tmp = f"{DATA}/models/current.json.tmp"
    json.dump(spec, open(tmp, "w")); os.replace(tmp, f"{DATA}/models/current.json")
    meta = {"trained_at": time.strftime("%Y-%m-%d %H:%M"), "songs": len(songs) - n_shared, "labels": n_labels, "shared_labels": n_shared, "steps": args.steps,
            "before": before, "after": after}
    json.dump(meta, open(f"{DATA}/models/current_meta.json", "w"))
    # Exactly which labels this model saw, so the app can count what's new since.
    json.dump(sorted(k for s in songs for k in s["keys"]),
              open(f"{DATA}/models/trained_labels.json", "w"))
    status(state="done", step=args.steps, **meta)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc()
        status(state="error", message=f"{type(e).__name__}: {e}")
