// Cloudflare Pages Function — Mission 23 Étape 2 (catalogue).
//
// GET -> { courses: [{ id, slug, title, description, level, lessonCount,
//   enrolled, progressPct, nextLessonId, nextModuleTitle, nextLessonTitle,
//   nextModuleIndex, nextLessonIndexInModule }] } -- formations publiées
// uniquement (un brouillon n'existe pas pour un étudiant). Authentifié
// (espace étudiant), pas public -- voir TASKS.md pour la justification de
// ce choix.
//
// Les champs `next*` alimentent le bloc "Reprendre" de docs/MAQUETTES.md
// §3 ("Continuer — Module 1, leçon 3") sur la page catalogue -- même
// logique de "première leçon non terminée" que functions/api/account/
// index.js (nextLessonId), enrichie ici avec le titre et la position pour
// l'affichage.
import { requireSession, unauthorizedResponse } from "../../_lib/studentAuth.js";

export async function onRequestGet({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ courses: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const { results } = await env.DB.prepare(
    `SELECT
       c.id, c.slug, c.title, c.description, c.level,
       (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS lesson_count,
       e.id AS enrollment_id,
       (SELECT COUNT(*) FROM lesson_progress lp
          JOIN lessons l2 ON l2.id = lp.lesson_id
          JOIN modules m2 ON m2.id = l2.module_id
          WHERE m2.course_id = c.id AND lp.user_id = ? AND lp.status = 'completed') AS completed_count
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
     WHERE c.status = 'published'
     ORDER BY c.sort_order, c.id`
  )
    .bind(session.user.id, session.user.id)
    .all();

  const courses = [];
  for (const row of results) {
    const course = {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      level: row.level,
      lessonCount: row.lesson_count,
      enrolled: Boolean(row.enrollment_id),
      progressPct:
        row.lesson_count > 0 ? Math.round((row.completed_count / row.lesson_count) * 100) : 0,
      nextLessonId: null,
      nextModuleTitle: null,
      nextLessonTitle: null,
      nextModuleIndex: null,
      nextLessonIndexInModule: null,
    };

    if (row.enrollment_id && row.completed_count < row.lesson_count) {
      const { results: ordered } = await env.DB.prepare(
        `SELECT l.id AS lesson_id, l.title AS lesson_title, m.id AS module_id, m.title AS module_title,
                lp.status
         FROM lessons l
         JOIN modules m ON m.id = l.module_id
         LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
         WHERE m.course_id = ?
         ORDER BY m.sort_order, m.id, l.sort_order, l.id`
      )
        .bind(session.user.id, row.id)
        .all();

      let moduleIndex = 0;
      let lastModuleId = null;
      let lessonIndexInModule = 0;
      for (const lesson of ordered) {
        if (lesson.module_id !== lastModuleId) {
          moduleIndex += 1;
          lastModuleId = lesson.module_id;
          lessonIndexInModule = 0;
        }
        lessonIndexInModule += 1;
        if (lesson.status !== "completed") {
          course.nextLessonId = lesson.lesson_id;
          course.nextModuleTitle = lesson.module_title;
          course.nextLessonTitle = lesson.lesson_title;
          course.nextModuleIndex = moduleIndex;
          course.nextLessonIndexInModule = lessonIndexInModule;
          break;
        }
      }
    }

    courses.push(course);
  }

  return new Response(JSON.stringify({ courses }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequest() {
  return unauthorizedResponse();
}
