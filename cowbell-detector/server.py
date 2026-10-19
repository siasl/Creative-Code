#!/usr/bin/env python3
"""Local server for Cowbell Detector.

Serves index.html and adds /api/youtube, which fetches a YouTube video's audio
with yt-dlp, converts it to mono 44.1 kHz WAV with ffmpeg and returns it.

It also stores the hits you mark as cowbell / not cowbell and fine-tunes the model on them
(training/finetune.py). Training data and models live in ~/.cache/cowbell-detector.

Needs yt-dlp and ffmpeg on PATH (brew install yt-dlp ffmpeg). Retraining needs the
training environment: see training/setup.sh.
Run: python3 server.py, then open http://localhost:8808
"""
import hashlib
import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
from pathlib import Path

PORT = 8808
ROOT = Path(__file__).resolve().parent
MAX_SECONDS = 600  # longest video accepted
SKELETON = ('<!doctype html><html lang="en"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
            '<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n')
DATA = Path(os.path.expanduser(os.environ.get("COWBELL_DATA", "~/.cache/cowbell-detector")))
TRAIN_PY = DATA / "venv" / "bin" / "python"
SONG_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
train_proc = None  # running fine-tune subprocess
YT_CACHE = DATA / "youtube"  # converted WAVs, one per video, so nothing downloads twice
YT_ID = re.compile(r"(?:[?&]v=|youtu\.be/|/shorts/|/embed/|/live/)([A-Za-z0-9_-]{11})")
YT_URL = re.compile(r"^https?://([a-z0-9-]+\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)/", re.I)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/ping":
            return self.send_json(200, {"ok": True})
        if parsed.path == "/api/youtube":
            url = urllib.parse.parse_qs(parsed.query).get("url", [""])[0].strip()
            return self.youtube(url)
        if parsed.path == "/api/labels":
            sid = urllib.parse.parse_qs(parsed.query).get("id", [""])[0]
            if not SONG_ID.match(sid):
                return self.send_json(400, {"error": "Bad song id"})
            f = DATA / "user" / f"{sid}.json"
            return self.send_json(200, json.loads(f.read_text()) if f.exists() else {"id": sid, "labels": []})
        if parsed.path == "/api/train":
            return self.send_json(200, self.train_status())
        if parsed.path == "/api/model":
            f = DATA / "models" / "current.json"
            if not f.exists():
                return self.send_json(404, {"error": "Using the original model"})
            body = f.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return self.wfile.write(body)
        if parsed.path not in ("/", "/index.html"):
            return self.send_json(404, {"error": "Not found"})
        # index.html is written for the artifact host, which adds the document skeleton.
        body = (SKELETON + (ROOT / "index.html").read_text(encoding="utf-8")).encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        global train_proc
        parsed = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(parsed.query)
        body = self.rfile.read(int(self.headers.get("Content-Length", 0) or 0))
        (DATA / "user").mkdir(parents=True, exist_ok=True)
        (DATA / "models").mkdir(parents=True, exist_ok=True)
        if parsed.path == "/api/song":
            # Log-mel spectrogram (float32, 64 bands x T frames) computed by the page.
            sid = q.get("id", [""])[0]
            if not SONG_ID.match(sid) or not body or len(body) % 256:
                return self.send_json(400, {"error": "Bad song upload"})
            (DATA / "user" / f"{sid}.f32").write_bytes(body)
            return self.send_json(200, {"ok": True})
        if parsed.path == "/api/labels":
            try:
                rec = json.loads(body)
                sid = rec["id"]
                assert SONG_ID.match(sid)
                labels = [{"t": round(float(l["t"]), 3), "y": 1 if l["y"] else 0} for l in rec["labels"]]
            except Exception:
                return self.send_json(400, {"error": "Bad labels"})
            out = {"id": sid, "title": str(rec.get("title", ""))[:200], "T": int(rec.get("T", 0)), "labels": labels}
            (DATA / "user" / f"{sid}.json").write_text(json.dumps(out))
            return self.send_json(200, {"ok": True, **self.label_counts()})
        if parsed.path == "/api/train":
            if train_proc and train_proc.poll() is None:
                return self.send_json(409, {"error": "Already training"})
            if not TRAIN_PY.exists():
                return self.send_json(500, {"error": "Training environment missing. Run training/setup.sh first."})
            train_proc = subprocess.Popen([str(TRAIN_PY), str(ROOT / "training" / "finetune.py")],
                                          stdout=open(DATA / "models" / "train.log", "w"), stderr=subprocess.STDOUT)
            (DATA / "models" / "status.json").write_text(json.dumps({"state": "starting", "step": 0, "steps": 1}))
            return self.send_json(200, {"ok": True})
        if parsed.path == "/api/model/reset":
            f = DATA / "models" / "current.json"
            if f.exists():
                f.replace(DATA / "models" / "previous.json")
            return self.send_json(200, {"ok": True})
        return self.send_json(404, {"error": "Not found"})

    def label_counts(self):
        songs = labels = pos = 0
        current = set()
        for f in (DATA / "user").glob("*.json"):
            try:
                rec = json.loads(f.read_text())
            except Exception:
                continue
            ls = rec.get("labels", [])
            if ls:
                songs += 1
                labels += len(ls)
                pos += sum(l["y"] for l in ls)
                current.update(f"{rec['id']}|{l['t']}|{l['y']}" for l in ls)
        # Approved labels from the public page (training/pull_labels.py).
        status_file, shared = DATA / "shared" / "contributors.json", DATA / "shared" / "labels"
        approved = {c for c, st in json.loads(status_file.read_text()).items() if st == "approved"} if status_file.exists() else set()
        n_shared = 0
        for f in shared.glob("*.json") if shared.exists() else []:
            try:
                m = json.loads(f.read_text())
            except Exception:
                continue
            if m["contributor"] in approved:
                n_shared += 1
                current.add(f"shared:{m['contributor']}|{m['song']}|{m['frame']}|{m['y']}")
        # Labels added or changed since the model in use was trained (all of them on the original model).
        trained = DATA / "models" / "trained_labels.json"
        seen = set(json.loads(trained.read_text())) if trained.exists() and (DATA / "models" / "current.json").exists() else set()
        return {"songs": songs, "labels": labels, "positives": pos, "shared": n_shared,
                "new": len(current - seen), "removed": len(seen - current) if seen else 0}

    def train_status(self):
        st = {}
        f = DATA / "models" / "status.json"
        if f.exists():
            try:
                st = json.loads(f.read_text())
            except Exception:
                st = {}
        running = bool(train_proc and train_proc.poll() is None)
        if not running and st.get("state") in ("starting", "loading", "training", "evaluating"):
            st = {"state": "error", "message": "Training stopped unexpectedly. See ~/.cache/cowbell-detector/models/train.log."}
        meta = DATA / "models" / "current_meta.json"
        return {"status": st, "running": running, "custom_model": (DATA / "models" / "current.json").exists(),
                "meta": json.loads(meta.read_text()) if meta.exists() else None,
                "can_train": TRAIN_PY.exists(), **self.label_counts()}

    def send_json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def youtube(self, url):
        if not YT_URL.match(url):
            return self.send_json(400, {"error": "That doesn't look like a YouTube link. Paste a youtube.com or youtu.be URL."})
        m = YT_ID.search(url)
        key = m.group(1) if m else hashlib.sha1(url.encode()).hexdigest()[:16]
        cached_wav, cached_meta = YT_CACHE / f"{key}.wav", YT_CACHE / f"{key}.json"
        if cached_wav.exists() and cached_meta.exists():
            return self.send_wav(cached_wav.read_bytes(), json.loads(cached_meta.read_text())["title"], cached=True)
        with tempfile.TemporaryDirectory() as tmp:
            dl = subprocess.run(
                ["yt-dlp", "--no-playlist", "-f", "bestaudio/best",
                 "--match-filter", f"duration <= {MAX_SECONDS}",
                 "-o", f"{tmp}/audio.%(ext)s", "--print", "after_move:title",
                 "--no-simulate", "--quiet", "--no-warnings", url],
                capture_output=True, text=True, timeout=300,
            )
            files = list(Path(tmp).glob("audio.*"))
            if dl.returncode != 0 or not files:
                msg = (dl.stderr.strip().splitlines() or ["yt-dlp couldn't download that video."])[-1]
                if not files and dl.returncode == 0:
                    msg = f"That video is longer than {MAX_SECONDS // 60} minutes. Try a single song."
                return self.send_json(502, {"error": msg.replace("ERROR: ", "")})
            wav = Path(tmp) / "out.wav"
            conv = subprocess.run(
                ["ffmpeg", "-v", "error", "-i", str(files[0]), "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(wav)],
                capture_output=True, text=True, timeout=300,
            )
            if conv.returncode != 0:
                return self.send_json(500, {"error": "ffmpeg couldn't convert the audio."})
            data = wav.read_bytes()
        title = (dl.stdout.strip().splitlines() or ["YouTube audio"])[-1]
        YT_CACHE.mkdir(parents=True, exist_ok=True)
        cached_wav.write_bytes(data)
        cached_meta.write_text(json.dumps({"title": title, "url": url}))
        self.send_wav(data, title, cached=False)

    def send_wav(self, data, title, cached):
        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Title", urllib.parse.quote(title))
        self.send_header("X-Cached", "1" if cached else "0")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


if __name__ == "__main__":
    missing = [t for t in ("yt-dlp", "ffmpeg") if not shutil.which(t)]
    if missing:
        sys.exit(f"Missing {', '.join(missing)}. Install with: brew install {' '.join(missing)}")
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Cowbell Detector running at http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
