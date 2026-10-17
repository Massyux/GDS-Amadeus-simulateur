// Cloudflare Pages Function — Mission 23 Étape 2, rendue publique le
// 17/10/2026 (prompt architecte "fiche de formation, vitrine d'accueil") :
// la fiche de formation doit convaincre un visiteur AVANT qu'il ait un
// compte -- ce n'était pas le cas jusqu'ici (401 systématique sans session).
//
// GET -> { course: { ..., objectives, durationHours }, modules: [{ id,
//   title, lessons: [{ id, type, title, status, isPreview,
//   durationMinutes }] }], enrolled }
//
// `status` vaut toujours "not_started" pour un visiteur anonyme (pas de
// progression sans compte). `isPreview`/`durationMinutes` sont lus depuis
// `content` (clés universelles, voir scripts/seed-dev-course.sql) --
// extraits ici, jamais le `content` complet lui-même.
//
// Volontairement SANS `content` des leçons ici (DESIGN-PSYCHOLOGIE.md §2 :
// "sommaire complet et visible avant l'achat, la transparence vend" --
// titres/types oui, contenu non) : le détail d'une leçon payante n'est
// renvoyé qu'après inscription (ou pour un aperçu gratuit), par
// functions/api/lessons/[id]/index.js.
import { requireSession, unauthorizedResponse } from "../../../_lib/studentAuth.js";

export async function onRequestGet({ request, env, params }) {
  const session = await requireSession(request, env);
  const userId = session?.user?.id ?? null;
  if (!env.DB) return notFound();

  const course = await env.DB.prepare(
    `SELECT c.id, c.slug, c.title, c.description, c.level, ce.objectives, ce.duration_hours
     FROM courses c
     LEFT JOIN course_extras ce ON ce.course_id = c.id
     WHERE c.slug = ? AND c.status = 'published'`
  )
    .bind(params.slug)
    .first();
  if (!course) return notFound();

  const enrollment = userId
    ? await env.DB.prepare(`SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`)
        .bind(userId, course.id)
        .first()
    : null;

  const { results: moduleRows } = await env.DB.prepare(
    `SELECT id, title, sort_order FROM modules WHERE course_id = ? ORDER BY sort_order, id`
  )
    .bind(course.id)
    .all();

  const { results: lessonRows } = await env.DB.prepare(
    `SELECT l.id, l.module_id, l.type, l.title, l.sort_order, l.content, lp.status
     FROM lessons l
     JOIN modules m ON m.id = l.module_id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
     WHERE m.course_id = ?
     ORDER BY l.sort_order, l.id`
  )
    .bind(userId, course.id)
    .all();

  const modules = moduleRows.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: lessonRows
      .filter((l) => l.module_id === m.id)
      .map((l) => {
        const extra = safeParse(l.content);
        const base = {
          id: l.id,
          type: l.type,
          title: l.title,
          status: l.status || "not_started",
          isPreview: Boolean(extra.isPreview),
          durationMinutes: extra.durationMinutes ?? null,
        };
        // Nom/poids de fichier (PROMPT-PASSE-ACCUEIL.md chantier 2, "les
        // documents de la formation" en vraies cartes) -- métadonnée sûre,
        // jamais `fileKey`/une URL de téléchargement : ça ne donne aucun
        // accès, juste de quoi afficher une carte avant inscription.
        if (l.type === "pdf" && extra.fileKey) {
          base.document = { fileName: extra.fileName || null, sizeBytes: extra.sizeBytes ?? null };
        }
        if (l.type === "fichier" && Array.isArray(extra.files)) {
          base.documents = extra.files.map((f) => ({ fileName: f.fileName || null, sizeBytes: f.sizeBytes ?? null }));
        }
        return base;
      }),
  }));

  return new Response(
    JSON.stringify({
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        level: course.level,
        objectives: safeParseArray(course.objectives),
        durationHours: course.duration_hours ?? null,
      },
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
