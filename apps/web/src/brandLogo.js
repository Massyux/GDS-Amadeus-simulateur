// Table des fichiers du logo officiel (12/10/2026) + variante compacte
// (14/10/2026, PROMPT-LOGO-COMPACT.md) et seuils de sélection -- SEULE
// source de vérité, demande explicite du designer : "ne disperse pas des
// <img> avec des conditions dans la nav, le pied de page, /admin et
// l'écran de connexion : c'est ainsi qu'une règle devient fausse à trois
// endroits sur quatre en deux mois." platform/Brand.jsx (thème dynamique,
// via useTheme()) ET admin/AdminLogin.jsx + AdminApp.jsx (thème toujours
// "light" -- /admin n'a pas de bascule, fond clair fixe) appellent tous
// deux pickBrandLogo() ci-dessous.
//
// Pas de mesure au runtime (demande explicite) : `heightPx` est une
// hauteur de rendu VOULUE par l'appelant, connue statiquement au moment
// d'écrire le composant (40px en barre de navigation, etc.) -- jamais une
// largeur lue sur le DOM après coup, qui provoquerait un changement
// d'image visible après le premier rendu et dégraderait le CLS.
const BIG = {
  dark: "/brand/svg/logo-pour-fond-sombre-transparent.svg",
  light: "/brand/svg/logo-pour-fond-clair-transparent.svg",
};
const COMPACT = {
  dark: "/brand/compact/logo-compact-fond-sombre-transparent.svg",
  light: "/brand/compact/logo-compact-fond-clair-transparent.svg",
};
const EMBLEM = {
  dark: "/brand/compact/embleme-petites-tailles-fond-sombre.svg",
  light: "/brand/compact/embleme-petites-tailles-fond-clair.svg",
};

// Ratios largeur/hauteur mesurés sur les fichiers fournis (viewBox réel,
// pas une supposition) : grand format 640×240 ; compact 151.76×40 --
// exactement les "152 px de large" annoncés par compact/LISEZ-MOI-compact.md
// pour 40 px de haut ; emblème 150.85×150.85, carré (la marque seule, sans
// le mot ACADEMY).
export const BIG_RATIO = 640 / 240;
export const COMPACT_RATIO = 151.76 / 40;
export const EMBLEM_RATIO = 1;

/**
 * Seuils de compact/LISEZ-MOI-compact.md, exprimés en hauteur plutôt
 * qu'en largeur affichée -- équivalent puisque chaque palier a un ratio
 * fixe connu, et plus simple à appliquer sans mesurer quoi que ce soit :
 * - >= 150px de haut -> grand format (atteint 400px de large à 150px,
 *   exactement le seuil "≥ 400px" de la notice).
 * - de 32 à 150px -> compact (reste entre 120 et ~570px de large sur
 *   cette plage ; aucun usage réel de ce projet n'approche la borne
 *   haute aujourd'hui, seule la borne basse -- 40px en barre de nav --
 *   est utilisée).
 * - en dessous de 32px -> emblème seul (en dessous de 120px de large
 *   avec le ratio compact).
 *
 * @param {"dark"|"light"} theme
 * @param {number} heightPx
 * @returns {{ src: string, ratio: number }}
 */
export function pickBrandLogo(theme, heightPx) {
  if (heightPx >= 150) return { src: BIG[theme], ratio: BIG_RATIO };
  if (heightPx >= 32) return { src: COMPACT[theme], ratio: COMPACT_RATIO };
  return { src: EMBLEM[theme], ratio: EMBLEM_RATIO };
}

// Export direct pour le repli CSS "petit mobile" (<picture>, voir
// Brand.jsx) : la seule situation où le choix de fichier doit changer
// selon le VIEWPORT (pas la hauteur voulue par l'appelant) -- demande
// explicite de la notice (point 4), jamais mesurée en JS.
export function emblemSrc(theme) {
  return EMBLEM[theme];
}
