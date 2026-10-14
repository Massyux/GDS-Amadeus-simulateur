import { Link } from "./Link.jsx";
import { useTheme } from "./useTheme.js";

/**
 * Logo officiel Orionis Academy (12/10/2026, kit fourni par Massy). Le kit
 * l'interdit explicitement : « ne le recrée pas en texte HTML » -- un
 * fichier vectoriel fourni, jamais recomposé. Deux variantes selon le
 * thème actif ; `useTheme()` résout la valeur de façon synchrone dès le
 * premier rendu (même garantie "pas de flash" que partout ailleurs dans
 * l'app, voir useTheme.js) -- pas besoin d'un état ou d'un effet dédié ici.
 */
const LOGO_SRC = {
  dark: "/brand/svg/logo-pour-fond-sombre-transparent.svg",
  light: "/brand/svg/logo-pour-fond-clair-transparent.svg",
};

// Dimensions intrinsèques du SVG fourni (640×240, ratio 8:3). width/height
// explicites pour que le navigateur réserve l'espace avant chargement
// (anti-CLS, DESIGN-SYSTEM §7) -- la taille affichée réelle vient de
// platform.css (.pf-brand-logo), qui ne touche que la hauteur et laisse le
// ratio déterminer la largeur.
export function Brand({ to = "/" }) {
  const [theme] = useTheme();
  const img = (
    <img src={LOGO_SRC[theme]} alt="Orionis Academy" width={320} height={120} className="pf-brand-logo" />
  );
  return to ? (
    <Link to={to} aria-label="Orionis Academy" className="pf-brand-link">
      {img}
    </Link>
  ) : (
    img
  );
}
