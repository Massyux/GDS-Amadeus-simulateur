// Cloudflare Pages Function — Mission 23 Étape 4 (back-office formations).
//
// PATCH { type?, title?, content?, sortOrder? } -> { ok: true }
// DELETE -> { ok: true }
import { requireAdmin, unauthorizedResponse } from "../../../_lib/adminAuth.js";
import { recordAudit } from "../../../_lib/auditLog.js";

const LESSON_TYPES = ["texte", "video", "pdf", "fichier", "live", "simulateur", "exercice", "quiz"];

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

  if (typeof body?.type === "string") {
    if (!LESSON_TYPES.includes(body.type)) {
      return new Response(JSON.stringify({ error: "INVALID_TYPE" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    updates.push("type = ?");
    values.push(body.type);
  }
  if (typeof body?.title === "string" && body.title.trim()) {
    updates.push("title = ?");
    values.push(body.title.trim());
  }
  if (typeof body?.content === "object" && body.content !== null) {
    updates.push("content = ?");
    values.push(JSON.stringify(body.content));
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

  const result = await env.DB.prepare(`UPDATE lessons SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  if (result.meta.changes === 0) return notFound();

  await recordAudit(env, { action: "lesson.update", target: `lesson:${id}`, details: { ...body, content: body?.content ? "(updated)" : undefined } });

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

  const result = await env.DB.prepare(`DELETE FROM lessons WHERE id = ?`).bind(id).run();
  if (result.meta.changes === 0) return notFound();

  await recordAudit(env, { action: "lesson.delete", target: `lesson:${id}` });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequest() {
  return unauthorizedResponse();
}
