# Label collector (Cloudflare Worker)

The public GitHub Pages site sends each 👍 / 👎 here: the hit's time plus about 6 seconds of
spectrogram around it (never audio). Your Mac downloads them with `training/pull_labels.py`,
you approve contributors, and retraining happens locally as before.

Free tier only: a Worker plus a D1 database (no R2, no payment method needed).

## One-time setup

Run from this `cloud/` folder. Wrangler needs Node 18+ (`nvm use 20`).

1. Sign in to Cloudflare (opens your browser):

       npx wrangler login

2. Create the database, then paste the `database_id` it prints into `wrangler.toml`:

       npx wrangler d1 create cowbell-labels

3. Create the table:

       npx wrangler d1 execute cowbell-labels --remote --file schema.sql

4. Set the two secrets. The admin token is already generated in `~/.cache/cowbell-detector/share.json`:

       python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.cache/cowbell-detector/share.json')))['token'])" | npx wrangler secret put ADMIN_TOKEN
       openssl rand -hex 16 | npx wrangler secret put IP_SALT

5. Deploy, and note the URL it prints (`https://cowbell-labels.<your-subdomain>.workers.dev`):

       npx wrangler deploy

6. Put that URL in `~/.cache/cowbell-detector/share.json` as `"api"`.

`ALLOWED_ORIGINS` in `wrangler.toml` already allows `https://siasl.github.io` (GitHub Pages)
and `http://localhost:8809` (local testing). Change it if the site lives elsewhere.

## The site

From the `cowbell-detector/` folder:

    python3 build_site.py --push

builds the page with the collector URL and your current retrained model, and pushes it to
`site_repo` in `share.json`. Turn on GitHub Pages for that repo once (Settings → Pages → main branch).

## Routine

    python3 training/pull_labels.py            # download new labels, list contributors
    python3 training/pull_labels.py show ID    # what someone labeled
    python3 training/pull_labels.py approve ID # or: block ID

Then retrain from the local app (`python3 server.py`, Teach the model → Retrain), and publish
the new model with `python3 build_site.py --push`.

## Limits

- Each sender (by hashed IP) can send `HOURLY_LIMIT` label changes per hour (400 by default).
- Each label is at most ~110 KB. D1's free 5 GB holds roughly 60,000 labels.
- `/export` needs the admin token. Nothing contributed is used until you approve its contributor.
