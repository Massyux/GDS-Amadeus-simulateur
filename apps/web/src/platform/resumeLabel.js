// Libellé du bloc "Reprendre" (docs/MAQUETTES.md §3/§6 : "Continuer —
// Module 1, leçon 3"), partagé entre CataloguePage.jsx et AccountPage.jsx.
// Retombe sur le pourcentage simple si la position précise (module/leçon)
// n'est pas connue -- ne jamais afficher "Module undefined" si l'API
// n'a pas pu la calculer.
export function resumeLabel(tc, course) {
  if (course.nextModuleIndex && course.nextLessonIndexInModule) {
    return tc.resumeCta
      .replace("{module}", tc.resumeModule.replace("{n}", course.nextModuleIndex))
      .replace("{lesson}", tc.resumeLesson.replace("{n}", course.nextLessonIndexInModule));
  }
  return `${course.progressPct}%`;
}
