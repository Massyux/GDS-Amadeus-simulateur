# Identité visuelle — direction validée

*Réécrit le 07/10/2026 après deux objections décisives de Massy. Maquette de référence
validée : `docs/maquettes/accueil.html` — **en cas de doute, c'est elle qui tranche.***

---

## Ce qui a été rejeté, et pourquoi (à ne pas reproduire)

Une première version proposait que **toute l'interface emprunte la grammaire d'un terminal
GDS** (états vides en réponses de terminal, statuts en codes `HK`/`UC`, sommaire formaté
comme un PNR). Massy l'a rejetée pour deux raisons, toutes deux justes :

1. **Risque juridique.** Reprendre les codes propres à Amadeus comme vocabulaire de
   l'interface générale s'approche de l'imitation d'identité commerciale. Ces codes restent
   **à l'intérieur du simulateur**, où ils sont fonctionnels et pédagogiques — jamais dans
   l'habillage du site.
2. **La plateforme n'est pas mono-formation.** Elle accueillera « Hôte d'accueil »,
   « Management d'agence », « Anglais professionnel »… Une coquille thématisée GDS les
   rendrait absurdes.

**Règle qui en découle :** la coquille est neutre, l'identité est portée par chaque formation.

---

## La direction retenue : « nuit & aube »

> Le vol de nuit vu du cockpit. Bleu nuit profond, cyan des instruments de bord, corail du
> lever de soleil. Moderne, chaleureux, technique — et reconnaissable sans emprunter à
> personne.

Ce qui crée l'identité, par ordre d'importance :

1. **L'atmosphère.** Halos lumineux flous en fond, grille fine estompée, barre de navigation
   en verre dépoli. C'est ce qui donne la profondeur et fait la différence avec un gabarit
   plat — pour zéro image et zéro requête réseau.
2. **Le terminal, héros de SA formation.** Il flotte doucement, entouré d'une lueur cyan,
   sur l'accueil et sur les pages de la formation « Réservation aérienne ». Il illustre une
   formation, **pas le site entier**.
3. **La typographie à deux voix.** Monospace pour ce qui est « système » (nom du produit,
   métadonnées, durées, chiffres, badges), sans-serif pour ce qui est « humain » (titres,
   contenu). La dualité machine/humain se lit en une seconde.
4. **Les chiffres tabulaires et les colonnes qui tombent droit.** C'est ce qui dit « outil
   professionnel » plutôt que « page de vente ».
5. **Les illustrations vectorielles par formation** — radar et trajectoire pour l'aérien,
   lever de soleil pour l'accueil, courbes de performance pour le management. Dessinées en
   SVG, aux couleurs de chaque formation. Elles remplacent les photos tant qu'il n'y en a
   pas de vraies.

---

## Les photos — intégrées le 08/10/2026 (chantier 2, passe « vivant »)

Les vignettes SVG sont restées le **remplacement temporaire** pour toute formation sans photo
(Étape 4, back-office), mais ne sont plus la solution par défaut : 7 vraies photos Unsplash
(licence commerciale gratuite) couvrent désormais le héros et les 6 formations de démonstration,
chacune choisie après comparaison de 2-3 candidates. Stockées dans
`apps/web/public/img/` — **pas R2** : ce sont des actifs publics du site (comme les SVG
qu'elles remplacent), pas du contenu sous licence étudiant ; R2 reste réservé aux fichiers
PDF/vidéo des leçons (`functions/_lib/fileAccess.js`). Correction par rapport à la version
précédente de ce document, qui suggérait R2 avant que la question ne se pose réellement.

| Emplacement | Thème à chercher |
|---|---|
| Accueil | cockpit de nuit, instruments allumés · aile au-dessus des nuages au lever du soleil |
| Réservation aérienne | tableau des départs · mains sur un clavier de comptoir |
| Agent de voyage | conseiller face à un client, lumière chaude |
| Hôte & hôtesse d'accueil | accueil d'aéroport, uniforme, sourire naturel |
| Management d'agence | réunion d'équipe en petit comité |
| Formateur | **photo réelle de Massy** — obligatoire, aucune alternative, toujours en attente |

Mots-clés utiles : `cockpit night`, `airport departure board`, `travel agency counter`,
`aviation sunrise wing`.

**Critère de choix, non négociable** : des photos qui ont l'air vraies. Un comptoir réel,
même imparfait, bat une mise en scène de studio — c'est le signal d'illégitimité n°1
identifié dans `DESIGN-PSYCHOLOGIE.md`.

---

## Le logo officiel — intégré le 12/10/2026

Massy a fait réaliser le logo officiel d'Orionis Academy (kit complet : SVG, PNG, favicons,
image de partage, notice `LISEZ-MOI.md`). Il remplace le nom composé en HTML (police + dégradé
+ curseur clignotant) qui tenait lieu de marque depuis le début de Mission 23 —
**`Brand.jsx` ne recompose plus jamais le logo, et ne doit plus jamais le faire : toujours le
fichier vectoriel fourni**, deux variantes selon le thème (`logo-pour-fond-sombre-transparent.svg`
/ `logo-pour-fond-clair-transparent.svg`).

