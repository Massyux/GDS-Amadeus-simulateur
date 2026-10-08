import { Link } from "./Link.jsx";

/**
 * Identité de la plateforme (docs/MAQUETTES.md §0) : nom en monospace,
 * dégradé cyan→corail, curseur vert clignotant -- seule exception au
 * "mint interdit hors du terminal" (docs/platform.css), parce que c'est
 * précisément ce qui dit "terminal" en un coup d'œil.
 *
 * Nom "Orionis Academy" (décision Massy, 08/10/2026, CLAUDE.md) -- remplace
 * "GDS Academy", le choix provisoire par défaut de l'architecte.
 */
export function Brand({ to = "/" }) {
  const content = (
    <span className="pf-brand">
      <span className="pf-brand-grad">Orionis Academy</span>
      <i className="pf-brand-cursor" aria-hidden="true" />
    </span>
  );
  return to ? (
    <Link to={to} aria-label="Orionis Academy">
      {content}
    </Link>
  ) : (
    content
  );
}
