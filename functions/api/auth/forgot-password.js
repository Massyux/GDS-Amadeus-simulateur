// Cloudflare Pages Function — Mission 23 Étape 1 (mot de passe oublié).
//
// POST { email, lang? } -> { ok: true } TOUJOURS, que le compte existe ou non
// (docs/SECURITE.md §1, anti-énumération).
//
// `lang` ("fr" | "en", défaut "fr") choisit seulement la langue du message
// envoyé -- ajouté le 25/10/2026 (PROMPT-MOTS-DE-PASSE-ET-MAIL.md, chantier 2)
// parce que la préférence de langue n'est stockée nulle part côté compte
// (apps/web/src/i18n/useLang.js ne vit que dans le navigateur) : le seul
// signal disponible est celui de l'écran depuis lequel la demande part
// (AuthScreen.jsx, qui connaît déjà `lang`). Aucun impact sur le reste du
// circuit (jeton, expiration, anti-énumération) : ce paramètre ne choisit
// qu'un texte, jamais un comportement.
//
// L'envoi réel passe par functions/_lib/mailer.js (Brevo depuis le 25/10/2026)
// -- seul ce fichier change pour ça. Le jeton brut n'est jamais renvoyé dans
// une réponse normale ; il n'est exposé que si `env.MAIL_DEV_ECHO === "1"`
// (jamais vrai en production), uniquement pour tester ce flux de bout en bout
// sans vrai e-mail.
import { sha256Hex } from "../../_lib/hash.js";
import { checkRateLimit, clientIp } from "../../_lib/rateLimit.js";
import { normalizeEmail } from "../../_lib/validators.js";
import { sendMail, devEchoEnabled } from "../../_lib/mailer.js";

const MIN_DELAY_MS = 300;
const RESET_TOKEN_BYTES = 32;
const RESET_TTL_MINUTES = 30;
// Domaine canonique fixe (CLAUDE.md), jamais dérivé de l'en-tête Host de la
// requête : un lien de réinitialisation de mot de passe construit à partir
// d'un Host falsifiable pointerait, pour un attaquant qui le falsifie, vers
// un domaine de son choix ("reset-link poisoning", motif connu) -- la seule
// défense fiable est de ne jamais le lire depuis la requête.
const RESET_LINK_BASE = "https://orionisacademy.com/app/reinitialiser";

// Rédigé simplement, en français courant, sans jargon (demande explicite) :
// qui écrit, pourquoi, le lien, sa durée de validité, quoi faire si on n'a
// rien demandé, signature. apps/web/src/i18n/dictionary.js n'est pas importé
// ici : c'est une ressource du bundle navigateur (Vite), jamais importée
// depuis functions/ dans ce projet (même raison que functions/_lib/
// certificate.js, qui porte son propre petit TEXTS fr/en plutôt que
// d'importer le dictionnaire front).
const TEXTS = {
  fr: {
    subject: "Réinitialise ton mot de passe — Orionis Academy",
    body: (link, minutes) =>
      `Bonjour,\n\n` +
      `Tu as demandé à réinitialiser le mot de passe de ton compte Orionis Academy.\n\n` +
      `Clique sur ce lien pour choisir un nouveau mot de passe :\n${link}\n\n` +
      `Ce lien est valable ${minutes} minutes. Passé ce délai, il faudra en redemander un.\n\n` +
      `Si tu n'es pas à l'origine de cette demande, ignore simplement ce message : ton mot de passe reste inchangé.\n\n` +
      `Orionis Academy — Formation aux métiers du voyage`,
  },
  en: {
    subject: "Reset your password — Orionis Academy",
    body: (link, minutes) =>
      `Hello,\n\n` +
      `You asked to reset the password for your Orionis Academy account.\n\n` +
      `Click this link to choose a new password:\n${link}\n\n` +
      `This link is valid for ${minutes} minutes. After that, you'll need to request a new one.\n\n` +
      `If you didn't request this, just ignore this message: your password stays unchanged.\n\n` +
      `Orionis Academy — Formation aux métiers du voyage`,
  },
};

function randomTokenHex() {
  const bytes = crypto.getRandomValues(new Uint8Array(RESET_TOKEN_BYTES));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  const start = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const lang = body?.lang === "en" ? "en" : "fr";

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

      const link = `${RESET_LINK_BASE}?token=${rawToken}`;
      const texts = TEXTS[lang];
      await sendMail(env, {
        to: email,
        subject: texts.subject,
        text: texts.body(link, RESET_TTL_MINUTES),
      });

      if (devEchoEnabled(env)) devResetToken = rawToken;
    }

    return jsonResponse(devResetToken ? { ok: true, devResetToken } : { ok: true }, start);
  } catch (err) {
    // Journalisé côté serveur seulement -- même motif que register.js
    // (11/10/2026) : {ok:true} reste la bonne réponse ici (anti-énumération,
    // voir l'en-tête), mais un `catch` muet masquerait une vraie panne
    // aussi efficacement qu'il masquait le plafond PBKDF2. sendMail
    // n'atteint jamais ce bloc pour un simple échec d'envoi (il journalise
    // et revient normalement, voir functions/_lib/mailer.js) -- seule une
    // vraie exception ailleurs dans cette route (DB, etc.) finit ici.
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
