import { lazy, Suspense } from "react";

// Prise en charge réelle du simulateur dans une leçon (Mission 23 Étape 3).
//
// RÈGLE ABSOLUE (demande explicite de Massy) : le terminal doit rester
// strictement identique au mode libre (/simulateur) -- mêmes pixels, même
// comportement clavier, même scroll. apps/web/src/index.css (qui habille
// Terminal.jsx) n'a aucune classe scopée : s'il était monté À L'INTÉRIEUR
// de `.platform-root`, il héritérait de `font-family`/`color`/`background`
// définis là (platform.css) et changerait d'apparence. Ce composant est
// donc rendu par LessonPlayerPage comme une alternative à <PlatformLayout>,
// jamais nesté dans `.platform-root` -- aucune fuite de style possible,
// pas besoin de portail DOM.
//
// Chargement à la demande (DESIGN-SYSTEM §7) : Terminal.jsx et
// @simulateur/exercises ne sont importés dynamiquement qu'à l'ouverture
// réelle d'une leçon simulateur/exercice -- jamais dans le chunk /app par
// défaut (encore moins celui de l'accueil, qui ne charge même pas /app).
const Terminal = lazy(() => import("../Terminal.jsx"));
const LessonExercisePanel = lazy(() => import("./LessonExercisePanel.jsx"));

const exitBarStyle = {
  position: "fixed",
  top: "12px",
  right: "12px",
  zIndex: 50,
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: "0.8em",
  padding: "6px 14px",
  border: "1px solid #2f2a7a",
  borderRadius: "4px",
  background: "#eef2fa",
  color: "#2f2a7a",
  cursor: "pointer",
  opacity: 0.85,
};

export default function LessonSimulatorView({ type, exerciseId, t, lang, onExit, onPassed }) {
  const tl = t.platform.lesson;

  if (type === "exercice") {
    return (
      <Suspense fallback={null}>
        <LessonExercisePanel
          exerciseId={exerciseId}
          t={t}
          lang={lang}
          onPassed={onPassed}
          onAbandon={onExit}
          onBackToHome={onExit}
        />
      </Suspense>
    );
  }

  return (
    <>
      <button type="button" style={exitBarStyle} onClick={onExit}>
        ← {tl.exitToLesson}
      </button>
      <Suspense fallback={null}>
        <Terminal />
      </Suspense>
    </>
  );
}
