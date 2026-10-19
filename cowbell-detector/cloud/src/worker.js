// Collects cowbell / not-cowbell labels from the public page and hands them to the trainer.
//   POST /label    public, from allowed origins: one label change (with a spectrogram window on first set)
//   GET  /stats    public: how many labels and contributors so far
//   GET  /export   ADMIN_TOKEN only: changes since a cursor, for training/pull_labels.py
//   GET  /ping     health check

const MAX_BODY = 200_000;
const NM = 64;               // mel bands, must match the page
const MAX_FRAMES = 800;      // longest spectrogram window accepted
const SONG_ID = /^[A-Za-z0-9_-]{1,64}$/;
const CONTRIB_ID = /^[A-Za-z0-9-]{8,64}$/;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || '*'),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === '/ping') return json({ ok: true });
      if (url.pathname === '/stats' && req.method === 'GET') {
        const r = await env.DB.prepare('SELECT COUNT(*) AS labels, COUNT(DISTINCT contributor) AS contributors FROM labels WHERE y IS NOT NULL').first();
        return json(r);
      }
      if (url.pathname === '/label' && req.method === 'POST') return await submit(req, env, allowed, origin, json);
      if (url.pathname === '/export' && req.method === 'GET') return await exportRows(req, env, url, json);
      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: 'Server error' }, 500);
    }
  },
};

async function submit(req, env, allowed, origin, json) {
  if (allowed.length && !allowed.includes(origin)) return json({ error: 'This site is not allowed to send labels.' }, 403);
  const text = await req.text();
  if (text.length > MAX_BODY) return json({ error: 'Label too large.' }, 413);
  let b;
  try { b = JSON.parse(text); } catch { return json({ error: 'Bad JSON.' }, 400); }

  const { contributor, song, frame, y } = b;
  const title = typeof b.title === 'string' ? b.title.slice(0, 200) : '';
  if (!CONTRIB_ID.test(contributor || '') || !SONG_ID.test(song || '')) return json({ error: 'Bad ids.' }, 400);
  if (!Number.isInteger(frame) || frame < 0 || frame > 60000) return json({ error: 'Bad time.' }, 400);
  if (!(y === 0 || y === 1 || y === null)) return json({ error: 'Bad label.' }, 400);

  const ip = await sha256((req.headers.get('CF-Connecting-IP') || 'unknown') + (env.IP_SALT || ''));
  const now = Date.now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM labels WHERE ip = ? AND updated > ?').bind(ip, now - 3600_000).first();
  if (recent.n >= Number(env.HOURLY_LIMIT || 400)) return json({ error: 'Too many labels this hour. Try again later.' }, 429);

  if (y === null) {
    await env.DB.prepare('UPDATE labels SET y = NULL, patch = NULL, updated = ? WHERE contributor = ? AND song = ? AND frame = ?')
      .bind(now, contributor, song, frame).run();
    return json({ ok: true });
  }

  // The spectrogram window around the hit is required the first time a hit is labeled.
  let patch = null, start = 0, frames = 0;
  if (b.patch != null) {
    start = b.start; frames = b.frames;
    if (!Number.isInteger(start) || !Number.isInteger(frames) || start < 0 || frames < 1 || frames > MAX_FRAMES) return json({ error: 'Bad window.' }, 400);
    if (frame < start || frame >= start + frames) return json({ error: 'Hit outside window.' }, 400);
    let bytes;
    try { bytes = Uint8Array.from(atob(b.patch), c => c.charCodeAt(0)); } catch { return json({ error: 'Bad spectrogram.' }, 400); }
    if (bytes.length !== frames * NM * 2) return json({ error: 'Spectrogram size mismatch.' }, 400);
    patch = bytes;
  }
  const existing = await env.DB.prepare('SELECT id FROM labels WHERE contributor = ? AND song = ? AND frame = ? AND patch IS NOT NULL')
    .bind(contributor, song, frame).first();
  if (!patch && !existing) return json({ error: 'Spectrogram missing.' }, 400);

  if (patch) {
    await env.DB.prepare(`INSERT INTO labels (updated, contributor, song, title, frame, y, start, frames, patch, ip)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (contributor, song, frame) DO UPDATE SET
          updated = excluded.updated, title = excluded.title, y = excluded.y,
          start = excluded.start, frames = excluded.frames, patch = excluded.patch, ip = excluded.ip`)
      .bind(now, contributor, song, title, frame, y, start, frames, patch, ip).run();
  } else {
    await env.DB.prepare('UPDATE labels SET y = ?, updated = ?, ip = ? WHERE id = ?').bind(y, now, ip, existing.id).run();
  }
  return json({ ok: true });
}

async function exportRows(req, env, url, json) {
  const auth = req.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: 'Unauthorized' }, 401);
  const since = Number(url.searchParams.get('since') || 0), sinceId = Number(url.searchParams.get('since_id') || 0);
  const { results } = await env.DB.prepare(`SELECT id, updated, contributor, song, title, frame, y, start, frames, patch
      FROM labels WHERE updated > ? OR (updated = ? AND id > ?) ORDER BY updated, id LIMIT 100`)
    .bind(since, since, sinceId).all();
  const rows = results.map(r => {
    let patch = null;
    if (r.patch) {
      const u8 = r.patch instanceof ArrayBuffer ? new Uint8Array(r.patch) : Uint8Array.from(r.patch);
      let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      patch = btoa(s);
    }
    return { ...r, patch };
  });
  const last = rows[rows.length - 1];
  return json({ rows, next: last ? { since: last.updated, since_id: last.id } : { since, since_id: sinceId }, more: rows.length === 100 });
}

async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
