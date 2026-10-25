# Système de design — plateforme de formation

*Figé le 06/10/2026 par l'architecte. **Ces valeurs ne sont pas des suggestions : ce sont les
décisions.** Claude Code les applique sans demander d'arbitrage. Toute question de couleur,
d'espacement, de police ou d'animation trouve sa réponse ici.*

Fondé sur `docs/DESIGN-PSYCHOLOGIE.md` (esthétique technique et sobre, jamais « info-produit »)
et `docs/ETUDE-PLATEFORMES-ELEARNING.md` (le terminal est le héros visuel).

---

## 1. Principe directeur

> **Un outil professionnel, pas une page de vente.**
> Sobre, dense en information utile, rapide. Le contenu et le terminal sont les seules
> choses colorées de l'écran ; l'interface, elle, s'efface.

Interdits permanents : dégradés multicolores, photos de banque d'images, emojis décoratifs
dans l'interface, texte en majuscules sur plus de 3 mots, ombres portées marquées, animations
qui attirent l'œil sans raison.

---

## 2. Couleurs (jeton → valeur)

Thème sombre par défaut (cohérent avec le terminal, repose les yeux en session longue).
Un thème clair peut venir plus tard ; **ne pas le construire maintenant**.

> **RÉVISION DU 07/10/2026 — palette « nuit & aube ».** La palette initiale (fond gris-bleu,
> accent vert) a été rejetée par Massy après maquette : trop froide, trop proche d'un
> terminal générique, et le vert ne pouvait pas servir une plateforme multi-formations.
> Nouvelle direction : **le vol de nuit vu du cockpit** — bleu nuit profond, cyan des
> instruments, corail du lever de soleil. Le vert ne subsiste **que dans le terminal**.
> Maquette de référence : `docs/maquettes/accueil.html`.
>
> **RÉVISION DU 12/10/2026 — alignement sur le logo officiel.** Massy a fait réaliser le
> logo d'Orionis Academy (kit fourni, voir `docs/IDENTITE-VISUELLE.md`) ; sa palette diffère
> légèrement de celle fixée ici (`--cyan` : `#22D3EE`→`#43C9D9`, `--coral` : `#FF8A5B`→`#FC8C5E`,
> écarts visibles côte à côte). **Décision de l'architecte : le logo fait référence** — c'est
> un objet vectorisé figé, on ne le repeint pas ; c'est cette palette qui s'aligne sur lui,
> jamais l'inverse. Valeurs mises à jour ci-dessous en conséquence. Le logo lui-même ne se
> recompose JAMAIS en texte/CSS — toujours le fichier fourni (`apps/web/src/platform/Brand.jsx`).

```
/* Fonds — nuit */
--night          #070B16   /* fond de page */
--night-2        #0C1222   /* cartes, panneaux */
--night-3        #141C33   /* survol, menus, modales */
--inset          #060A13   /* zone terminal, blocs de code */

/* Bordures : translucides, jamais opaques (profondeur) */
--line           rgba(168,182,212,.14)
--line-strong    rgba(168,182,212,.28)

/* Texte */
--ink            #F2F6FF
--ink-2          #A8B6D4
--ink-3          #6B7A9C
--ink-inverse    #04121A

/* Accents — trois rôles distincts, jamais interchangeables.
   --cyan/--coral alignés le 12/10/2026 sur le kit logo officiel (Massy) --
   voir RÉVISION ci-dessous. --mint correspond déjà exactement au vert du
   kit, aucun changement. */
--cyan           #43C9D9   /* technologie, instruments : actions principales, liens */
--coral          #FC8C5E   /* humain, chaleur : titres de section, relation client */
--violet         #8B7CF6   /* profondeur : illustrations, accents secondaires */
--mint           #34D399   /* UNIQUEMENT à l'intérieur du terminal */

/* États */
--success        #34D399
--warning        #FBBF24
--danger         #F87171
--info           #38BDF8
```

**Règles d'usage**
- **Un seul bouton `--cyan` par écran** (l'action principale). Les autres sont fantômes
  (fond translucide + bordure).
- `--coral` ne sert jamais à un bouton : c'est une couleur de **signalisation** (sur-titres,
  accents de texte, illustrations humaines).
