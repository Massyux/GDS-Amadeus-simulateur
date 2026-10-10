// Session étudiant -- docs/SECURITE.md §2 : "Jeton de session signé (HMAC, clé en
// variable d'environnement) transporté par un cookie HttpOnly + Secure +
// SameSite=Strict, jamais dans localStorage". Durée 7 jours, prolongée à l'usage ;
// déconnexion = invalidation côté serveur.
//
// Le jeton est signé (functions/_lib/token.js, même mécanisme que l'admin) ET
// vérifié contre la table `sessions` (migrations/0002) à chaque requête -- la
// signature prouve que le serveur l'a émis, la ligne en base prouve qu'il est
// *encore* valide maintenant (ex. pas déconnecté ailleurs). C'est ce qui permet
// une révocation par appareil : fermer une seule session (logout) sans toucher
// aux autres, contrairement au jeton admin (un seul admin, rotation globale
// suffit -- voir functions/api/admin/login.js). `env.SESSION_SECRET` est un
// secret dédié, distinct de `ADMIN_SECRET_HASH` : les deux populations (un seul
// admin vs des milliers d'étudiants) ne doivent pas partager un rayon de
// rotation.
import { signToken, verifyToken } from "./token.js";
import { requireSecret } from "./requiredEnv.js";

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function randomSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// `wrangler pages dev` serves http://localhost in local dev/CI; real Cloudflare
// Pages always serves https. `Secure` cookies are silently dropped by the
// browser over http, which would break every local/CI test -- detect instead of
// requiring a separate "am I local" env var.
function isHttps(request) {
  return new URL(request.url).protocol === "https:";
}

function cookieAttributes(request, maxAgeSeconds) {
  const parts = ["Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAgeSeconds}`];
  if (isHttps(request)) parts.push("Secure");
  return parts.join("; ");
}

export async function createSession(env, request, userId) {
  // Vérifié avant toute écriture D1 : échouer avant d'avoir créé une ligne
  // de session qu'on ne pourrait pas signer correctement.
  const secret = requireSecret(env, "SESSION_SECRET");

  const sessionId = randomSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await env.DB.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`)
    .bind(sessionId, userId, expiresAt)
    .run();

  const token = await signToken({ sid: sessionId, uid: userId }, secret);
  const cookie = `${COOKIE_NAME}=${token}; ${cookieAttributes(request, SESSION_DURATION_MS / 1000)}`;
  return { sessionId, cookie };
}

function readCookieValue(request) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return rest.join("=");
  }
  return null;
}

/**
 * Returns `{ sessionId, user }` for a valid, non-expired, non-revoked session,
 * or `null`. Also slides the session's expiry forward (docs/SECURITE.md §2:
 * "prolongée à l'usage") -- every validated request extends the 7-day window.
 */
export async function getSession(env, request) {
  const raw = readCookieValue(request);
  if (!raw) return null;

  const payload = await verifyToken(raw, requireSecret(env, "SESSION_SECRET"));
  if (!payload || typeof payload.sid !== "string" || typeof payload.uid !== "number") return null;

  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, u.id AS user_id, u.email, u.first_name, u.last_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.user_id = ? AND s.expires_at > datetime('now') AND u.status = 'active'`
  )
    .bind(payload.sid, payload.uid)
    .first();

  if (!row) return null;

  const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await env.DB.prepare(`UPDATE sessions SET last_seen_at = datetime('now'), expires_at = ? WHERE id = ?`)
    .bind(newExpiresAt, row.session_id)
    .run();

  return {
    sessionId: row.session_id,
    user: {
      id: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
    },
  };
}

export async function destroySession(env, sessionId) {
  await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
}

// docs/SECURITE.md §2: "Changement de mot de passe = toutes les autres sessions
// tombent" -- the current one (the device making the change) is kept.
export async function destroyOtherSessions(env, userId, keepSessionId) {
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ? AND id != ?`)
    .bind(userId, keepSessionId)
    .run();
}

// Password-reset-by-email has no "current session" to keep -- everything falls.
export async function destroyAllSessions(env, userId) {
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run();
}

export function clearSessionCookie(request) {
  return `${COOKIE_NAME}=; ${cookieAttributes(request, 0)}`;
}
