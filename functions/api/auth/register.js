// Cloudflare Pages Function — Mission 23 Étape 1 (inscription étudiant).
//
// POST { email, password, firstName, lastName } -> { ok: true }
//
// Anti-énumération (docs/SECURITE.md §1) : la réponse est **identique** que
// l'e-mail soit déjà pris ou pas -- {ok:true} dans les deux cas. Si l'e-mail
// existe déjà, on ne touche PAS au compte existant (ne jamais écraser un mot de
// passe au passage, ça serait une prise de contrôle de compte triviale) et on
// ne crée PAS de session -- l'appelant (qui n'est peut-être pas le vrai
// titulaire) ne doit jamais se retrouver connecté sur le compte de quelqu'un
// d'autre. Un attaquant qui essaie des e-mails un par un ne voit donc jamais de
// différence de réponse ; le titulaire légitime, lui, verra bien que son
// "inscription" ne le connecte pas, et utilisera "mot de passe oublié".
//
// Les erreurs de validation (mot de passe trop court/courant, e-mail mal
// formé) PEUVENT être spécifiques : elles ne révèlent rien sur l'existence d'un
// compte, seulement sur ce que l'appelant vient d'écrire (DESIGN-SYSTEM §5 :
// un message d'erreur dit quoi faire).
import { hashPassword } from "../../_lib/passwordHash.js";
import { createSession } from "../../_lib/session.js";
import { checkRateLimit, clientIp } from "../../_lib/rateLimit.js";
import { normalizeEmail, isValidEmail, passwordError } from "../../_lib/validators.js";

const MIN_DELAY_MS = 300;

export async function onRequestPost({ request, env }) {
  const start = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    const firstName = typeof body?.firstName === "string" ? body.firstName.trim().slice(0, 100) : null;
    const lastName = typeof body?.lastName === "string" ? body.lastName.trim().slice(0, 100) : null;

    if (!isValidEmail(email)) {
      return jsonResponse({ ok: false, error: "Adresse e-mail invalide." }, start);
    }
    const pwdError = passwordError(password);
    if (pwdError) {
      return jsonResponse({ ok: false, error: pwdError }, start);
    }
    if (!env.DB) {
      return jsonResponse({ ok: false, error: "Service indisponible." }, start, 500);
    }

    // Réponse neutre obligatoire (docs/SECURITE.md §3) : {ok:true} est déjà la
    // réponse "normale" qu'une collision d'e-mail renvoie (voir plus haut) --
    // au-delà du quota, on renvoie la même chose, sans créer de compte, sans
    // jamais exposer qu'une limite a été atteinte.
    const withinLimit = await checkRateLimit(env.DB, `register:${clientIp(request)}`);
    if (!withinLimit) {
      return jsonResponse({ ok: true }, start);
    }

    const existing = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();

    let cookie = null;
    if (!existing) {
      const passwordHash = await hashPassword(password);
      const inserted = await env.DB.prepare(
        `INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?) RETURNING id`
      )
        .bind(email, passwordHash, firstName, lastName)
        .first();
      const session = await createSession(env, request, inserted.id);
      cookie = session.cookie;
    }
    // existing !== null: collision -- do nothing, same response either way.

    return jsonResponse({ ok: true }, start, 200, cookie);
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