- `--mint` est **interdit hors du terminal** — c'est ce qui garde au terminal son caractère.
- **Dégradés autorisés, mais seulement deux usages** : `cyan → bleu` sur le bouton principal,
  et `cyan → corail` sur les titres forts et les chiffres clés. Jamais sur un fond de page.
- **Couleur par formation** : chaque formation porte une teinte d'identification (vignette +
  sur-titre). La coquille du site, elle, reste neutre — c'est ce qui permet d'accueillir
  n'importe quelle formation sans que rien ne jure.

### Atmosphère (nouveau, obligatoire)
Trois halos radiaux flous en fond fixe (bleu nuit en haut à gauche, cyan à droite, corail
plus bas), plus une grille fine estompée en dégradé. C'est ce qui donne la profondeur et
distingue la plateforme d'un gabarit plat. Coût : zéro image, zéro requête réseau.

---

## 2 bis. Thème clair « verre liquide » (ajouté le 08/10/2026, demande de Massy)

Deux thèmes coexistent. Le sombre « nuit » reste le défaut. Le clair s'en inspire mais
bascule sur une esthétique **translucide, vive et lumineuse** — matière type goutte d'eau,
dans l'esprit des interfaces en verre d'Apple.

```
/* Fonds — aube */
--sky            #F2F7FF   /* fond de page */
--sky-tint-1     #DCEBFF   /* halo bleu ciel */
--sky-tint-2     #FFE4D6   /* halo pêche */
--sky-tint-3     #E8E2FF   /* halo lilas */

/* Verre : jamais une couleur pleine */
--glass          rgba(255,255,255,.68)
--glass-strong   rgba(255,255,255,.86)
--glass-border   rgba(255,255,255,.75)
--glass-inner    inset 0 1px 0 rgba(255,255,255,.92)   /* reflet supérieur */
--glass-shadow   0 10px 36px rgba(13,30,60,.10)

/* Lignes */
--line           rgba(13,30,60,.10)
--line-strong    rgba(13,30,60,.20)

/* Texte (contrastes vérifiés ≥ 4,5:1 sur verre à 68 %) */
--ink            #0A1733
--ink-2          #3D5075
--ink-3          #64789F

/* Accents — mêmes teintes, assombries pour rester lisibles sur fond clair.
   --cyan/--coral : valeurs "sur fond clair" fournies par le kit logo
   officiel (12/10/2026), pas une dérivation maison des teintes sombres. */
--cyan           #1593A8
--coral          #E8703F
--violet         #6D5BE0
```

**Recette du verre** (classe unique réutilisée partout) :
`background: var(--glass); backdrop-filter: blur(22px) saturate(1.7);
border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow), var(--glass-inner);
border-radius: 20px;`

