// Garde partagée pour les routes étudiant authentifiées par cookie (Mission 23
// Étape 2) -- même esprit que functions/_lib/adminAuth.js (réponse neutre en
// cas d'échec), mais la source de vérité est functions/_lib/session.js (cookie
// + table `sessions`), pas un jeton Bearer.
import { getSession } from "./session.js";
import { verifyCsrfToken } from "./csrf.js";

export async function requireSession(request, env) {
  return getSession(env, request);
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

// Pour toute route authentifiée par cookie qui modifie l'état
// (docs/SECURITE.md §3). `session` doit déjà avoir été obtenu via
// requireSession -- cette fonction ne relit pas la session, elle vérifie
// juste l'en-tête contre l'id de session déjà connu.
export async function requireCsrf(request, env, session) {
  const header = request.headers.get("X-CSRF-Token");
  return verifyCsrfToken(env, session.sessionId, header);
}

export function csrfInvalidResponse() {
  return new Response(JSON.stringify({ error: "CSRF_INVALID" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}
