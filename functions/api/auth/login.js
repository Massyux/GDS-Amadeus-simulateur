// Cloudflare Pages Function — Mission 23 Étape 1 (connexion étudiant).
//
// POST { email, password } -> { ok: true, user } | { ok: false, error }
//
// Anti-énumération (docs/SECURITE.md §1) : e-mail inconnu et mot de passe
// incorrect renvoient exactement le même message, avec le même délai minimal.
import { verifyPassword } from "../../_lib/passwordHash.js";
import { createSession } from "../../_lib/session.js";
import { checkRateLimit, clientIp } from "../../_lib/rateLimit.js";
import { normalizeEmail } from "../../_lib/validators.js";

const MIN_DELAY_MS = 300;
const INVALID_CREDENTIALS = "Adresse e-mail ou mot de passe incorrect.";

export async function onRequestPost({ request, env }) {
  const start = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password || !env.DB) {
      return jsonResponse({ ok: false, error: INVALID_CREDENTIALS }, start);
    }

    // Réponse neutre obligatoire (docs/SECURITE.md §3) : au-delà du quota, on
    // renvoie EXACTEMENT la même réponse que "identifiants invalides" --
    // jamais un code distinct, qui transformerait la limite elle-même en
    // moyen de savoir qu'on est bloqué plutôt que simplement faux.
    const withinLimit = await checkRateLimit(env.DB, `login:${clientIp(request)}:${email}`);
    if (!withinLimit) {
      return jsonResponse({ ok: false, error: INVALID_CREDENTIALS }, start);
    }

    const user = await env.DB.prepare(
      `SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = ? AND status = 'active'`
    )
      .bind(email)
      .first();

    const valid = user ? await verifyPassword(env, password, user.password_hash) : false;
    if (!valid) {
      return jsonResponse({ ok: false, error: INVALID_CREDENTIALS }, start);
    }

    const session = await createSession(env, request, user.id);

    return jsonResponse(
      {
        ok: true,
        user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name },
      },
      start,
      200,
      session.cookie
    );
  } catch (err) {
    // Journalisé côté serveur seulement -- même motif que register.js
    // (11/10/2026) : un `catch` muet rend une vraie exception indiscernable
    // d'un échec attendu, sans aucune trace pour la retrouver.
    console.error("login.js", err?.stack || err?.message || String(err));
    return jsonResponse({ ok: false, error: "Une erreur est survenue, réessaie." }, start, 500);
  }
}

async function delayTo(start) {
  const elapsed = Date.now() - start;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
}

async function jsonResponse(body, start, status = 200, cookie = null) {
  await delayTo(start);
  const headers = { "content-type": "application/json" };
  if (cookie) headers["set-cookie"] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}

export async function onRequest() {
  return new Response(JSON.stringify({ ok: false }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
