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

/* Accents — trois rôles distincts, jamais interchangeables */
--cyan           #22D3EE   /* technologie, instruments : actions principales, liens */
--coral          #FF8A5B   /* humain, chaleur : titres de section, relation client */
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
qui dit **quoi faire** (« le mot de passe doit faire au moins 8 caractères », pas
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
