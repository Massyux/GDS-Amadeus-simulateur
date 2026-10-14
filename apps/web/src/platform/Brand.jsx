import { Link } from "./Link.jsx";
import { useTheme } from "./useTheme.js";
import { pickBrandLogo, emblemSrc } from "../brandLogo.js";

// Hauteur de rendu en barre de navigation (64px, DESIGN-SYSTEM §5 bis) :
// 40px, valeur donnée explicitement par compact/LISEZ-MOI-compact.md
// (14/10/2026) -- la variante compacte y règle le défaut de lisibilité
// d'ACADEMY constaté en production avec le grand format.
const NAV_HEIGHT_PX = 40;

/**
 * Logo officiel Orionis Academy -- fichier vectoriel fourni, jamais
 * recomposé en texte HTML (interdiction explicite des deux kits, le
 * grand format du 12/10/2026 et la variante compacte du 14/10/2026).
 * Seul endroit du projet qui décide quel fichier afficher (seuil de
 * taille, thème clair/sombre) -- voir brandLogo.js, partagé avec
 * admin/AdminLogin.jsx et admin/AdminApp.jsx pour que cette règle ne vive
 * jamais qu'à un seul endroit.
 *
 * `useTheme()` résout le thème de façon synchrone dès le premier rendu
 * (même garantie "pas de flash" que partout ailleurs dans l'app) -- pas
 * besoin d'un état ou d'un effet dédié ici.
 *
 * @param {{ to?: string | null, heightPx?: number }} props
 */
export function Brand({ to = "/", heightPx = NAV_HEIGHT_PX }) {
  const [theme] = useTheme();
  const { src, ratio } = pickBrandLogo(theme, heightPx);
  const width = Math.round(heightPx * ratio);

  // Repli CSS pour une barre de navigation trop étroite pour la variante
  // compacte (< 120px de large disponible, "petit mobile" -- point 4 de
  // compact/LISEZ-MOI-compact.md) : un <picture> avec une source
  // alternative sous un point de rupture, jamais une mesure JS de la
  // largeur réelle (ça provoquerait un changement d'image visible après
  // le premier rendu, et dégraderait le CLS). 340px choisi après calcul
  // de la place réellement disponible dans .pf-topbar-inner (padding +
  // bouton hamburger) : à 390px (largeur testée dans ce projet,
  // EXIGENCES-UX.md) la compacte tient très large ; ce repli ne joue donc
  // que sur des téléphones nettement plus étroits que ceux visés par les
  // captures de vérification -- défensif, pas le cas courant.
  const img = (
    <picture>
      <source media="(max-width: 340px)" srcSet={emblemSrc(theme)} />
      <img src={src} alt="Orionis Academy" width={width} height={heightPx} className="pf-brand-logo" />
    </picture>
  );

  return to ? (
    <Link to={to} aria-label="Orionis Academy" className="pf-brand-link">
      {img}
    </Link>
  ) : (
    img
  );
}
