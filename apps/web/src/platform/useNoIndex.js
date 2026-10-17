import { useEffect } from "react";

// PROMPT-PASSE-ACCUEIL.md chantier 1 (17/10/2026) : /admin et /demo doivent
// porter `noindex` quelle que soit la façon dont un visiteur y arrive --
// y compris désormais via un lien visible (le raccourci "Administration").
// `index.html` est unique (SPA, Root.jsx choisit la racine côté client) :
// pas de balise statique possible par route, donc une balise <meta
// name="robots"> posée/retirée au montage de la page concernée.
export function useNoIndex() {
  useEffect(() => {
    let tag = document.querySelector('meta[name="robots"]');
    const created = !tag;
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "robots");
      document.head.appendChild(tag);
    }
    const previous = tag.getAttribute("content");
    tag.setAttribute("content", "noindex");
    return () => {
      if (created) {
        tag.remove();
      } else if (previous === null) {
        tag.removeAttribute("content");
      } else {
        tag.setAttribute("content", previous);
      }
    };
  }, []);
}