**Contrastes vérifiés après la bascule du 12/10/2026** (calcul WCAG réel, pas une estimation) :
en thème sombre, `--cyan`/`--coral` restent très au-dessus du seuil AA sur `--night`
(≈ 9,9:1 et ≈ 8,5:1 — pratiquement inchangé par rapport aux anciennes valeurs). En thème
clair, le dégradé de texte `.pf-grad` (gros titres, chiffres clés) sur `--sky` était **déjà**
sous 4,5:1 avant cette bascule (≈ 2,9:1 pour les deux teintes) — **pas une régression
introduite ici** : le cyan s'améliore légèrement (≈ 3,4:1, passe le seuil 3:1 des gros
caractères) et le corail recule de façon négligeable (≈ 2,9:1→2,86:1). Teinte du logo non
touchée dans tous les cas (règle de l'architecte). Le bord de focus (`outline`/`border-color:
var(--cyan)`) passe désormais le seuil 3:1 des composants d'interface en thème clair, ce qui
n'était pas le cas avant. **Amélioration recommandée, pas corrigée dans cette passe** : le
contraste du dégradé `.pf-grad` en thème clair reste insuffisant pour du texte normal,
indépendamment du logo — à traiter séparément si Massy le juge prioritaire (voir `TASKS.md`).

**Règles impératives**
- ~~**Le terminal reste sombre dans les deux thèmes.**~~ **RÈGLE ERRONÉE, RETIRÉE le
  18/10/2026 par l'architecte, qui l'avait écrite.** Elle contredisait une décision
  antérieure et vérifiée : le terminal d'entraînement reproduit l'Amadeus Selling Platform
  réel, dont le fond est **bleu-gris clair** (`#dde5f4`, `apps/web/src/index.css`). Massy,
  qui utilise le vrai logiciel, a comparé les deux écran par écran le 05/07/2026 et n'a
  relevé **aucun écart** — voir `docs/FIDELITE-VISUELLE.md` et la Mission 04.
  **Le fond clair du terminal n'est donc pas un défaut : c'est le but.** Ne pas le
  « corriger ». La fidélité au vrai logiciel prime sur l'harmonie avec le thème du site,
  ici et partout ailleurs : c'est ce que l'élève retrouvera en agence.
  *(Cette règle avait été écrite pendant la phase de conception graphique sans relire
  `FIDELITE-VISUELLE.md`. Elle a produit un faux diagnostic de régression le 16/10/2026.)*
- **Rayons plus généreux en thème clair** : 20 px pour les cartes, 14 px pour les boutons —
  c'est ce qui donne l'effet « goutte ».
- **Reflet supérieur obligatoire** (`--glass-inner`) sur toute surface de verre : sans lui,
  c'est du blanc transparent, pas du verre.
- **Fond vivant** : trois halos radiaux doux (bleu ciel en haut à gauche, pêche à droite,
  lilas en bas) + grain très léger. Sans eux, le verre n'a rien à filtrer et paraît plat.
- **Contraste** : tout texte sur verre doit atteindre 4,5:1. En cas de doute, passer la
  surface à `--glass-strong` plutôt que d'assombrir le texte.

**Performance** : `backdrop-filter` est coûteux. Réservé à la barre de navigation, aux
cartes visibles sans défiler et aux modales. **Interdit** sur les longues listes et les
lignes de tableau — on y utilise `--glass-strong` en couleur pleine, sans flou.

**Bascule** : attribut `data-theme="dark|light"` sur `<html>`, mémorisé, initialisé sur
`prefers-color-scheme` à la première visite, bouton de bascule dans la barre de navigation.
Transition de 200 ms sur les couleurs seulement — jamais sur la mise en page.

## 3. Typographie

**Aucune police chargée depuis le réseau.** Décision de performance et de crédibilité :
pas de police qui change sous les yeux au chargement (c'est l'un des quatre signaux de
« site amateur » identifiés dans l'étude).

```
--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "Cascadia Mono", Consolas, "Liberation Mono", monospace;
```

`--font-mono` pour : terminal, commandes, codes GDS, badges techniques, numéros de licence.
`--font-sans` pour tout le reste.

**Échelle** (ratio 1.25, base 16 px) :

| Jeton | Taille | Usage |
|---|---|---|
| `--text-xs` | 12 px | mentions légales, métadonnées |
| `--text-sm` | 14 px | texte secondaire, libellés |
| `--text-base` | 16 px | corps de texte (jamais en dessous) |
| `--text-lg` | 20 px | sous-titres |
| `--text-xl` | 25 px | titres de section |
| `--text-2xl` | 31 px | titre de page |
| `--text-3xl` | 39 px | titre d'accueil |

Interlignage : 1.6 pour le corps, 1.2 pour les titres. Largeur de lecture : **65-75
caractères maximum** (`max-width: 68ch`) — au-delà, la lecture décroche.

---

## 4. Espacement, grille, rayons

Échelle de 4 px : `4, 8, 12, 16, 24, 32, 48, 64, 96`. **Aucune valeur hors échelle.**

- Largeur de contenu : `max-width: 1200px`, centrée, marge latérale 24 px (16 px en mobile)
- Points de rupture : `640` (mobile large), `768` (tablette), `1024` (ordinateur), `1280`
- Rayons : `--radius-sm 4px` (badges, champs) · `--radius-md 8px` (boutons, cartes) ·
  `--radius-lg 12px` (panneaux, modales)
- **Pas d'ombres portées.** La hiérarchie se fait par le fond (`--bg-surface` →
  `--bg-elevated`) et la bordure. Exception unique : les modales, ombre très douce.

---

## 5. Composants — règles non négociables

**Boutons** — hauteur 40 px (36 px en version compacte), padding `12px 20px`,
`--radius-md`, poids de police 500.
- *Primaire* : fond `--accent`, texte `--text-inverse`. **Un seul par écran.**
- *Secondaire* : fond transparent, bordure `--border-strong`, texte `--text-primary`
- *Discret* : texte seul, souligné au survol
- *Danger* : réservé aux suppressions, avec confirmation obligatoire

**Champs de saisie** — hauteur 40 px, fond `--bg-inset`, bordure `--border`, focus =
bordure `--accent` + anneau de 2 px. Message d'erreur **sous** le champ, en `--danger`,
qui dit **quoi faire** (« le mot de passe doit faire au moins 12 caractères », pas
« invalide »).

**Cartes** — fond `--bg-surface`, bordure `--border`, `--radius-lg`, padding 24 px.
Au survol : `--bg-elevated`, transition 150 ms. **Maximum 3 informations par carte.**

**Barre de progression** — hauteur 6 px, fond `--border`, remplissage `--accent`,
`--radius-sm`, toujours accompagnée d'un texte (« 7 / 12 leçons »). Jamais seule.

**Badges** — `--text-xs`, `--font-mono`, fond `--accent-subtle`, texte `--accent`,
`--radius-sm`, padding `4px 8px`.

**Navigation** — barre supérieure fixe, 56 px, fond `--bg-surface` avec bordure basse.
À gauche : logo + nom. À droite : progression rapide, avatar, menu. En mobile : menu
latéral coulissant.

**États vides** — jamais une page blanche : une icône discrète, une phrase, **un bouton
d'action**. (« Aucune formation en cours — Parcourir le catalogue »)

**Chargement** — squelettes gris aux dimensions finales, jamais de roue qui tourne au
centre d'une page vide. Objectif : zéro saut de mise en page.

---

## 5 bis. Proportions et rythme — valeurs exactes (ajouté le 08/10/2026)

*Massy a constaté des disproportions sur la première version en ligne : bouton de navigation
surdimensionné, liens soulignés, chiffres clés d'échelles différentes, vide excessif avant
le titre. Les valeurs ci-dessous sont **impératives**, pas indicatives. Appliquées à TOUTES
les pages, de haut en bas.*

### Barre de navigation
| Élément | Valeur |
|---|---|
| Hauteur de barre | **64 px** (fixe, sur toutes les pages) |
| Nom du produit | **17 px / 600**, mono, curseur de 8×16 px |
| Liens | **14,5 px / 450**, `--ink-2`, **`text-decoration:none` — jamais de soulignement**, survol = `--ink` |
| Écart entre liens | **26 px** |
| Bouton de la barre | **hauteur 38 px**, padding `0 18px`, **14 px / 600**, rayon 9 px |
| Sélecteur FR/EN | 12,5 px mono, `--ink-3`, actif en `--ink` |

**Règle** : aucun élément de la barre ne dépasse 38 px de haut. Un bouton de barre n'est
**jamais** à la même échelle qu'un bouton de page.

### Boutons — trois tailles, pas une de plus
| Taille | Hauteur | Padding | Police | Usage |
|---|---|---|---|---|
| `sm` | 34 px | `0 14px` | 13,5 px | dans une carte, une ligne de tableau |
| `md` | 38 px | `0 18px` | 14 px | barre de navigation, formulaires |
| `lg` | 46 px | `0 26px` | 15,5 px | action principale d'une page uniquement |

Le bouton secondaire a **exactement la même hauteur** que le primaire à côté de lui, et
**son libellé n'est jamais souligné**.

### Héros
| Élément | Valeur |
|---|---|
| Padding haut | **72 px** (48 px en mobile) — pas davantage |
| Pastille de sur-titre | hauteur 28 px, texte 11 px mono, padding `0 13px` |
| Espace pastille → titre | 20 px |
| `h1` | `clamp(34px, 4.6vw, 52px)`, interligne **1,06**, graisse 700 |
| Espace titre → accroche | 20 px |
| Accroche | 17 px, `max-width: 52ch` |
| Espace accroche → boutons | 30 px |
| Mention sous les boutons | 12,5 px mono, 14 px au-dessous |
| Colonne gauche | `max-width: 580px` |

### Chiffres clés — le défaut à corriger
Les trois valeurs doivent avoir **strictement la même échelle visuelle** : même police
(mono), **même taille (26 px)**, même graisse, même ligne de base, `tabular-nums`. Un mot
(« à vie ») ne doit jamais paraître plus gros qu'un chiffre. Libellés à 12,5 px, `--ink-3`.
Écart entre blocs : 38 px. Trait de séparation au-dessus : 1 px `--line`, marge 24 px.

### Rythme vertical des sections
| Élément | Valeur |
|---|---|
| Padding de section | **88 px** haut et bas (56 px en mobile) |
| Sur-titre → `h2` | 14 px |
| `h2` | **34 px**, interligne 1,14, graisse 700 |
| `h2` → accroche | 14 px |
| Accroche de section | 16,5 px, `max-width: 60ch` |
| Accroche → contenu | **48 px** |
| Écart entre cartes | 24 px |

### Cartes
Padding **24 px** partout. **Hauteur uniforme dans une même grille** (`align-items:
stretch`, contenu en colonne, `flex:1` sur la description). Titre 18,5 px, texte 14 px,
pied de carte séparé par 1 px `--line` avec 14 px de marge haute.

### Dégradés de titre — règle unique
Le dégradé `cyan → corail` (`linear-gradient(96deg, var(--cyan) 10%, var(--coral) 85%)`,
`background-clip:text`) s'applique à :
- la **deuxième ligne** du `h1` de l'accueil,
- le **dernier mot ou groupe de mots** de chaque `h2` de section,
- les **chiffres clés**.

Jamais sur un paragraphe, jamais sur un bouton, jamais sur plus de la moitié d'un titre.
C'est ce qui donne sa signature à l'ensemble — appliqué partout de la même façon, de la
page d'accueil au tableau de bord.

## 6. Mouvement

- Durée standard : **150 ms**, `ease-out`. Transitions de page : 250 ms maximum.
- Animés uniquement : opacité et `transform`. Jamais `width`, `height`, `top`, `left`.
- **`prefers-reduced-motion` respecté** : toutes les animations désactivées si le système
  le demande.
- Aucune animation d'attention (clignotement, rebond, pulsation) hors du curseur du terminal.

---

## 7. Budgets de performance (vérifiés, pas espérés)

Mesurés sur connexion 4G lente — la réalité algérienne, pas la fibre.

| Mesure | Budget |
|---|---|
| LCP (premier contenu utile) | **< 2,0 s** |
| CLS (saut de mise en page) | **< 0,05** |
| INP (réactivité) | **< 200 ms** |
| JS de la plateforme (gzip, hors simulateur) | **< 180 Ko** |
| CSS total (gzip) | **< 25 Ko** |

Règles qui en découlent, à appliquer dès le premier écran :
- Le **simulateur et le moteur d'exercices sont chargés à la demande** (`import()`
  dynamique), jamais dans le bundle d'accueil
- Images : format moderne, dimensions explicites (anti-CLS), chargement différé hors écran
- Aucune bibliothèque ajoutée sans justification écrite dans le commit. Pas de framework UI
  lourd : CSS maison avec les jetons ci-dessus.

---

## 8. Accessibilité (minimum obligatoire)

- Contraste : **4,5:1** pour le texte, 3:1 pour les éléments d'interface. Toutes les valeurs
  ci-dessus respectent ce seuil — ne pas les modifier sans revérifier.
- Tout est atteignable au **clavier**, avec un focus toujours visible (anneau `--accent`).
- Libellés réels sur les champs (pas de simple placeholder), `alt` sur les images utiles.
- Structure de titres cohérente (`h1` unique par page).
- Zones cliquables : **44 × 44 px minimum** en mobile.

---

## 9. Mobile (rappel de l'arbitrage)

Tout est parfait en mobile **sauf le simulateur et les exercices**, qui demandent un clavier.
Sur mobile, ces leçons affichent un message clair et élégant (« Cette leçon se pratique au
clavier — reprends-la sur ordinateur, ta progression est gardée ») plutôt qu'une expérience
dégradée. Le reste de la leçon (théorie, vidéo, PDF, quiz) reste accessible.
