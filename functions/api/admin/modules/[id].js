// Cloudflare Pages Function — Mission 23 Étape 4 (back-office formations).
//
// PATCH { title?, sortOrder? } -> { ok: true }
// DELETE -> { ok: true }  -- supprime aussi ses leçons (pas de ON DELETE
//   CASCADE déclaré dans migrations/0002 : fait manuellement, dans l'ordre
//   leçons puis module, pour ne jamais laisser de leçons orphelines).
//   Un module n'a pas de statut publié/brouillon propre (c'est le cours qui
//   porte ça) -- restructurer un cours encore en brouillon est une édition
//   normale, pas l'action destructive que docs/SECURITE.md §7 vise
//   ("dépublier plutôt que supprimer" concerne le cours lui-même, déjà
//   appliqué dans courses/[id].js, qui n'a pas de DELETE du tout).
import { requireAdmin, unauthorizedResponse } from "../../../_lib/adminAuth.js";
import { recordAudit } from "../../../_lib/auditLog.js";

function notFound() {
  return new Response(JSON.stringify({ error: "NOT_FOUND" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPatch({ request, env, params }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "DB_NOT_CONFIGURED" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id)) return notFound();

  const body = await request.json().catch(() => ({}));
  const updates = [];
  const values = [];

  if (typeof body?.title === "string" && body.title.trim()) {
    updates.push("title = ?");
    values.push(body.title.trim());
  }
  if (Number.isFinite(Number.parseInt(body?.sortOrder, 10))) {
    updates.push("sort_order = ?");
    values.push(Number.parseInt(body.sortOrder, 10));
  }

  if (updates.length === 0) {
    return new Response(JSON.stringify({ error: "NOTHING_TO_UPDATE" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  const result = await env.DB.prepare(`UPDATE modules SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  if (result.meta.changes === 0) return notFound();

  await recordAudit(env, { action: "module.update", target: `module:${id}`, details: body });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestDelete({ request, env, params }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "DB_NOT_CONFIGURED" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id)) return notFound();

  const existing = await env.DB.prepare(`SELECT id FROM modules WHERE id = ?`).bind(id).first();
  if (!existing) return notFound();

  await env.DB.prepare(`DELETE FROM lessons WHERE module_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM modules WHERE id = ?`).bind(id).run();

  await recordAudit(env, { action: "module.delete", target: `module:${id}` });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequest() {
  return unauthorizedResponse();
}
