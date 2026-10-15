import { useEffect, useState } from "react";

export const LANG_STORAGE_KEY = "simulateur-amadeus:lang";

// Le français est la langue par défaut, TOUJOURS, quelle que soit la langue
// du navigateur (marché Algérie, contenu pensé en français -- constat
// architecte du 15/10/2026 : un visiteur au téléphone configuré en anglais,
// cas très courant, ne doit pas recevoir le site en anglais). Pas de lecture
// de `navigator.language`/`Accept-Language` ici, volontairement -- seul un
// choix explicite du visiteur (le sélecteur FR/EN) doit faire basculer la
// langue, et ce choix est alors mémorisé pour les visites suivantes.
export function useLang() {
  const [lang, setLangState] = useState(
    () => localStorage.getItem(LANG_STORAGE_KEY) || "fr"
  );

  // <html lang> doit refléter la langue réellement affichée (SEO,
  // accessibilité, lecteurs d'écran) -- jusqu'ici figé à "fr" dans
  // index.html et jamais mis à jour après un choix explicite d'anglais.
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  function setLang(next) {
    localStorage.setItem(LANG_STORAGE_KEY, next);
    setLangState(next);
  }

  return [lang, setLang];
}
