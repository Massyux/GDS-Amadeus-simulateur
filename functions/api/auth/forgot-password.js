// Cloudflare Pages Function — Mission 23 Étape 1 (mot de passe oublié).
//
// POST { email } -> { ok: true } TOUJOURS, que le compte existe ou non
// (docs/SECURITE.md §1, anti-énumération).
//
// Aucun service d'e-mail n'existe encore (MISSION-22) -- voir
// functions/_lib/mailer.js. Le jeton brut n'est jamais renvoyé dans une réponse
// normale (ce serait une prise de contrôle de compte triviale : n'importe qui
// pourrait réinitialiser le mot de passe de n'importe quel e-mail). Il n'est
// exposé que si `env.MAIL_DEV_ECHO === "1"` (jamais vrai en production),
// uniquement pour pouvoir tester ce flux de bout en bout sans vrai e-mail.
import { sha256Hex } from "../../_lib/hash.js";
import { checkRateLimit, clientIp } from "../../_lib/rateLimit.js";
import { normalizeEmail } from "../../_lib/validators.js";
import { sendMail, devEchoEnabled } from "../../_lib/mailer.js";

const MIN_DELAY_MS = 300;
const RESET_TOKEN_BYTES = 32;
const RESET_TTL_MINUTES = 30;

function randomTokenHex() {
  const bytes = crypto.getRandomValues(new Uint8Array(RESET_TOKEN_BYTES));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  const start = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);

    if (!email || !env.DB) {
      return jsonResponse({ ok: true }, start);
    }

    // Réponse neutre obligatoire (docs/SECURITE.md §3) : {ok:true} est déjà la
    // réponse "normale" (voir plus bas, que l'e-mail existe ou non) -- au-delà
    // du quota, même chose, sans générer de jeton.
    const withinLimit = await checkRateLimit(env.DB, `forgot:${clientIp(request)}:${email}`);
    if (!withinLimit) {
      return jsonResponse({ ok: true }, start);
    }

    const user = await env.DB.prepare(`SELECT id FROM users WHERE email = ? AND status = 'active'`)
      .bind(email)
      .first();

    let devResetToken;
    if (user) {
      const rawToken = randomTokenHex();
      const tokenHash = await sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000).toISOString();

      await env.DB.prepare(
        `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)`
      )
        .bind(user.id, tokenHash, expiresAt)
        .run();

      await sendMail({
        to: email,
        subject: "Réinitialise ton mot de passe",
        text: `Jeton de réinitialisation (valable ${RESET_TTL_MINUTES} min) : ${rawToken}`,
      });

      if (devEchoEnabled(env)) devResetToken = rawToken;
    }

    return jsonResponse(devResetToken ? { ok: true, devResetToken } : { ok: true }, start);
  } catch (err) {
    // Journalisé côté serveur seulement -- même motif que register.js
    // (11/10/2026) : {ok:true} reste la bonne réponse ici (anti-énumération,
    // voir l'en-tête), mais un `catch` muet masquerait une vraie panne
    // (ex. sendMail) aussi efficacement qu'il masquait le plafond PBKDF2.
    console.error("forgot-password.js", err?.stack || err?.message || String(err));
    return jsonResponse({ ok: true }, start);
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
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
