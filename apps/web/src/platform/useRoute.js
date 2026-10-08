import { useCallback, useEffect, useState } from "react";

// Mini-routeur maison pour /app/* (DESIGN-SYSTEM §7 : "pas de framework UI
// lourd"), même esprit que le test de pathname déjà utilisé dans main.jsx
// pour /admin et /styleguide -- juste étendu avec history.pushState pour que
// les URLs soient réelles (partageables, boutons précédent/suivant), pas un
// simple état en mémoire.

export function navigate(path) {
  if (path !== window.location.pathname + window.location.search) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export function useRoute() {
  const [route, setRoute] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }));

  useEffect(() => {
    function onPopState() {
      setRoute({ pathname: window.location.pathname, search: window.location.search });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const onNavigate = useCallback((path) => navigate(path), []);

  return [route, onNavigate];
}
