import { useState } from "react";

// Suggestion (pas un blocage) de passage en mode paysage sur petit écran
// (PROMPT-MOBILE.md, 22/10/2026) : "affichée une seule fois", jamais une
// modale -- une bannière discrète, fermée définitivement via localStorage
// (pas sessionStorage : une seule fois pour de vrai, pas une fois par
// visite). Visible seulement en portrait sous 480px (CSS, voir
// index.css) -- inutile de suggérer un mode déjà actif.
const DISMISSED_KEY = "simulateur-amadeus:landscape-hint-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function LandscapeHint({ t }) {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Stockage indisponible (navigation privée, quota) -- la bannière
      // réapparaîtra au prochain chargement, pas grave, jamais bloquant.
    }
  }

  return (
    <div className="landscape-hint" role="note">
      <span>{t.landscapeHint.message}</span>
      <button type="button" onClick={dismiss} aria-label={t.landscapeHint.dismiss}>
        ×
      </button>
    </div>
  );
}
