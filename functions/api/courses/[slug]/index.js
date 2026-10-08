// Cloudflare Pages Function — Mission 23 Étape 2 (page de formation).
//
// GET -> { course, modules: [{ id, title, lessons: [{ id, type, title,
//   status }] }], enrolled }
//
// Volontairement SANS `content` des leçons ici (DESIGN-PSYCHOLOGIE.md §2 :
// "sommaire complet et visible avant l'achat, la transparence vend" --
// titres/types oui, contenu non) : le détail d'une leçon payante n'est
// renvoyé qu'après inscription, par functions/api/lessons/[id]/index.js.
import { requireSession, unauthorizedResponse } from "../../../_lib/studentAuth.js";

export async function onRequestGet({ request, env, params }) {
  const session = await requireSession(request, env);
  if (!session) return unauthorizedResponse();
  if (!env.DB) return notFound();

  const course = await env.DB.prepare(
    `SELECT id, slug, title, description, level FROM courses WHERE slug = ? AND status = 'published'`
  )
    .bind(params.slug)
    .first();
  if (!course) return notFound();

  const enrollment = await env.DB.prepare(
    `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`
  )
    .bind(session.user.id, course.id)
    .first();

  const { results: moduleRows } = await env.DB.prepare(
    `SELECT id, title, sort_order FROM modules WHERE course_id = ? ORDER BY sort_order, id`
  )
    .bind(course.id)
    .all();

  const { results: lessonRows } = await env.DB.prepare(
    `SELECT l.id, l.module_id, l.type, l.title, l.sort_order, lp.status
     FROM lessons l
     JOIN modules m ON m.id = l.module_id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
     WHERE m.course_id = ?
     ORDER BY l.sort_order, l.id`
  )
    .bind(session.user.id, course.id)
    .all();

  const modules = moduleRows.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: lessonRows
      .filter((l) => l.module_id === m.id)
      .map((l) => ({ id: l.id, type: l.type, title: l.title, status: l.status || "not_started" })),
  }));

  return new Response(
    JSON.stringify({
      course: { id: course.id, slug: course.slug, title: course.title, description: course.description, level: course.level },
      modules,
      enrolled: Boolean(enrollment),
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
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
