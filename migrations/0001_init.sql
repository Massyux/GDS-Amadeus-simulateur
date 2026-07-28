-- Mission 14 — espace admin + licences par poste (Cloudflare D1).
--
-- IF NOT EXISTS added after the fact (Etape 3): this file is re-applied by
-- the Playwright webServer commands before every local/CI e2e run against
-- the same persisted local D1, so it must be safely re-runnable. Already
-- applied once in production by hand (D1 console) before this change --
-- re-running it there is harmless too, since CREATE ... IF NOT EXISTS is a
-- no-op when the schema already matches.
--
-- "RLS" from the original Supabase-era spec has no direct D1 equivalent
-- (D1 is plain SQLite, no row-level security engine) -- its protective
-- intent is preserved differently here: the DB is only ever reachable
-- through the "DB" binding inside Cloudflare Pages Functions (server-side),
-- never exposed to any client SDK, so there is no direct-access surface to
-- restrict in the first place.

CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('individual', 'school')),
  max_devices INTEGER NOT NULL CHECK (max_devices >= 1),
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per device that has successfully activated a license. The
-- (license_id, device_fingerprint) uniqueness is what makes re-activation
-- from the same device idempotent (same slot, not a new one) and is the
-- only place "how many devices used" is computed from (COUNT(*) per
-- license_id) -- no separate counter column to keep in sync.
--
-- `token` is an opaque random bearer value (not a signed/JWT-style token):
-- /api/license/check looks it up directly, so revoking access is always a
-- single DB fact (delete the row, or flip the license's status) rather than
-- something that also has to reason about signature/expiry independently.
CREATE TABLE IF NOT EXISTS activations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_id INTEGER NOT NULL REFERENCES licenses(id),
  device_fingerprint TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (license_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_activations_token ON activations(token);

CREATE INDEX IF NOT EXISTS idx_activations_license ON activations(license_id);
