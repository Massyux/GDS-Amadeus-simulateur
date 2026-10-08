import { Link } from "./Link.jsx";

/**
 * Identité de la plateforme (docs/MAQUETTES.md §0) : nom en monospace,
 * dégradé cyan→corail, curseur vert clignotant -- seule exception au
 * "mint interdit hors du terminal" (docs/platform.css), parce que c'est
 * précisément ce qui dit "terminal" en un coup d'œil.
 *
 * Nom par défaut "GDS Academy" (choix de l'architecte, MAQUETTES.md §0) :
 * court, lisible en FR/EN, ne contient pas "Amadeus" (risque de marque).
 */
export function Brand({ to = "/" }) {
  const content = (
    <span className="pf-brand">
      <span className="pf-brand-grad">GDS Academy</span>
      <i className="pf-brand-cursor" aria-hidden="true" />
    </span>
  );
  return to ? (
    <Link to={to} aria-label="GDS Academy">
      {content}
    </Link>
  ) : (
    content
  );
}
