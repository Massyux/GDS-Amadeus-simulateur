// Cloudflare Pages Function — Mission 23 Étape 4 (back-office formations).
//
// GET -> { course, modules: [{ id, title, sortOrder, lessons: [{ id, type,
//   title, sortOrder, content }] }] }
//   Contrairement à /api/courses/:slug (étudiant), renvoie le `content`
//   complet de chaque leçon -- l'admin édite, l'étudiant non-inscrit ne
//   doit rien voir avant d'acheter.
// PATCH { slug?, title?, description?, level?, status?, sortOrder? } -> {ok:true}
//   docs/SECURITE.md §7 ("dépublier plutôt que supprimer") reste la voie
//   normale pour retirer une formation du public -- status: 'draft' EST la
//   dépublication.
// DELETE -> { ok: true }
//   Ajouté le 17/10/2026 (demande explicite de Massy, pour pouvoir retirer
//   une formation jetable créée pendant la vérification de production d'un
//   chantier) -- une exception délibérée à la règle ci-dessus, pas un
//   retour en arrière sur elle : §7 protège une formation qui a eu de vrais
//   inscrits, pas un brouillon de test. Cascade manuelle dans l'ordre
//   enfants -> parent (même motif que modules/[id].js, pas de ON DELETE
//   CASCADE déclaré dans les migrations) : progression -> inscriptions ->
//   leçons (+ leurs fichiers R2) -> objectifs/durée (course_extras) ->
//   modules -> formation.
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
    `SELECT c.id, c.slug, c.title, c.description, c.level, c.status, c.sort_order,
            ce.objectives, ce.duration_hours
     FROM courses c
     LEFT JOIN course_extras ce ON ce.course_id = c.id
     WHERE c.id = ?`
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
        objectives: safeParseArray(course.objectives),
        durationHours: course.duration_hours ?? null,
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

  // `objectives`/`durationHours` vivent dans course_extras (migrations/
  // 0004_course_extras.sql), pas dans `courses` -- traités séparément,
  // via un UPSERT, pour ne pas forcer une ligne vide dès la création d'une
  // formation qui n'a encore ni objectifs ni durée.
  let extrasProvided = false;
  let objectivesValue;
  if (Array.isArray(body?.objectives)) {
    extrasProvided = true;
    objectivesValue = JSON.stringify(body.objectives.filter((o) => typeof o === "string" && o.trim()));
  }
  let durationHoursValue;
  if (body?.durationHours === null || Number.isFinite(Number.parseInt(body?.durationHours, 10))) {
    extrasProvided = true;
    durationHoursValue = body.durationHours === null ? null : Number.parseInt(body.durationHours, 10);
  }

  if (updates.length === 0 && !extrasProvided) {
    return new Response(JSON.stringify({ error: "NOTHING_TO_UPDATE" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (updates.length > 0) {
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
  } else {
    const exists = await env.DB.prepare(`SELECT 1 FROM courses WHERE id = ?`).bind(id).first();
    if (!exists) return notFound();
  }

  if (extrasProvided) {
    const current = await env.DB.prepare(`SELECT objectives, duration_hours FROM course_extras WHERE course_id = ?`)
      .bind(id)
      .first();
    await env.DB.prepare(
      `INSERT INTO course_extras (course_id, objectives, duration_hours, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT (course_id) DO UPDATE SET objectives = excluded.objectives, duration_hours = excluded.duration_hours, updated_at = excluded.updated_at`
    )
      .bind(
        id,
        objectivesValue !== undefined ? objectivesValue : current?.objectives ?? null,
        durationHoursValue !== undefined ? durationHoursValue : current?.duration_hours ?? null
      )
      .run();
  }

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

export async function onRequestDelete({ request, env, params }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) return dbNotConfigured();

  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id)) return notFound();

  const course = await env.DB.prepare(`SELECT id FROM courses WHERE id = ?`).bind(id).first();
  if (!course) return notFound();

  const { results: lessonRows } = await env.DB.prepare(
    `SELECT l.id, l.content FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?`
  )
    .bind(id)
    .all();

  // Fichiers R2 référencés par les leçons pdf/fichier -- supprimés APRÈS la
  // base (si une des deux échoue, mieux vaut un fichier R2 orphelin qu'une
  // leçon qui pointe vers un fichier déjà effacé).
  const fileKeys = [];
  for (const row of lessonRows) {
    const content = safeParse(row.content);
    if (content.fileKey) fileKeys.push(content.fileKey);
    if (Array.isArray(content.files)) {
      for (const f of content.files) if (f?.fileKey) fileKeys.push(f.fileKey);
    }
  }

  if (lessonRows.length > 0) {
    const lessonIds = lessonRows.map((l) => l.id);
    const placeholders = lessonIds.map(() => "?").join(",");
    await env.DB.prepare(`DELETE FROM lesson_progress WHERE lesson_id IN (${placeholders})`)
      .bind(...lessonIds)
      .run();
  }
  await env.DB.prepare(`DELETE FROM enrollments WHERE course_id = ?`).bind(id).run();
  await env.DB.prepare(
    `DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = ?)`
  )
    .bind(id)
    .run();
  await env.DB.prepare(`DELETE FROM course_extras WHERE course_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM modules WHERE course_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM courses WHERE id = ?`).bind(id).run();

  if (env.CONTENT) {
    await Promise.all(
      fileKeys.map((key) => env.CONTENT.delete(key).catch(() => {}))
    );
  }

  await recordAudit(env, { action: "course.delete", target: `course:${id}` });

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

function safeParseArray(text) {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function onRequest() {
  return unauthorizedResponse();
}