Stocké dans `apps/web/public/brand/` — **pas R2**, même raisonnement que pour les photos
Unsplash ci-dessus : c'est un actif public du site, pas du contenu sous licence étudiant.

**Conflit de palette résolu** (`docs/DESIGN-SYSTEM.md` §2/§2 bis) : le kit et le système de
design fixé le 06/10/2026 ne donnaient pas exactement les mêmes teintes pour `--cyan`/`--coral`.
**Le logo fait référence** — c'est un objet vectorisé figé, on ne le repeint pas. C'est le
système de design qui s'est aligné sur lui, jamais l'inverse. Valeurs à jour dans
`DESIGN-SYSTEM.md`, qui reste la seule source de vérité pour ces jetons (le kit fournit ses
propres variables `--oa-*` dans son `LISEZ-MOI.md`, volontairement jamais ajoutées au projet
en parallèle — un seul jeu de variables, pas deux).

**Typographie du kit (Cormorant Garamond + Inter) non appliquée dans cette passe** : c'est un
changement de typographie de toute l'interface, pas une pose de logo — décision en attente de
Massy, consignée dans `TASKS.md`. Le logo n'en a de toute façon pas besoin pour s'afficher : le
texte est déjà vectorisé dans les SVG fournis.

---

## La variante compacte — intégrée le 14/10/2026

Défaut constaté en production avec le grand format : dans la barre de navigation (64 px,
`DESIGN-SYSTEM.md` §5 bis), le mot ACADEMY devenait illisible. Le designer a livré une
**variante compacte** qui règle ce défaut — texte ACADEMY plus grand, interlettrage réduit,
emblème aux traits épaissis pour rester net en petite taille. Elle **complète** le kit grand
format, elle ne le remplace pas.

**Un seul endroit décide** (demande explicite du designer, pour éviter qu'une règle devienne
fausse à trois endroits sur quatre en deux mois) : `apps/web/src/brandLogo.js` est la seule
source de vérité pour le choix de fichier. `platform/Brand.jsx` (thème dynamique) et
`admin/AdminLogin.jsx`/`admin/AdminApp.jsx` (thème toujours « light », `/admin` n'a pas de
bascule) appellent tous deux la même fonction — jamais un `<img>` avec sa propre condition
dispersée dans un composant.

**Seuils** (exprimés en hauteur de rendu *voulue*, jamais mesurée au runtime — ça provoquerait
un changement d'image visible après le premier rendu et dégraderait le CLS) :

| Hauteur de rendu | Fichier | Largeur affichée |
|---|---|---|
| ≥ 150 px | Grand format du kit (`logo-pour-fond-…-transparent.svg`) | ≥ 400 px |
| 32 – 150 px | Compacte (`compact/logo-compact-fond-…-transparent.svg`) | 120 – 570 px |
| < 32 px | Emblème seul (`compact/embleme-petites-tailles-fond-….svg`) | < 120 px |

**Barre de navigation : 40 px de haut, partout** (valeur donnée par le designer) — la compacte
y affiche 152 px de large, confortable dans les 64 px de hauteur de barre. Plus de palier mobile
séparé (l'ancien 36 px du grand format n'est plus nécessaire). Repli supplémentaire, en CSS pur
via `<picture>` (jamais en JS) : sous 340 px de large de barre — téléphone nettement plus étroit
que les 390 px habituellement vérifiés sur ce projet —, l'emblème seul remplace la compacte.

**Couleur d'ACADEMY, différente du grand format** (déjà dans les fichiers fournis, rien à faire
côté code) : orange `#FC8C5E` sur fond sombre (8,5:1) ; sur fond clair, l'orange `#E8703F` ne
fait que 2,9:1 à cette taille réduite, donc ACADEMY passe en **turquoise profond `#0E7385`**
(5,1:1 sur `#F2F7FF`) — une teinte déjà présente dans le dégradé d'ORIONIS de la version claire.
L'orange grand format, lui, ne change pas.

**N'est pas touché par cette passe, et c'est délibéré** : l'attestation PDF (grand format,
logo déjà embarqué en base64), le favicon, l'image de partage Open Graph, la palette
`--cyan`/`--coral` de `DESIGN-SYSTEM.md`.

---

## Interdits permanents

Photos de banque d'images posées · illustrations vectorielles « start-up » · dégradés
violet-orange de page de vente · ombres portées marquées · emojis dans l'interface · icônes
rondes colorées pour chaque type de contenu · majuscules sur plus de trois mots · tout code
propriétaire Amadeus utilisé comme élément d'interface.

---

## Test final

Montre une capture sans le nom. La personne doit pouvoir dire : **« c'est sérieux, c'est
moderne, et ça parle de voyage ou d'aviation »**. Si elle dit « c'est un site de formation
comme un autre », c'est raté.
