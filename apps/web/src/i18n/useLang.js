import { useState } from "react";

export const LANG_STORAGE_KEY = "simulateur-amadeus:lang";

export function useLang() {
  const [lang, setLangState] = useState(
    () => localStorage.getItem(LANG_STORAGE_KEY) || "fr"
  );

  function setLang(next) {
    localStorage.setItem(LANG_STORAGE_KEY, next);
    setLangState(next);
  }

  return [lang, setLang];
}
