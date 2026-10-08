import { exercisesById } from "@simulateur/exercises";
import ExercisePanel from "../ExercisePanel.jsx";

// Résout l'id d'exercice stocké dans lessons.content (Mission 23 Étape 3)
// vers l'objet Exercise réel de packages/exercises, puis réutilise
// ExercisePanel tel quel -- le vrai Terminal qu'il monte en interne ne
// change pas d'un pixel entre le mode libre et une leçon (DESIGN-SYSTEM,
// contrainte explicite de Massy). Fichier séparé pour que `import()
// dynamique` (LessonSimulatorView.jsx) ne charge @simulateur/exercises
// que pour les leçons qui en ont réellement besoin.
export default function LessonExercisePanel({ exerciseId, t, lang, onPassed, onAbandon, onBackToHome }) {
  const exercise = exercisesById[exerciseId];
  if (!exercise) {
    return <p>{t.platform.lesson.exerciseIntro}</p>;
  }
  const exitLabel = t.platform.lesson.exitToLesson;
  return (
    <ExercisePanel
      exercise={exercise}
      t={t}
      lang={lang}
      onPassed={onPassed}
      onAbandon={onAbandon}
      onBackToHome={onBackToHome}
      abandonLabel={exitLabel}
      backToHomeLabel={exitLabel}
      showBackToPicker={false}
    />
  );
}
