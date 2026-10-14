# Prompt — Intégration du logo officiel Orionis Academy

> À faire **après** `PROMPT-NAVIGATION.md` (régression critique en cours), et avant ou avec
> `PROMPT-PASSE-ACCUEIL.md`. Rédigé par l'architecte le 12/10/2026 après lecture du
> `LISEZ-MOI.md` fourni avec le kit.

---

Massy a fait réaliser le logo officiel d'Orionis Academy. Le kit complet (SVG, PNG, favicons,
image de partage) est dans son dossier **Téléchargements**, avec un fichier `LISEZ-MOI.md` qui
contient une notice d'intégration détaillée. **Localise le dossier, lis ce `LISEZ-MOI.md` en
entier, et suis-le** — il fait autorité sur tout ce qui concerne les fichiers eux-mêmes.

Ce prompt ne le répète pas. Il traite les trois points que la notice ne couvre pas, et qui sont
des décisions de projet.

## 1. Poser les fichiers

Copie `svg/`, `png/` et `favicon/` dans `apps/web/public/brand/`, conformément à la notice.
Ce sont des actifs publics du site — **pas R2**, qui reste réservé aux documents de cours sous
licence (`functions/_lib/fileAccess.js`). Même raisonnement que pour les photos Unsplash,
documenté dans `docs/IDENTITE-VISUELLE.md`.

Balises `<head>` (favicons, `theme-color`, Open Graph) : comme dans la notice, avec l'URL
absolue réelle pour `og:image` — `https://orionisacademy.com/brand/png/image-partage-1200x630.png`.

## 2. Remplacer `Brand.jsx` — le logo n'est plus du texte

`apps/web/src/platform/Brand.jsx` compose aujourd'hui le nom en HTML, avec un curseur de
terminal. **La notice l'interdit explicitement** : « ne le recrée pas en texte HTML ». Remplace
par le fichier fourni, avec `alt="Orionis Academy"`.

Trois points que la notice ne traite pas et qui sont à toi :

- **Le site a deux thèmes.** `useTheme.js` existe. Le logo doit basculer entre
  `logo-pour-fond-sombre-transparent.svg` et `logo-pour-fond-clair-transparent.svg` selon le
  thème actif. Choisis la méthode la plus simple et la plus réversible, et évite le
  clignotement au chargement.
- **Hauteurs** : 40-56 px sur ordinateur, 32-40 px sur mobile (notice). À concilier avec la
  barre de navigation de 64 px fixée par `docs/DESIGN-SYSTEM.md` §5 bis — c'est la contrainte
  la plus serrée, respecte-la et choisis la hauteur de logo qui s'y loge proprement.
- **Partout, pas seulement l'accueil** : barre de navigation de la plateforme, écran de
  connexion/inscription, espace `/admin`, pied de page, et **l'attestation PDF** (Phase 2 de
  l'Étape 5), qui doit désormais porter le logo.

Réserve la place dans la mise en page (largeur/hauteur explicites) pour ne pas dégrader le CLS :
budget `< 0,05` dans `DESIGN-SYSTEM.md` §7, à re-mesurer après.

## 3. 🔶 Conflit de palette — à résoudre, pas à dupliquer

Le kit et le système de design ne disent pas la même chose :

| | Kit logo | `docs/DESIGN-SYSTEM.md` |
|---|---|---|
| Turquoise | `#43C9D9` | `#22D3EE` |
| Orange | `#FC8C5E` | `#FF8A5B` |

Écarts faibles, mais visibles quand le logo est posé à côté d'un bouton.

**Décision de l'architecte : le kit fait référence.** Le logo est un objet figé et vectorisé —
on ne le repeint pas. C'est `docs/DESIGN-SYSTEM.md` qui s'aligne. Reprends les variables du
`LISEZ-MOI.md` (`--oa-*`), mappe-les sur les jetons existants du projet plutôt que d'ajouter un
second jeu de variables en parallèle : **une seule source de vérité pour les couleurs, pas
deux.**

⚠️ **Vérifie les contrastes après la bascule.** Le turquoise du kit est légèrement plus sombre :
tout texte ou bouton qui l'utilise doit rester conforme aux exigences d'accessibilité de
`DESIGN-SYSTEM.md`. Si un contraste passe sous le seuil, corrige la teinte **d'usage** (texte,
bordure) sans jamais toucher à celle du logo, et dis-le dans ton compte rendu.

Mets à jour `docs/DESIGN-SYSTEM.md` et `docs/IDENTITE-VISUELLE.md` : nouvelles valeurs, origine
(kit officiel du 12/10/2026), et la règle « le logo ne se recompose pas en HTML ».

## 4. Ce que tu ne fais PAS dans cette passe

Le `LISEZ-MOI.md` recommande **Cormorant Garamond + Inter** pour toute l'interface. C'est un
changement de typographie générale du site, pas une pose de logo : **ne l'applique pas ici.**
Note-le dans `TASKS.md` comme décision en attente de Massy, avec l'argument pour (cohérence
avec le logo) et contre (refonte typographique de toutes les pages, à revalider écran par
écran). Les polices du logo ne sont de toute façon pas nécessaires à son affichage : le texte
est déjà vectorisé dans les SVG.

Ne touche à rien d'autre : ni à la navigation, ni aux chantiers de `PROMPT-PASSE-ACCUEIL.md`.

## Vérification et clôture

Vérification **visuelle**, en production, à 1280 px et 390 px : logo net sur les deux thèmes,
dans la barre de navigation, sur l'écran de connexion, dans `/admin`, en pied de page, et sur
l'attestation PDF. Favicon visible dans l'onglet du navigateur. Aperçu de partage correct quand
on colle `https://orionisacademy.com` dans une conversation.

Re-mesure les budgets de performance (LCP, CLS) après l'ajout.

Clôture habituelle : suites vertes, lint, typecheck, **entrée datée en haut de `JOURNAL.md`**,
`TASKS.md` §En cours, `CLAUDE.md`.
