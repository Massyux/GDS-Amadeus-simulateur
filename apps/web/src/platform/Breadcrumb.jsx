import { Link } from "./Link.jsx";

/**
 * Fil d'Ariane (Mission 23 Étape 3, retour Massy du 08/10/2026 : "pas de
 * retour à l'accueil quand on navigue dans le site"). Chaque maillon sauf le
 * dernier est un lien ; le dernier représente la page courante
 * (aria-current="page", jamais cliquable même si un `to` est fourni).
 *
 * @param {{ items: Array<{ label: string, to?: string }> }} props
 */
export function Breadcrumb({ items }) {
  return (
    <nav className="pf-breadcrumb" aria-label="breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index}>
              {isLast || !item.to ? (
                <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
              {!isLast && (
                <span className="pf-breadcrumb-sep" aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
