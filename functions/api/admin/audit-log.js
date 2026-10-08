// Cloudflare Pages Function — Mission 23 Étape 4 (back-office formations).
// docs/SECURITE.md §7 : journal d'audit consultable dans /admin.
//
// GET -> { entries: [{ id, actor, action, target, details, createdAt }] }
// Les 200 plus récentes -- pas de pagination : un seul admin, un volume
// d'actions qui reste modeste, pas de besoin réel constaté pour plus.
import { requireAdmin, unauthorizedResponse } from "../../_lib/adminAuth.js";

export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ entries: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, actor, action, target, details, created_at FROM audit_log ORDER BY id DESC LIMIT 200`
  ).all();

  return new Response(
    JSON.stringify({
      entries: results.map((row) => ({
        id: row.id,
        actor: row.actor,
        action: row.action,
        target: row.target,
        details: safeParse(row.details),
        createdAt: row.created_at,
      })),
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

function safeParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function onRequest() {
  return unauthorizedResponse();
}
