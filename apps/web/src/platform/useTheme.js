import { useEffect, useState } from "react";

// Double thème (docs/DESIGN-SYSTEM.md §2 bis, chantier 5 du 08/10/2026) :
// `data-theme="dark"|"light"` sur <html> (pas sur .platform-root -- il faut
// que ça s'applique avant même que React ait monté quoi que ce soit, pour
// éviter un flash du mauvais thème), mémorisé, initialisé sur
// `prefers-color-scheme` à la toute première visite (pas de préférence
// enregistrée encore).
export const THEME_STORAGE_KEY = "simulateur-amadeus:theme";

function initialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

export function useTheme() {
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function setTheme(next) {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeState(next);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return [theme, toggleTheme];
}
