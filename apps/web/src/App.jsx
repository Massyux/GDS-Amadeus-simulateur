import { useState } from "react";
import Onboarding from "./Onboarding.jsx";
import Terminal from "./Terminal.jsx";

const SKIP_ONBOARDING_KEY = "simulateur-amadeus:skip-onboarding";

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem(SKIP_ONBOARDING_KEY) !== "1"
  );

  if (!showOnboarding) {
    return <Terminal />;
  }

  return (
    <Onboarding
      onEnter={() => {
        localStorage.setItem(SKIP_ONBOARDING_KEY, "1");
        setShowOnboarding(false);
      }}
    />
  );
}
