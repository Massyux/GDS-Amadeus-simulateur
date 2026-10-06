// Cloudflare Pages Function — Mission 23 Étape 1 (déconnexion étudiant).
//
// POST (en-tête X-CSRF-Token requis -- docs/SECURITE.md §3, c'est la première
// route authentifiée par cookie qui modifie l'état) -> { ok: true } toujours,
// même sans session active (idempotent : se déconnecter d'un compte où on
// n'était déjà plus connecté n'est pas une erreur).
import { getSession, destroySession, clearSessionCookie } from "../../_lib/session.js";
import { verifyCsrfToken } from "../../_lib/csrf.js";

export async function onRequestPost({ request, env }) {
  const session = await getSession(env, request);

  if (session) {
    const csrfHeader = request.headers.get("X-CSRF-Token");
    if (!(await verifyCsrfToken(env, session.sessionId, csrfHeader))) {
      return new Response(JSON.stringify({ ok: false, error: "CSRF_INVALID" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    await destroySession(env, session.sessionId);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": clearSessionCookie(request),
    },
  });
}

export async function onRequest() {
  return new Response(JSON.stringify({ ok: false }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
