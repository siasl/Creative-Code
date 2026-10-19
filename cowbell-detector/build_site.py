#!/usr/bin/env python3
"""Build the public GitHub Pages site, and optionally publish it.

  python3 build_site.py          build into ~/.cache/cowbell-detector/site
  python3 build_site.py --push   build, commit and push to the site repo

The site is index.html wrapped in a full HTML document, with the label collector's URL
(share.json "api") baked in, plus your current retrained model as model.json if you have one.
share.json "site_repo" is the GitHub repo that serves the site (e.g. https://github.com/you/cowbell-detector.git).
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = Path(os.path.expanduser(os.environ.get("COWBELL_DATA", "~/.cache/cowbell-detector")))
SITE = DATA / "site"


def main():
    cfg = json.loads((DATA / "share.json").read_text()) if (DATA / "share.json").exists() else {}
    api = cfg.get("api", "")
    SITE.mkdir(parents=True, exist_ok=True)
    head = ('<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + (f'<meta name="cowbell-share-api" content="{api}">\n' if api else '')
            + '<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n')
    (SITE / "index.html").write_text(head + (ROOT / "index.html").read_text(encoding="utf-8"), encoding="utf-8")
    model = DATA / "models" / "current.json"
    if model.exists():
        shutil.copy(model, SITE / "model.json")
    elif (SITE / "model.json").exists():
        (SITE / "model.json").unlink()
    (SITE / ".nojekyll").write_text("")
    print(f"Built {SITE}: collector {'at ' + api if api else 'not configured (labels stay local)'}, "
          f"{'your retrained model' if model.exists() else 'the original model'}.")

    if "--push" in sys.argv:
        repo = cfg.get("site_repo")
        if not repo:
            sys.exit('Add "site_repo" to share.json first.')
        git = lambda *a: subprocess.run(["git", "-C", str(SITE), *a], check=True)
        if not (SITE / ".git").exists():
            git("init", "-b", "main")
            git("remote", "add", "origin", repo)
        git("add", "-A")
        if subprocess.run(["git", "-C", str(SITE), "diff", "--cached", "--quiet"]).returncode == 0:
            print("Nothing changed since the last publish.")
            return
        git("commit", "-m", "Update Cowbell Detector")
        git("push", "-u", "origin", "main")
        print("Pushed. GitHub Pages updates within a minute or two.")


if __name__ == "__main__":
    main()
