// Cloudflare Pages Function — Mission 23 Étape 2 (page « Mon compte »).
//
// GET -> { user, courses: [{ slug, title, progressPct, lessonCount,
//   completedCount, nextLessonId, nextModuleTitle, nextLessonTitle,
//   nextModuleIndex, nextLessonIndexInModule }] }
//
// `nextLessonId` est ce qui alimente "reprise en un clic"
// (DESIGN-PSYCHOLOGIE.md §4 : "la friction entre l'envie et l'action est ce
// qui tue la régularité") : la première leçon non terminée dans l'ordre du
// cours, ou null si tout est terminé. Les champs `next*` restants (titre,
// position) alimentent le bloc "Reprendre" de docs/MAQUETTES.md §6 --
// même logique que functions/api/courses/index.js.
import { requireSession, unauthorizedResponse } from "../../_lib/studentAuth.js";

export async function onRequestGet({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ user: session.user, courses: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const { results: enrolled } = await env.DB.prepare(
    `SELECT c.id, c.slug, c.title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ?`
  )
    .bind(session.user.id)
    .all();

  const courses = [];
  for (const course of enrolled) {
    const { results: lessons } = await env.DB.prepare(
      `SELECT l.id, l.title AS lesson_title, l.module_id, m.title AS module_title, lp.status
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
       WHERE m.course_id = ?
       ORDER BY m.sort_order, m.id, l.sort_order, l.id`
    )
      .bind(session.user.id, course.id)
      .all();

    const completedCount = lessons.filter((l) => l.status === "completed").length;

    let moduleIndex = 0;
    let lastModuleId = null;
    let lessonIndexInModule = 0;
    let nextLesson = null;
    for (const lesson of lessons) {
      if (lesson.module_id !== lastModuleId) {
        moduleIndex += 1;
        lastModuleId = lesson.module_id;
        lessonIndexInModule = 0;
      }
      lessonIndexInModule += 1;
      if (lesson.status !== "completed" && !nextLesson) {
        nextLesson = { ...lesson, moduleIndex, lessonIndexInModule };
      }
    }

    courses.push({
      slug: course.slug,
      title: course.title,
      lessonCount: lessons.length,
      completedCount,
      progressPct: lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0,
      nextLessonId: nextLesson ? nextLesson.id : null,
      nextModuleTitle: nextLesson ? nextLesson.module_title : null,
      nextLessonTitle: nextLesson ? nextLesson.lesson_title : null,
      nextModuleIndex: nextLesson ? nextLesson.moduleIndex : null,
      nextLessonIndexInModule: nextLesson ? nextLesson.lessonIndexInModule : null,
    });
  }

  return new Response(JSON.stringify({ user: session.user, courses }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequest() {
  return unauthorizedResponse();
}
