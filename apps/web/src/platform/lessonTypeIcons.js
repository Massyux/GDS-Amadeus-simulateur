// Icône par type de leçon (docs/MAQUETTES.md §4.3 et §5) -- glyphes simples,
// pas d'emoji, même esprit que le "☰" déjà utilisé pour le menu mobile
// (ui/PlatformLayout.jsx) ou le "○" de l'état vide (ui/EmptyState.jsx).
// Partagé entre CoursePage.jsx (sommaire) et LessonPlayerPage.jsx (sidebar).
export const LESSON_TYPE_ICONS = {
  texte: "≡",
  video: "▶",
  pdf: "▤",
  fichier: "⇩",
  live: "●",
  simulateur: ">_",
  exercice: "✓",
  quiz: "?",
};
