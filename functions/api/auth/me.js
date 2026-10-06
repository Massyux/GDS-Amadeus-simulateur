// Cloudflare Pages Function — Mission 23 Étape 1 (session courante).
//
// GET -> { user: null } si pas connecté, { user: {...}, csrfToken } sinon.
// Le jeton CSRF (docs/SECURITE.md §3) n'est exposé qu'ici, jamais dans un
// cookie -- voir functions/_lib/csrf.js. GET ne modifiant pas l'état, pas
// besoin de vérifier le CSRF pour lire sa propre session.
import { getSession } from "../../_lib/session.js";
import { csrfTokenForSession } from "../../_lib/csrf.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(env, request);

  if (!session) {
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const csrfToken = await csrfTokenForSession(env, session.sessionId);

  return new Response(JSON.stringify({ user: session.user, csrfToken }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequest() {
  return new Response(JSON.stringify({ user: null }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
