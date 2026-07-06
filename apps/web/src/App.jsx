import { useState } from "react";
import Onboarding from "./Onboarding.jsx";
import AccessGate from "./AccessGate.jsx";
import { ACCESS_KEY_STORAGE_KEY } from "./accessKey.js";
import Terminal from "./Terminal.jsx";
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
  const [lang, setLang] = useLang();
  const t = dictionary[lang];

  if (screen === "terminal") {
    return <Terminal />;
  }

  if (screen === "key") {
    return (
      <AccessGate
        t={t}
        onValidated={() => setScreen("terminal")}
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
        setScreen("key");
      }}
    />
  );
}
