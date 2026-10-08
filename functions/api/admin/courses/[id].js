// Cloudflare Pages Function — Mission 23 Étape 4 (back-office formations).
//
// GET -> { course, modules: [{ id, title, sortOrder, lessons: [{ id, type,
//   title, sortOrder, content }] }] }
//   Contrairement à /api/courses/:slug (étudiant), renvoie le `content`
//   complet de chaque leçon -- l'admin édite, l'étudiant non-inscrit ne
//   doit rien voir avant d'acheter.
// PATCH { slug?, title?, description?, level?, status?, sortOrder? } -> {ok:true}
//   Pas de DELETE ici (docs/SECURITE.md §7 : "dépublier plutôt que
//   supprimer") -- status: 'draft' EST la dépublication.
import { requireAdmin, unauthorizedResponse } from "../../../_lib/adminAuth.js";
import { recordAudit } from "../../../_lib/auditLog.js";

function dbNotConfigured() {
  return new Response(JSON.stringify({ error: "DB_NOT_CONFIGURED" }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}

function notFound() {
  return new Response(JSON.stringify({ error: "NOT_FOUND" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestGet({ request, env, params }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) return dbNotConfigured();

  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id)) return notFound();

  const course = await env.DB.prepare(
    `SELECT id, slug, title, description, level, status, sort_order FROM courses WHERE id = ?`
  )
    .bind(id)
    .first();
  if (!course) return notFound();

  const { results: moduleRows } = await env.DB.prepare(
    `SELECT id, title, sort_order FROM modules WHERE course_id = ? ORDER BY sort_order, id`
  )
    .bind(id)
    .all();

  const { results: lessonRows } = await env.DB.prepare(
    `SELECT l.id, l.module_id, l.type, l.title, l.sort_order, l.content
     FROM lessons l
     JOIN modules m ON m.id = l.module_id
     WHERE m.course_id = ?
     ORDER BY l.sort_order, l.id`
  )
    .bind(id)
    .all();

  const modules = moduleRows.map((m) => ({
    id: m.id,
    title: m.title,
    sortOrder: m.sort_order,
    lessons: lessonRows
      .filter((l) => l.module_id === m.id)
      .map((l) => ({
        id: l.id,
        type: l.type,
        title: l.title,
        sortOrder: l.sort_order,
        content: safeParse(l.content),
      })),
  }));

  return new Response(
    JSON.stringify({
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        level: course.level,
        status: course.status,
        sortOrder: course.sort_order,
      },
      modules,
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

export async function onRequestPatch({ request, env, params }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) return dbNotConfigured();

  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id)) return notFound();

  const body = await request.json().catch(() => ({}));
  const updates = [];
  const values = [];

  if (typeof body?.slug === "string" && body.slug.trim()) {
    updates.push("slug = ?");
    values.push(body.slug.trim());
  }
  if (typeof body?.title === "string" && body.title.trim()) {
    updates.push("title = ?");
    values.push(body.title.trim());
  }
  if (typeof body?.description === "string") {
    updates.push("description = ?");
    values.push(body.description.trim() || null);
  }
  if (typeof body?.level === "string") {
    updates.push("level = ?");
    values.push(body.level.trim() || null);
  }
  if (body?.status === "draft" || body?.status === "published") {
    updates.push("status = ?");
    values.push(body.status);
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

  let result;
  try {
    result = await env.DB.prepare(`UPDATE courses SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  } catch {
    return new Response(JSON.stringify({ error: "SLUG_ALREADY_USED" }), {
      status: 409,
      headers: { "content-type": "application/json" },
    });
  }

  if (result.meta.changes === 0) return notFound();

  await recordAudit(env, {
    action: body?.status ? `course.${body.status === "published" ? "publish" : "unpublish"}` : "course.update",
    target: `course:${id}`,
    details: body,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function safeParse(text) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

export async function onRequest() {
  return unauthorizedResponse();
}
