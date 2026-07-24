import { exercises } from "@simulateur/exercises";

// Exercise mode entry screen (missions/MISSION-08.md Etape 2): lists the
// exercises currently shipped in packages/exercises/content/. Selecting one
// hands the raw Exercise object up to the caller, which mounts
// ExercisePanel with it.
export default function ExercisePicker({ t, lang, onSelect, onBack }) {
  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1 className="onboarding-title">{t.exerciseMode.pickerTitle}</h1>
        <ul className="exercise-list">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="exercise-list-item">
              <button
                type="button"
                className="exercise-list-button"
                onClick={() => onSelect(exercise)}
              >
                <span className="exercise-list-niveau">
                  {t.exerciseMode.niveau} {exercise.niveau}
                </span>
                <span className="exercise-list-titre">{exercise.titre[lang]}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="onboarding-request" onClick={onBack}>
          {t.exerciseMode.pickerBack}
        </button>
      </div>
    </div>
  );
}
