// Shared admin-session guard (Mission 14). Every /api/admin/* handler
// calls requireAdmin(request, env) first; a null return means "respond
// with a neutral 401", never leaking whether the token was missing,
// malformed, expired, or well-formed-but-wrong-role.
import { verifyToken } from "./token.js";
import { requireSecret } from "./requiredEnv.js";

export async function requireAdmin(request, env) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return null;

  // Même motif que SESSION_SECRET (voir requiredEnv.js) : un ADMIN_SECRET_HASH
  // absent ne doit jamais retomber sur la chaîne vide comme clé HMAC (un
  // jeton forgé avec cette même clé vide serait alors accepté).
  const payload = await verifyToken(match[1], requireSecret(env, "ADMIN_SECRET_HASH"));
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
