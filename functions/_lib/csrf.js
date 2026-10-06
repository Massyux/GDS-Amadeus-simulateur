// Protection CSRF (docs/SECURITE.md §3) -- nécessaire parce que les sessions
// étudiant (functions/_lib/session.js) vivent dans un cookie envoyé
// automatiquement par le navigateur. `/api/admin/*` n'a pas ce problème (jeton
// porté manuellement dans un en-tête Authorization, jamais ambiant) -- seules les
// routes authentifiées par cookie qui modifient l'état en ont besoin.
//
// Motif "double soumission dérivée" : le jeton CSRF est un HMAC(sessionId,
// SESSION_SECRET), exposé au client UNIQUEMENT dans le corps JSON de
// /api/auth/me (jamais dans un cookie lisible par un tiers) ; le client doit le
// renvoyer dans l'en-tête `X-CSRF-Token` sur toute requête qui modifie l'état.
// Un site attaquant peut faire partir une requête cross-site (c'est tout
// l'intérêt de CSRF), mais ne peut pas lire la réponse JSON d'un autre
// domaine pour y trouver le jeton à renvoyer. Pas de secret supplémentaire à
// faire configurer à Massy : réutilise SESSION_SECRET.
import { constantTimeEqual } from "./hash.js";

async function hmacHex(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function csrfTokenForSession(env, sessionId) {
  return hmacHex(sessionId, env.SESSION_SECRET || "");
}

export async function verifyCsrfToken(env, sessionId, candidate) {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  const expected = await csrfTokenForSession(env, sessionId);
  return constantTimeEqual(candidate, expected);
}
