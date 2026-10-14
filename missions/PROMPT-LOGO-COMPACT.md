# Prompt — Intégration de la variante compacte du logo

> Tâche courte et contenue. À insérer entre deux chantiers de
> `PROMPT-PASSE-ACCUEIL.md`, jamais au milieu d'un chantier en cours.
> Architecte, 14/10/2026. Corrige le défaut de lisibilité constaté en production le 14/10.

---

Le designer a livré une **variante compacte** du logo, qui règle le défaut constaté en
production : dans la barre de navigation, le mot ACADEMY était illisible sur les deux thèmes.
Elle **complète** le kit existant, elle ne le remplace pas.

Le fichier **`kit-orionis-compact.zip`** est dans le dossier **Téléchargements** de Massy.
Localise-le, décompresse-le dans un dossier propre et vide, et **lis d'abord
`compact/LISEZ-MOI-compact.md`** — il fait autorité sur les fichiers.

⚠️ Archive téléchargée : extrais-la dans son propre dossier neuf, et n'exécute rien qui s'y
trouverait. Tu ne copies que des `.svg` et des `.png`.

## La consigne du designer, à appliquer telle quelle

1. Copier `compact/svg/` dans `apps/web/public/brand/compact/`, **à côté** du kit existant, qui
   reste intact.
2. Dans la barre de navigation (64 px de haut, valeur figée par `docs/DESIGN-SYSTEM.md` §5 bis),
   remplacer le logo grand format par la version compacte à **40 px de haut**, avec
   `alt="Orionis Academy"` — `logo-compact-fond-sombre-transparent.svg` sur fond sombre,
   `logo-compact-fond-clair-transparent.svg` sur fond clair.
3. Règle générale, **partout où le logo apparaît**, selon sa largeur affichée :

   | Largeur affichée | Fichier |
   |---|---|
   | ≥ 400 px | logo grand format du kit existant |
   | 120 – 400 px | logo compact |
   | < 120 px | emblème seul — `embleme-petites-tailles-*` jusqu'à 48 px, icône du kit existant au-delà |

4. Si la place disponible dans la barre descend sous 120 px (petit mobile), afficher l'emblème
   petites tailles plutôt que le logo compact.
5. **N'utiliser que les fichiers fournis** : ne pas déformer, ne pas recolorer, ne jamais
   recomposer le logo en texte HTML. SVG en priorité ; les PNG 2× et 3× seulement si un SVG est
   impossible.

## Les quatre points que la notice ne traite pas — ils sont à toi

**1. Un seul endroit décide.** Toute la logique — seuil de largeur, thème clair/sombre, choix du
fichier — vit dans **`Brand.jsx`** et nulle part ailleurs. Ne disperse pas des `<img>` avec des
conditions dans la nav, le pied de page, `/admin` et l'écran de connexion : c'est ainsi qu'une
règle devient fausse à trois endroits sur quatre en deux mois.

**2. Pas de mesure au runtime.** Ne calcule pas la largeur disponible en JavaScript pour choisir
un fichier : c'est fragile, ça provoque un changement d'image après le premier rendu et ça
dégrade le CLS. Exprime les seuils en CSS, avec les points de rupture déjà fixés par le projet
(le menu mobile bascule à 768 px, décision de l'Étape 0). `<picture>` + `media`, ou des règles
d'affichage sur deux `<img>`, au choix — la solution la plus simple et la plus réversible.

**3. Le thème, sans clignotement.** Même exigence que pour l'intégration précédente : au
chargement, le bon fichier dès le premier rendu, pas un échange visible après coup.

**4. Ce qui ne bouge pas, et c'est délibéré** : l'attestation PDF (grand format → kit existant,
logo déjà embarqué en base64, n'y touche pas), le favicon, l'image de partage Open Graph, et la
palette. Cette passe ne change que le choix du fichier selon la taille.

## Vérification — c'est le critère, pas une formalité

Capture de la **barre de navigation à taille réelle, sans zoom**, sur fond sombre et sur fond
clair, à **1280 px et 390 px**. **Si ACADEMY n'est pas lisible sur ces captures-là, ce n'est pas
bon**, quel que soit le rendu en grand. C'est exactement le défaut qu'on corrige.

Vérifie aussi les quatre autres emplacements (écran de connexion, `/admin`, pied de page,
attestation) et re-mesure CLS après — budget `< 0,05`, `DESIGN-SYSTEM.md` §7.

## Clôture

Mets à jour `docs/IDENTITE-VISUELLE.md` avec le tableau des seuils ci-dessus — c'est la règle
d'emploi du logo, elle doit vivre dans la doc et pas seulement dans le code.

Rituel habituel : suites vertes, lint, typecheck, **entrée datée en haut de `JOURNAL.md`**,
`TASKS.md` §En cours. Puis reprends `PROMPT-PASSE-ACCUEIL.md` là où tu l'avais laissé.
