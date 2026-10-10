// Cloudflare Pages Function — Mission 23 Étape 5 (attestation de fin de
// parcours, missions/MISSION-23.md).
//
// GET ?lang=fr|en -> flux PDF (généré à la demande, jamais stocké -- voir
//   functions/_lib/certificate.js) | 403 { error: "NOT_COMPLETED" } tant que
//   100% des leçons de la formation ne sont pas marquées terminées pour cet
//   étudiant | 404 neutre si la formation n'existe pas ou que l'étudiant
//   n'y est pas inscrit (même principe que lessons/[id]/index.js : un
//   étudiant qui devine un slug auquel il n'est pas inscrit n'apprend rien
//   de sa tentative).
//
// Accès : session étudiant requise, comme tout le reste de l'espace
// étudiant -- aucune route publique ne peut atteindre ce endpoint, et un
// étudiant ne peut jamais obtenir l'attestation d'un autre (la requête
// filtre toujours sur session.user.id, jamais sur un id fourni par
// l'appelant).
import { requireSession, unauthorizedResponse } from "../../../_lib/studentAuth.js";
import { generateCertificatePdf } from "../../../_lib/certificate.js";

export async function onRequestGet({ request, env, params }) {
  const session = await requireSession(request, env);
  if (!session) return unauthorizedResponse();
  if (!env.DB) return notFound();

  const course = await env.DB.prepare(`SELECT id, title FROM courses WHERE slug = ?`)
    .bind(params.slug)
    .first();
  if (!course) return notFound();

  const enrollment = await env.DB.prepare(
    `SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?`
  )
    .bind(session.user.id, course.id)
    .first();
  if (!enrollment) return notFound();

  const { total, completed, lastCompletedAt } = await progressFor(env.DB, session.user.id, course.id);
  if (total === 0 || completed < total) {
    return new Response(JSON.stringify({ error: "NOT_COMPLETED", completed, total }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "fr";

  // Repli explicite : prénom/nom sont optionnels à l'inscription
  // (AuthScreen.jsx ne les marque pas `required`) -- un étudiant qui n'en a
  // fourni aucun reçoit son e-mail comme identifiant plutôt qu'une
  // attestation bloquée ou vide. Aucun des deux n'est renvoyé à un service
  // tiers : le PDF est construit entièrement dans ce Worker.
  const studentName = [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.email;

  const pdfBytes = await generateCertificatePdf({
    studentName,
    courseTitle: course.title,
    completedAtIso: lastCompletedAt,
    lang,
  });

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="attestation-${params.slug}.pdf"`,
      // Contient un nom et une date personnels -- jamais mis en cache,
      // jamais par un intermédiaire (docs/SECURITE.md, même motif que
      // functions/api/files/download.js pour le contenu payant).
      "cache-control": "private, max-age=0, no-store",
    },
  });
}

async function progressFor(db, userId, courseId) {
  const { results: lessonRows } = await db
    .prepare(
      `SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?`
    )
    .bind(courseId)
    .all();
  const total = lessonRows.length;
  if (total === 0) return { total: 0, completed: 0, lastCompletedAt: null };

  const { results: progressRows } = await db
    .prepare(
      `SELECT lp.completed_at FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE m.course_id = ? AND lp.user_id = ? AND lp.status = 'completed'`
    )
    .bind(courseId, userId)
    .all();

  const completed = progressRows.length;
  const lastCompletedAt = progressRows.reduce((latest, row) => {
    if (!row.completed_at) return latest;
    return !latest || row.completed_at > latest ? row.completed_at : latest;
  }, null);

  return { total, completed, lastCompletedAt: lastCompletedAt || new Date().toISOString() };
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
