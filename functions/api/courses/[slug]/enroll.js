// Cloudflare Pages Function — Mission 23 Étape 2 (inscription à une formation).
//
// POST (X-CSRF-Token requis) -> { ok: true }
//
// Gratuit et immédiat pour l'instant : aucun paiement n'existe encore
// (Mission 22). Idempotent (UNIQUE (user_id, course_id) en base) -- s'inscrire
// deux fois au même cours n'est pas une erreur, juste un no-op.
import { requireSession, requireCsrf, unauthorizedResponse, csrfInvalidResponse } from "../../../_lib/studentAuth.js";

export async function onRequestPost({ request, env, params }) {
  const session = await requireSession(request, env);
  if (!session) return unauthorizedResponse();
  if (!(await requireCsrf(request, env, session))) return csrfInvalidResponse();
  if (!env.DB) return notFound();

  const course = await env.DB.prepare(`SELECT id FROM courses WHERE slug = ? AND status = 'published'`)
    .bind(params.slug)
    .first();
  if (!course) return notFound();

  await env.DB.prepare(
    `INSERT INTO enrollments (user_id, course_id) VALUES (?, ?) ON CONFLICT (user_id, course_id) DO NOTHING`
  )
    .bind(session.user.id, course.id)
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
