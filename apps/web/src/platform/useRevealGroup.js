import { useCallback, useRef, useState } from "react";

// Apparition au défilement (DESIGN-SYSTEM §6, chantier 4 du 08/10/2026) :
// IntersectionObserver natif, aucune bibliothèque. Observe le CONTENEUR
// d'une grille (pas chaque carte) -- le décalage de 60ms entre cartes vient
// de CSS (`:nth-child`, voir platform.css `.pf-reveal-group`), pas de JS par
// élément. Se déclenche une seule fois (pas de va-et-vient au scroll), et ne
// s'active pas du tout sous `prefers-reduced-motion` : le contenu est
// visible dès le rendu, sans qu'aucune classe ne manque jamais (CSS part
// aussi de `opacity:1` dans ce cas, voir platform.css).
//
// RÉEL CORRIGÉ (08/10/2026) : une `ref` classique + `useEffect(..., [])` ne
// suffit pas dès que l'élément observé apparaît APRÈS le premier rendu --
// cas de CataloguePage.jsx, dont la grille n'existe dans le DOM qu'une fois
// `/api/courses` résolu. L'effet s'exécutait une seule fois avec
// `ref.current === null`, l'observateur n'était jamais posé, et les cartes
// restaient à `opacity:0` pour toujours (pas seulement en capture d'écran --
// un vrai visiteur ne les voyait jamais). Une `ref` callback corrige ça :
// React la rappelle chaque fois que le nœud est attaché, même tardivement.
function skipObserving() {
  return (
    (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) ||
    typeof IntersectionObserver === "undefined"
  );
}

export function useRevealGroup() {
  const [visible, setVisible] = useState(skipObserving);
  const observerRef = useRef(null);

  const ref = useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node || skipObserving()) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return [ref, visible];
}
