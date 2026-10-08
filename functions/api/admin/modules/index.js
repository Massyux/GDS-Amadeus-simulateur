// Cloudflare Pages Function — Mission 23 Étape 4 (back-office formations).
// La LISTE des modules n'a pas de route dédiée : GET /api/admin/courses/:id
// les renvoie déjà imbriqués (c'est toujours dans le contexte d'un cours
// qu'on les consulte). Seule la création vit ici.
//
// POST { courseId, title } -> 201 { module }  -- sortOrder = max+1 dans ce cours.
import { requireAdmin, unauthorizedResponse } from "../../../_lib/adminAuth.js";
import { recordAudit } from "../../../_lib/auditLog.js";

export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "DB_NOT_CONFIGURED" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}));
  const courseId = Number.parseInt(body?.courseId, 10);
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!Number.isFinite(courseId) || !title) {
    return new Response(JSON.stringify({ error: "COURSE_ID_AND_TITLE_REQUIRED" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const course = await env.DB.prepare(`SELECT id FROM courses WHERE id = ?`).bind(courseId).first();
  if (!course) {
    return new Response(JSON.stringify({ error: "COURSE_NOT_FOUND" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const { max_sort: maxSort } = await env.DB.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM modules WHERE course_id = ?`
  )
    .bind(courseId)
    .first();

  const inserted = await env.DB.prepare(
    `INSERT INTO modules (course_id, title, sort_order) VALUES (?, ?, ?)
     RETURNING id, course_id, title, sort_order`
  )
    .bind(courseId, title, maxSort + 1)
    .first();

  await recordAudit(env, { action: "module.create", target: `module:${inserted.id}`, details: { courseId, title } });

  return new Response(
    JSON.stringify({ module: { id: inserted.id, courseId: inserted.course_id, title: inserted.title, sortOrder: inserted.sort_order, lessons: [] } }),
    { status: 201, headers: { "content-type": "application/json" } }
  );
}

export async function onRequest() {
  return unauthorizedResponse();
}
