import { useState } from "react";
import Onboarding from "./Onboarding.jsx";
import AccessGate from "./AccessGate.jsx";
import { ACCESS_KEY_STORAGE_KEY } from "./accessKey.js";
import Terminal from "./Terminal.jsx";
import ExercisePicker from "./ExercisePicker.jsx";
import ExercisePanel from "./ExercisePanel.jsx";
import { useLang } from "./i18n/useLang.js";
import { dictionary } from "./i18n/dictionary.js";

const SKIP_ONBOARDING_KEY = "simulateur-amadeus:skip-onboarding";

function initialScreen() {
  if (localStorage.getItem(ACCESS_KEY_STORAGE_KEY) === "1") return "terminal";
  if (localStorage.getItem(SKIP_ONBOARDING_KEY) === "1") return "key";
  return "onboarding";
}

export default function App() {
  const [screen, setScreen] = useState(initialScreen);
  // Where AccessGate sends the user once the key is validated -- the free
  // terminal, or exercise mode (missions/MISSION-08.md Etape 2 reuses the
  // same key gate: exercises run the real, full terminal underneath, so
  // they get the same protection as free mode rather than a free bypass).
  const [postKeyDestination, setPostKeyDestination] = useState("terminal");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [lang, setLang] = useLang();
  const t = dictionary[lang];

  if (screen === "terminal") {
    return <Terminal />;
  }

  if (screen === "exercise-picker") {
    return (
      <ExercisePicker
        t={t}
        lang={lang}
        onSelect={(exercise) => {
          setSelectedExercise(exercise);
          setScreen("exercise-active");
        }}
        onBack={() => setScreen("onboarding")}
      />
    );
  }

  if (screen === "exercise-active" && selectedExercise) {
    return (
      <ExercisePanel
        exercise={selectedExercise}
        t={t}
        lang={lang}
        onAbandon={() => setScreen("exercise-picker")}
        onBackToHome={() => setScreen("onboarding")}
      />
    );
  }

  if (screen === "key") {
    return (
      <AccessGate
        t={t}
        onValidated={() => setScreen(postKeyDestination)}
        onBack={() => setScreen("onboarding")}
      />
    );
  }

  return (
    <Onboarding
      t={t}
      lang={lang}
      onChangeLang={setLang}
      onHaveKey={() => {
        localStorage.setItem(SKIP_ONBOARDING_KEY, "1");
        setPostKeyDestination("terminal");
        setScreen("key");
      }}
      onExercises={() => {
        if (localStorage.getItem(ACCESS_KEY_STORAGE_KEY) === "1") {
          setScreen("exercise-picker");
          return;
        }
        localStorage.setItem(SKIP_ONBOARDING_KEY, "1");
        setPostKeyDestination("exercise-picker");
        setScreen("key");
      }}
    />
  );
}
