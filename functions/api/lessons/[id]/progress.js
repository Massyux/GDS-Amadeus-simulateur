// Cloudflare Pages Function — Mission 23 Étape 2 (marquage de progression).
//
// POST { status: "in_progress" | "completed" } (X-CSRF-Token requis) -> { ok: true }
//
// Score/max_score restent NULL ici -- Étape 2 ne fait que "terminé / pas
// terminé" (MISSION-23.md "Points d'extension à réserver" #2, Mission 24 les
// remplira sans toucher ce fichier ni le schéma).
import { requireSession, requireCsrf, unauthorizedResponse, csrfInvalidResponse } from "../../../_lib/studentAuth.js";

const VALID_STATUSES = new Set(["in_progress", "completed"]);

export async function onRequestPost({ request, env, params }) {
  const session = await requireSession(request, env);
  if (!session) return unauthorizedResponse();
  if (!(await requireCsrf(request, env, session))) return csrfInvalidResponse();
  if (!env.DB) return notFound();

  const lessonId = Number.parseInt(params.id, 10);
  const body = await request.json().catch(() => ({}));
  const status = VALID_STATUSES.has(body?.status) ? body.status : null;
  if (!Number.isFinite(lessonId) || !status) {
    return new Response(JSON.stringify({ error: "INVALID_INPUT" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const row = await env.DB.prepare(
    `SELECT m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?`
  )
    .bind(lessonId)
    .first();
  if (!row) return notFound();

  const enrolled = await env.DB.prepare(
    `SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?`
  )
    .bind(session.user.id, row.course_id)
    .first();
  if (!enrolled) return notFound();

  await env.DB.prepare(
    `INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, completed_at, updated_at)
     VALUES (?, ?, ?, datetime('now'), ?, datetime('now'))
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET
       status = excluded.status,
       completed_at = excluded.completed_at,
       updated_at = datetime('now')`
  )
    .bind(session.user.id, lessonId, status, status === "completed" ? new Date().toISOString() : null)
    .run();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function notFound() {
  return new Response(JSON.stringify({ error: "NOT_FOUND" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequest() {
  return unauthorizedResponse();
}
