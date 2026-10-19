-- Labels contributed from the public Cowbell Detector page.
-- One row per (contributor, song, hit). A withdrawn label keeps its row with y = NULL so exports can delete it.
CREATE TABLE IF NOT EXISTS labels (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  updated     INTEGER NOT NULL,   -- ms since epoch of the last change
  contributor TEXT NOT NULL,      -- random id kept in the visitor's browser
  song        TEXT NOT NULL,      -- spectrogram hash computed by the page
  title       TEXT,
  frame       INTEGER NOT NULL,   -- 10 ms frame of the hit
  y           INTEGER,            -- 1 = cowbell, 0 = not cowbell, NULL = withdrawn
  start       INTEGER NOT NULL,   -- first frame of the stored spectrogram window
  frames      INTEGER NOT NULL,   -- window length in frames
  patch       BLOB,               -- int16 (log10 mel x 1000), frames x 64, little-endian
  ip          TEXT NOT NULL,      -- salted hash of the sender's IP, only for rate limiting
  UNIQUE (contributor, song, frame)
);
CREATE INDEX IF NOT EXISTS labels_updated ON labels (updated, id);
CREATE INDEX IF NOT EXISTS labels_ip ON labels (ip, updated);
