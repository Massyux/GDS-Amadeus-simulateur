// Cloudflare Pages Function — Mission 23 Étape 1 (réinitialisation du mot de
// passe).
//
// POST { token, newPassword } -> { ok: true } | { ok: false, error }
//
// Le jeton (reçu par e-mail -- functions/api/auth/forgot-password.js) est
// spécifique à son destinataire et imprévisible : contrairement à l'existence
// d'un compte, dire "jeton invalide ou expiré" ne révèle rien d'exploitable,
// donc ce message peut être spécifique (pas besoin de la même réponse neutre
// que l'inscription/connexion).
import { sha256Hex } from "../../_lib/hash.js";
import { hashPassword } from "../../_lib/passwordHash.js";
import { destroyAllSessions } from "../../_lib/session.js";
import { passwordError } from "../../_lib/validators.js";

const MIN_DELAY_MS = 300;
const INVALID_OR_EXPIRED = "Ce lien de réinitialisation est invalide ou a expiré.";

export async function onRequestPost({ request, env }) {
  const start = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!token || !env.DB) {
      return jsonResponse({ ok: false, error: INVALID_OR_EXPIRED }, start);
    }

    const pwdError = passwordError(newPassword);
    if (pwdError) {
      return jsonResponse({ ok: false, error: pwdError }, start);
    }

    const tokenHash = await sha256Hex(token);
    const reset = await env.DB.prepare(
      `SELECT id, user_id FROM password_resets
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`
    )
      .bind(tokenHash)
      .first();

    if (!reset) {
      return jsonResponse({ ok: false, error: INVALID_OR_EXPIRED }, start);
    }

    const passwordHash = await hashPassword(newPassword);
    await env.DB.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(passwordHash, reset.user_id)
      .run();
    await env.DB.prepare(`UPDATE password_resets SET used_at = datetime('now') WHERE id = ?`)
      .bind(reset.id)
      .run();
    // No "current session" to spare here (the user isn't logged in during an
    // email-link reset) -- every session falls, same as docs/SECURITE.md §1
    // "invalidé après usage ou changement de mot de passe" + §2.
    await destroyAllSessions(env, reset.user_id);

    return jsonResponse({ ok: true }, start);
  } catch {
    return jsonResponse({ ok: false, error: "Une erreur est survenue, réessaie." }, start, 500);
  }
}

async function delayTo(start) {
  const elapsed = Date.now() - start;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
}

async function jsonResponse(body, start, status = 200) {
  await delayTo(start);
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequest() {
  return new Response(JSON.stringify({ ok: false }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
