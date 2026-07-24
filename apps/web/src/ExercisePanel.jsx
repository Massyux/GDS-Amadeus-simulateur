import { useMemo, useRef, useState } from "react";
import Terminal from "./Terminal.jsx";
import { applySeedState, evaluate } from "@simulateur/exercises";

// Exercise mode's active screen (missions/MISSION-08.md Etape 2): a
// collapsible consigne panel above the REAL Terminal (unchanged, seeded via
// its own `initialState` prop and read back via `ref.getState()` -- the
// terminal itself never knows it's running inside an exercise), plus
// Verifier/Indice/Abandonner and a result screen driven by
// @simulateur/exercises' evaluate().
export default function ExercisePanel({ exercise, t, lang, onAbandon, onBackToHome }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [result, setResult] = useState(null);
  const terminalRef = useRef(null);
  // Seeded once per mount -- ExercisePanel always fully unmounts (via the
  // picker screen) before a different exercise's panel mounts, so
  // `exercise` never changes under a live instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seededState = useMemo(() => applySeedState(exercise), []);

  const aides = exercise.aides || [];
  const hasMoreHints = hintsUsed < aides.length;

  function handleVerify() {
    const state = terminalRef.current?.getState();
    if (!state) return;
    setResult(evaluate(exercise, state, state.commandHistory || [], { hintsUsed }));
  }

  function handleHint() {
    setHintsUsed((n) => Math.min(n + 1, aides.length));
  }

  return (
    <div className="exercise-mode">
      <div className={`exercise-instructions${collapsed ? " collapsed" : ""}`}>
        <div className="exercise-instructions-header">
          <h2 className="exercise-instructions-title">{exercise.titre[lang]}</h2>
          <button
            type="button"
            className="exercise-instructions-toggle"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? t.exerciseMode.expand : t.exerciseMode.collapse}
          </button>
        </div>
        {!collapsed && (
          <>
            <p className="exercise-consigne">{exercise.consigne[lang]}</p>
            {hintsUsed > 0 && (
              <ul className="exercise-hints">
                {aides.slice(0, hintsUsed).map((aide) => (
                  <li key={aide.id}>{aide.text[lang]}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <Terminal ref={terminalRef} initialState={seededState} />

      <div className="exercise-toolbar">
        <button type="button" className="exercise-toolbar-verify" onClick={handleVerify}>
          {t.exerciseMode.verify}
        </button>
        <button
          type="button"
          className="exercise-toolbar-hint"
          onClick={handleHint}
          disabled={!hasMoreHints}
        >
          {hasMoreHints ? t.exerciseMode.hint : t.exerciseMode.noMoreHints}
        </button>
        <button type="button" className="exercise-toolbar-abandon" onClick={onAbandon}>
          {t.exerciseMode.abandon}
        </button>
      </div>

      {result && (
        <div className="exercise-result-backdrop">
          <div
            className="exercise-result-panel"
            role="dialog"
            aria-modal="true"
            aria-label={result.passed ? t.exerciseMode.resultPassed : t.exerciseMode.resultFailed}
          >
            <h2 className="exercise-result-title">
              {result.passed ? t.exerciseMode.resultPassed : t.exerciseMode.resultFailed}
            </h2>
            <p className="exercise-result-score">
              {t.exerciseMode.score}: {result.score} / {result.maxScore}
            </p>
            <h3 className="exercise-result-objectifs-title">{t.exerciseMode.objectifs}</h3>
            <ul className="exercise-result-objectifs">
              {result.feedback.map((f) => (
                <li
                  key={f.objectifId}
                  className={f.passed ? "exercise-objectif-passed" : "exercise-objectif-failed"}
                >
                  <span aria-hidden="true">{f.passed ? "✓" : "✗"}</span>{" "}
                  <span>{f.label[lang]}</span>
                </li>
              ))}
            </ul>
            <div className="exercise-result-actions">
              <button type="button" onClick={() => setResult(null)}>
                {t.exerciseMode.retry}
              </button>
              <button type="button" onClick={onAbandon}>
                {t.exerciseMode.backToPicker}
              </button>
              <button type="button" onClick={onBackToHome}>
                {t.exerciseMode.backToHome}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
