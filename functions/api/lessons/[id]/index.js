// Cloudflare Pages Function — Mission 23 Étape 2 (lecteur de leçon).
//
// GET -> { lesson: { id, type, title, content }, nav: { prevId, nextId },
//   courseSlug }
//
// `content` dépend de `type` (voir migrations/0002_platform_users.sql) :
//  - texte    : { body }                              (markdown)
//  - video    : { embedUrl }                           (YouTube/Vimeo non répertorié)
//  - pdf      : { fileName, downloadUrl }               (URL signée 10 min)
//  - fichier  : { files: [{ fileName, sizeBytes, downloadUrl }] }
//  - live     : { title, startsAt, durationMinutes, link, state, icsUrl }
//  - simulateur : {} -- terminal libre, rien à stocker.
//  - exercice   : { exerciseId } -- id d'un fichier de packages/exercises/content/.
//    Les deux sont transmis tels quels (branche par défaut de buildContent
//    ci-dessous) : l'évaluation réelle vit côté client (@simulateur/exercises),
//    pas ici (Mission 23 Étape 3).
//
// 404 neutre si la leçon n'existe pas, OU si l'appelant n'est pas inscrit
// au cours qui la contient ET que la leçon n'est pas un aperçu gratuit --
// jamais de distinction entre "n'existe pas" et "pas le droit de voir",
// pour qu'un étudiant qui devine un id n'apprenne rien de sa tentative.
//
// Rendu public le 17/10/2026 (prompt architecte "fiche de formation") :
// "les leçons gratuites portent une mention aperçu gratuit et sont
// ouvrables sans compte". Trois cas, dans cet ordre : (1) inscrit → accès
// complet, progression suivie ; (2) pas inscrit (ou pas connecté du tout)
// mais `content.isPreview` → même contenu, mais AUCUNE progression suivie
// (pas de session utilisateur à qui l'attacher) ; (3) ni l'un ni l'autre →
// 404, comme avant.
import { requireSession, unauthorizedResponse } from "../../../_lib/studentAuth.js";
import { signDownloadUrl } from "../../../_lib/fileAccess.js";

export async function onRequestGet({ request, env, params }) {
  const session = await requireSession(request, env);
  const userId = session?.user?.id ?? null;
  if (!env.DB) return notFound();

  const lessonId = Number.parseInt(params.id, 10);
  if (!Number.isFinite(lessonId)) return notFound();

  const row = await env.DB.prepare(
    `SELECT l.id, l.type, l.title, l.content, l.sort_order, l.module_id,
            m.course_id, c.slug AS course_slug
     FROM lessons l
     JOIN modules m ON m.id = l.module_id
     JOIN courses c ON c.id = m.course_id
     WHERE l.id = ? AND c.status = 'published'`
  )
    .bind(lessonId)
    .first();
  if (!row) return notFound();

  const rawContent = safeParse(row.content);

  const enrolled = userId
    ? await env.DB.prepare(`SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?`)
        .bind(userId, row.course_id)
        .first()
    : null;
  if (!enrolled && !rawContent.isPreview) {
    return userId ? notFound() : unauthorizedResponse();
  }

  const content = await buildContent(env, row.type, rawContent, {
    userId,
    courseId: row.course_id,
    isPreview: Boolean(rawContent.isPreview),
  });

  const nav = await findNeighbours(env.DB, row.course_id, lessonId);

  return new Response(
    JSON.stringify({
      lesson: { id: row.id, type: row.type, title: row.title, content, isPreview: Boolean(rawContent.isPreview) },
      nav,
      courseSlug: row.course_slug,
      enrolled: Boolean(enrolled),
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

async function buildContent(env, type, raw, { userId, courseId, isPreview }) {
  if (type === "pdf" && raw.fileKey) {
    return {
      fileName: raw.fileName || "document.pdf",
      downloadUrl: await signDownloadUrl(env, { fileKey: raw.fileKey, userId, courseId, isPreview }),
    };
  }
  if (type === "fichier" && Array.isArray(raw.files)) {
    const files = await Promise.all(
      raw.files.map(async (f) => ({
        fileName: f.fileName,
        sizeBytes: f.sizeBytes ?? null,
        downloadUrl: await signDownloadUrl(env, { fileKey: f.fileKey, userId, courseId, isPreview }),
      }))
    );
    return { files };
  }
  if (type === "live") {
    const state = liveState(raw.startsAt, raw.durationMinutes);
    return { ...raw, state };
  }
  return raw;
}

function liveState(startsAt, durationMinutes) {
  if (!startsAt) return "a-venir";
  const start = new Date(startsAt).getTime();
  const end = start + (durationMinutes || 0) * 60 * 1000;
  const now = Date.now();
  if (now < start) return "a-venir";
  if (now <= end) return "en-cours";
  return "passee";
}

async function findNeighbours(db, courseId, lessonId) {
  const { results } = await db
    .prepare(
      `SELECT l.id FROM lessons l
       JOIN modules m ON m.id = l.module_id
       WHERE m.course_id = ?
       ORDER BY m.sort_order, m.id, l.sort_order, l.id`
    )
    .bind(courseId)
    .all();
  const ids = results.map((r) => r.id);
  const index = ids.indexOf(lessonId);
  return {
    prevId: index > 0 ? ids[index - 1] : null,
    nextId: index >= 0 && index < ids.length - 1 ? ids[index + 1] : null,
  };
}

export async function onRequest() {
  return unauthorizedResponse();
}
