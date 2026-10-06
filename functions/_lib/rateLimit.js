// docs/SECURITE.md §3 : limitation de débit obligatoire sur connexion (5 essais /
// 15 min / IP + compte), inscription, mot de passe oublié, activation de licence.
// Compteur D1 générique (table rate_limit_attempts, migrations/0002) plutôt qu'un
// nouveau binding Cloudflare (KV / Rate Limiting API) -- CONSTITUTION §8, une seule
// plateforme à administrer.
//
// `bucketKey` encode la route ET la clé de limitation (ex. "login:<ip>:<email>"),
// jamais juste l'IP seule ou le compte seul, pour matcher exactement la règle
// "IP + compte" du document.

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MINUTES = 15;
// Les lignes plus vieilles que ça ne servent plus à rien pour aucune fenêtre
// actuelle (la plus longue utilisée dans ce projet est 15 min) -- purge
// opportuniste à chaque appel, pas de cron (CONSTITUTION §8).
const PRUNE_OLDER_THAN_MINUTES = 60;

/**
 * @param {import("@cloudflare/workers-types").D1Database} db
 * @param {string} bucketKey
 * @param {{ max?: number, windowMinutes?: number }} [options]
 * @returns {Promise<boolean>} true if the caller is within limits (and this
 *   attempt has been recorded), false if they are over the limit (recorded
 *   anyway -- repeated knocking doesn't get a free pass once blocked).
 */
export async function checkRateLimit(db, bucketKey, options = {}) {
  const max = options.max ?? DEFAULT_MAX_ATTEMPTS;
  const windowMinutes = options.windowMinutes ?? DEFAULT_WINDOW_MINUTES;

  await db
    .prepare(
      `DELETE FROM rate_limit_attempts WHERE created_at < datetime('now', ?)`
    )
    .bind(`-${PRUNE_OLDER_THAN_MINUTES} minutes`)
    .run();

  const { count } = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM rate_limit_attempts
       WHERE bucket_key = ? AND created_at > datetime('now', ?)`
    )
    .bind(bucketKey, `-${windowMinutes} minutes`)
    .first();

  await db
    .prepare(`INSERT INTO rate_limit_attempts (bucket_key) VALUES (?)`)
    .bind(bucketKey)
    .run();

  return count < max;
}

// CF-Connecting-IP is set by Cloudflare's edge in production; local `wrangler
// pages dev` and tests don't have a real edge in front of them, so this falls
// back to a constant -- acceptable since there is no real multi-client traffic
// to distinguish locally anyway.
export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "local";
}

// Deliberately no dedicated "429 / RATE_LIMITED" response helper: §3 says the
// reply must be "neutre" -- indistinguishable from a normal failure, same
// status, same shape, same constant delay. A caller over the limit must
// return the exact same failure response it already returns for "wrong
// password" / "unknown key" / etc., never a different one -- otherwise the
// rate limit itself becomes an oracle (an attacker who suddenly gets a
// different response learns they've been throttled, which leaks information
// a neutral response is supposed to hide).
