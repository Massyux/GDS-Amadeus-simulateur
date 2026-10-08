// Cloudflare Pages Function — Mission 23 Étape 4 (back-office formations).
// Même convention que functions/api/admin/licenses.js (Mission 14) : bearer
// admin obligatoire, bindings vérifiés avant toute requête DB.
//
// GET  -> { courses: [{ id, slug, title, description, level, status,
//   sortOrder, moduleCount, lessonCount, createdAt, updatedAt }] }
//   Contrairement à /api/courses (étudiant), renvoie AUSSI les brouillons --
//   c'est précisément ce que l'admin doit voir.
// POST { slug, title, description?, level? } -> 201 { course }
//   status='draft' et sortOrder = max+1 par défaut (publication = étape
//   explicite séparée, PATCH status -- jamais publié dès la création).
import { requireAdmin, unauthorizedResponse } from "../../../_lib/adminAuth.js";
import { recordAudit } from "../../../_lib/auditLog.js";

function toCourseDTO(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    level: row.level,
    status: row.status,
    sortOrder: row.sort_order,
    moduleCount: row.module_count ?? 0,
    lessonCount: row.lesson_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbNotConfigured() {
  return new Response(JSON.stringify({ error: "DB_NOT_CONFIGURED" }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ courses: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const { results } = await env.DB.prepare(
    `SELECT c.id, c.slug, c.title, c.description, c.level, c.status, c.sort_order,
            c.created_at, c.updated_at,
            COUNT(DISTINCT m.id) AS module_count,
            COUNT(DISTINCT l.id) AS lesson_count
     FROM courses c
     LEFT JOIN modules m ON m.course_id = c.id
     LEFT JOIN lessons l ON l.module_id = m.id
     GROUP BY c.id
     ORDER BY c.sort_order, c.id`
  ).all();

  return new Response(JSON.stringify({ courses: results.map(toCourseDTO) }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) return dbNotConfigured();

  const body = await request.json().catch(() => ({}));
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : null;
  const level = typeof body?.level === "string" ? body.level.trim() : null;

  if (!slug || !title) {
    return new Response(JSON.stringify({ error: "SLUG_AND_TITLE_REQUIRED" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { max_sort: maxSort } = await env.DB.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM courses`
  ).first();

  let inserted;
  try {
    inserted = await env.DB.prepare(
      `INSERT INTO courses (slug, title, description, level, status, sort_order)
       VALUES (?, ?, ?, ?, 'draft', ?)
       RETURNING id, slug, title, description, level, status, sort_order, created_at, updated_at`
    )
      .bind(slug, title, description, level, maxSort + 1)
      .first();
  } catch {
    return new Response(JSON.stringify({ error: "SLUG_ALREADY_USED" }), {
      status: 409,
      headers: { "content-type": "application/json" },
    });
  }

  await recordAudit(env, { action: "course.create", target: `course:${inserted.id}`, details: { slug, title } });

  return new Response(
    JSON.stringify({ course: toCourseDTO({ ...inserted, module_count: 0, lesson_count: 0 }) }),
    { status: 201, headers: { "content-type": "application/json" } }
  );
}

export async function onRequest() {
  return unauthorizedResponse();
}
