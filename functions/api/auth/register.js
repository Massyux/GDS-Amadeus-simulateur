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
const GENERIC_ERROR = "Une erreur est survenue, réessaie.";

// Quota d'inscription délibérément plus permissif que celui de login.js
// (5/15min/IP+compte) : cette route n'a pas un compte précis à protéger, et
// son public inclut des points d'accès partagés (NAT opérateur, courant en
// Algérie) où plusieurs personnes distinctes épuiseraient en quelques
// inscriptions un quota pensé pour une seule personne qui se trompe. Reste
// borné par IP (bug du 11/10/2026 : ce n'est PAS une suppression de la
// limite, juste une valeur adaptée à cette route précise).
const REGISTER_MAX_ATTEMPTS = 15;

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

    // 🔴 Bug critique en production (11/10/2026) : cette branche renvoyait
    // {ok:true} au-delà du quota, comme si l'inscription avait réussi. Le
    // front (AuthScreen.jsx) appelle /me juste après, ne trouve personne, et
    // bascule en silence vers "connexion" -- la personne retape alors son
    // mot de passe sur un compte qui n'a jamais existé et reçoit "identifiants
    // incorrects". docs/SECURITE.md §3 et rateLimit.js l.61-69 exigent une
    // réponse "neutre", ce qui veut dire indiscernable d'un ÉCHEC générique --
    // jamais déguisée en succès. La forme ci-dessous est exactement celle du
    // bloc catch plus bas (même message, même statut, même délai minimal) :
    // un dépassement de quota doit être invisible, pas inventer un mensonge.
    const withinLimit = await checkRateLimit(env.DB, `register:${clientIp(request)}`, {
      max: REGISTER_MAX_ATTEMPTS,
    });
    if (!withinLimit) {
      return jsonResponse({ ok: false, error: GENERIC_ERROR }, start, 500);
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
  } catch (err) {
    console.error("DIAGNOSTIC register.js", err?.stack || err?.message || String(err));
    return jsonResponse({ ok: false, error: GENERIC_ERROR }, start, 500);
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
