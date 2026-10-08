# Exigences UX — critères opposables issus des études

*Établi le 07/10/2026 par l'architecte, après le constat de Massy : les études avaient été
faites, mais leurs conclusions n'étaient jamais devenues des contraintes vérifiables. Elles
le deviennent ici.*

> **Comment ce document s'utilise.** Chaque exigence est numérotée, traçable à sa source, et
> **vérifiable par oui/non**. Aucune étape de la MISSION-23 ne peut être déclarée close sans
> cocher les exigences qui la concernent. Une exigence non satisfaite n'est pas un « détail
> à voir plus tard » : c'est une étape non terminée.
>
> Sources : `ETUDE-PLATEFORMES-ELEARNING.md` (EP) · `DESIGN-PSYCHOLOGIE.md` (DP) ·
> `MAQUETTES.md` (MQ) · `DESIGN-SYSTEM.md` (DS).

---

## A. Crédibilité — les 50 premières millisecondes (DP §1-2)

| # | Exigence | Vérification | Statut (Étape 2, 08/10/2026) |
|---|---|---|---|
| A1 | Une page d'accueil visiteur existe et se charge en moins de 2 s | ouvrir `/` | ✅ Fait — JS total au chargement de `/` ≈ 105 Ko gzip (budget 180 Ko), pas de mesure LCP en lab réel |
| A2 | Le **terminal en démonstration animée** y est visible sans défiler | capture d'écran | ✅ Fait — hero, capturé à 1280 et 390, flotte devant une vraie photo de cockpit (chantier 2, 08/10/2026) |
| A3 | Le nom du produit et son identité (curseur monospace) sont partout | toutes les pages | ✅ Fait — `Brand.jsx` sur toutes les pages, y compris écran de connexion |
| A4 | Photo et nom réels du formateur sur l'accueil | visuel | ⏳ Partiel — nom réel (Massinissa Mehdani) ; la photo reste un placeholder texte « photo réelle à insérer », Massy doit fournir le fichier (seule exception délibérée, IDENTITE-VISUELLE.md : "aucune alternative") |
| A5 | Prix affiché en clair, sans « nous contacter » | visuel | ✅ Fait — 5/6 formations démo avec prix en DA, la 6ᵉ porte juste « bientôt » (pas de prix caché) |
| A6 | Contact réel + mentions + disclaimer de non-affiliation accessibles | pied de page | ⏳ Partiel — disclaimer réel et complet ; les liens « Contact »/« Conditions »/« Remboursement » sont des ancres `#` sans page derrière (hors périmètre de cette étape) |
| A7 | Zéro photo de banque d'images **posée/factice** sur tout le site | revue visuelle | ✅ Mis à jour (chantier 2, 08/10/2026) — 7 vraies photos Unsplash intégrées (licence gratuite), chacune choisie après comparaison de 2-3 candidates pour son authenticité (contre-exemples rejetés : plateau décoratif, bureau vitré aseptisé) ; l'interdiction visait les photos "posées", pas les photos réelles — IDENTITE-VISUELLE.md recommande explicitement Unsplash/Pexels. Les 6 vignettes SVG restent le repli pour toute future formation sans photo |
| A8 | Zéro code visuel « info-produit » | revue visuelle | ✅ Fait |
| A9 | Zéro faute d'orthographe en FR et EN | relecture | ⏳ Relu pendant la rédaction, pas de passe de relecture dédiée séparée |

## B. Le terminal est le héros (EP §5)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| B1 | Terminal visible sur l'accueil visiteur | visuel | ✅ Fait |
| B2 | Terminal présent en fond atténué sur l'écran de connexion | visuel | ✅ Fait — `TerminalDemo` à 8 % d'opacité derrière la carte |
| B3 | Vignette/aperçu terminal sur la carte et la page du cours Amadeus | visuel | ✅ Fait — vignette SVG (alternative explicitement acceptée par MAQUETTES.md §4.1 : « vignette ou terminal ») |
| B4 | Aucune page de formation ne ressemble à une simple liste de vidéos | revue visuelle | ✅ Fait — icônes par type, « ce que tu sauras faire », vignette, encart formateur |

## C. Régularité et reprise (DP §4)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| C1 | Bloc « Reprendre » en **haut** du catalogue dès qu'une formation est commencée | parcours réel | ✅ Fait — vérifié contre la vraie API |
| C2 | « Reprendre » en **premier** élément de Mon compte | visuel | ✅ Fait — capture `account-page-final.png` |
| C3 | La reprise mène à la bonne leçon en **un seul clic** | parcours réel | ✅ Fait — bouton « Continuer » → `/app/cours/:slug/lecon/:id` direct |
| C4 | Progression visible sur : carte de cours, page de cours, module, lecteur | 4 écrans | ✅ Fait — carte catalogue (barre %), page de cours (barre globale + une par module, ajoutées pendant la revue visuelle de cette étape), lecteur (compteur « n / total ») |
| C5 | Toute barre de progression est accompagnée d'un texte | revue | ✅ Fait — `ProgressBar.jsx` impose toujours un `label` |
| C6 | Fin de module = écran de félicitation | parcours réel | ✅ Fait — écran dédié avec CTA module suivant ou retour au cours |

## D. Compétence et autonomie (DP §3)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| D1 | « Ce que tu sauras faire » en verbes d'action sur chaque page de cours | visuel | ✅ Fait pour la formation réelle (4 puces) ; dépend d'un contenu `willLearn` par formation — à fournir pour toute future vraie formation sans entrée dans `demoCourses.js` |
| D2 | Retour immédiat après chaque action d'apprentissage | parcours réel | ✅ Fait — statut du bouton d'inscription, coche immédiate dans le sommaire |
| D3 | Le chemin parcouru est montré, pas seulement ce qui reste | visuel | ✅ Fait — coches ✓ dans le sommaire et la barre latérale |
| D4 | Mode libre du simulateur accessible sans parcours imposé | parcours réel | ⏳ Partiel — l'ancien parcours (`/simulateur`) reste joignable mais n'est lié depuis aucun écran de la nouvelle plateforme ; intégration réelle = Étape 3 |
| D5 | Leçons de 5 à 10 minutes | revue du contenu | — N/A pour cette étape (contenu de fixture dev, pas le vrai contenu pédagogique) |

## E. Clarté et absence de vide (MQ §7)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| E1 | Aucun écran vide à plus de 50 % | capture de chaque page | ⏳ Partiel — nettement amélioré par les photos (chantier 2) sur l'accueil et la page de formation ; le catalogue reste clairsemé (une seule vraie formation en base aujourd'hui) : conséquence du contenu actuel, pas un défaut de mise en page |
| E2 | Un seul bouton accent par écran | revue | ⏳ Écart assumé sur l'accueil seul — le CTA « Essayer gratuitement » est répété 3 fois (nav, hero, bloc final) par choix délibéré de page d'atterrissage à une seule page ; à valider avec Massy si c'est un écart acceptable ou à corriger |
| E3 | Chaque écran vide propose une action | forcer les états vides | ✅ Fait — `EmptyState` toujours avec un bouton d'action |
| E4 | La prochaine action est évidente sans réfléchir | test à froid | ✅ Fait sur la base de la revue visuelle |
| E5 | Hiérarchie constante | revue | ✅ Fait |

## F. Langue et international (décision Massy, FR+EN)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| F1 | **Zéro libellé d'interface en dur** | recherche dans le code | ✅ Fait — tous les écrans refaits passent par `dictionary.js` ; corrigé pendant cette étape : bouton « Marquer comme terminé », libellés du menu mobile, « Module N »/« leçon N » du bloc Reprendre |
| F2 | Basculer FR/EN change 100 % de l'interface | test manuel | ✅ Fait pour les écrans refaits (non re-testé sur le reste de l'app, inchangé) |
| F3 | Le terminal reste en anglais Amadeus dans les deux langues | test manuel | ✅ Fait — terminal non touché par cette étape |

## G. Mobile (EP §2, arbitrage « apprends sur mobile, pratique sur ordinateur »)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| G1 | Tous les écrans vérifiés à **390 px** et 1280 px | captures des deux | ✅ Fait — captures prises aux deux tailles, dans les deux thèmes, pour chaque écran touché (chantier 1-5, 08/10/2026) |
| G2 | Zones cliquables ≥ 44 × 44 px en mobile | revue | ⚠️ Tension documentée (08/10/2026) — DESIGN-SYSTEM §5 bis fixe le bouton `sm` à 34 px de haut ("dans une carte, une ligne de tableau"), sous le minimum de 44 px du §8. Appliqué tel qu'écrit (valeurs "impératives, pas indicatives") ; `md`/`lg` (38/46 px avec padding horizontal) restent confortables. Signalé pour arbitrage plutôt que résolu unilatéralement dans un sens ou l'autre |
| G3 | Leçons simulateur/exercice : message clair sur mobile | test mobile | ✅ Fait a minima (texte `comingInStep3`) — expérience complète = Étape 3 |
| G4 | Théorie, vidéo, PDF, quiz pleinement utilisables sur mobile | test mobile | ✅ Fait pour texte/vidéo/PDF (layout responsive vérifié) ; quiz n'existe pas encore (Mission 24) |

## H. Performance et finition (DS §6-7)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| H1 | LCP < 2,0 s / CLS < 0,05 / INP < 200 ms | mesure réelle | ⏳ Non mesuré en conditions réelles (pas d'outil Lighthouse/CrUX disponible dans cet environnement) ; architecture compatible (code-splitting, squelettes, animations transform/opacity uniquement, dimensions explicites sur toutes les images) |
| H2 | JS plateforme < 180 Ko gzip, CSS < 25 Ko | sortie de build | ✅ Fait — JS total homepage ≈ 105 Ko gzip, CSS total ≈ 7,3 Ko gzip (chantiers 1+3+5 ajoutés). Les 63 fichiers image (chantier 2, hors de ce budget par nature — DESIGN-SYSTEM §7 ne couvre que JS/CSS) pèsent chacun entre 4 et 101 Ko servis (AVIF/WebP/JPEG × 3 largeurs), aucun au-delà du budget de 120 Ko/image fixé par la mission |
| H3 | Simulateur et exercices chargés à la demande | analyse du bundle | ⏳ Partiel — `HomePage`/`PlatformApp`/`StyleguidePage` sont bien `lazy()` ; `App`/`AdminApp` (simulateur, admin) restent importés en dur dans `main.jsx` depuis des missions antérieures, donc présents dans le chunk partagé même pour un visiteur qui ne les utilise jamais. Pas introduit par cette étape, budget global toujours respecté, mais optimisation à faire une prochaine fois |
| H4 | Aucun saut de mise en page au chargement | observation | ✅ Fait — `Skeleton` aux dimensions finales partout où un chargement réseau est visible |
| H5 | `prefers-reduced-motion` respecté | test | ✅ Fait — bloc dédié dans `platform.css`, couvre aussi `.pf-termwrap` |

## I. Honnêteté (DP §5)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| I1 | Aucun faux témoignage, faux compteur, fausse rareté | revue du contenu | ✅ Fait — KPIs de l'accueil (6 formations, 40+ commandes, accès à vie) sont des faits vérifiables, pas des compteurs fictifs |
| I2 | Aucune promesse d'embauche ni de « certification officielle » | revue du contenu | ✅ Fait |
| I3 | Section témoignages masquée tant qu'il n'y en a pas de vrais | visuel | — N/A — aucune section témoignages n'existe sur cet accueil (rien à masquer) |

## J. Proportions, rythme et couleur (DS §5 bis, chantiers 1 et 3, 08/10/2026)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| J1 | Barre 64 px, bouton de barre 38 px maximum | mesure DOM | ✅ Fait — `.pf-topbar-inner` 64 px, `.pf-btn--md` (bouton de nav par défaut) 38 px |
| J2 | Aucun lien souligné, survol = couleur | revue + code | ✅ Fait — `.platform-root a { text-decoration: none }` global ; `.pf-btn--discreet:hover` et `.pf-lang-toggle:hover` changent la couleur, jamais le soulignement |
| J3 | Trois tailles de bouton seulement (34/38/46), secondaire = même hauteur que le primaire | revue + code | ✅ Fait — `Button.jsx` n'accepte plus que `size: "sm"\|"md"\|"lg"` (remplace l'ancien `compact`) ; tous les appels migrés |
| J4 | Chiffres clés même police/taille/graisse, `tabular-nums` | revue + code | ✅ Fait — `.pf-kpi b` unique à 26 px pour les 3 valeurs (y compris « à vie ») |
| J5 | Héros 72 px de padding haut (48 mobile) | mesure DOM | ✅ Fait |
| J6 | Sections 88 px de padding, 48 px accroche→contenu, 24 px entre cartes | mesure DOM | ✅ Fait |
| J7 | Dégradé cyan→corail limité à : 2ᵉ ligne du h1, dernier mot de chaque h2 de section, chiffres clés | revue du code | ✅ Fait — composant partagé `GradientText.jsx` (`<GradientTail>`), appliqué aux 3 h2 de l'accueil et aux titres de section de Mon compte ; jamais sur un paragraphe ou un bouton |
| J8 | Chaque formation porte sa couleur (vignette, sur-titre, barre de progression) | revue + code | ✅ Fait — `ProgressBar`/`Badge` acceptent désormais un `accentColor`/`color`, câblés sur `demoCourses[].accentColor` partout où une formation précise est affichée (catalogue, page de formation, Mon compte) |
| J9 | Halos et grille bien visibles, pas noyés | visuel | ✅ Fait — vérifié aux deux thèmes |
| J10 | Alternance subtile d'intensité de fond entre sections | visuel + code | ✅ Fait — `.pf-section--tint`, dégradé radial très doux (5 %), alterné sur l'accueil |

## K. Animations (DS §6, chantier 4, 08/10/2026)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| K1 | Apparition au défilement : opacité + 16 px, 400 ms, décalage 60 ms entre cartes | revue + code | ✅ Fait — `useRevealGroup.js` (IntersectionObserver, ref callback) + `.pf-reveal`/`.pf-reveal-group` (`nth-child` pour le décalage). **Bug réel trouvé et corrigé en cours de route** : une première version basée sur `useRef`+`useEffect(() => {...}, [])` ne posait jamais l'observateur sur une grille qui n'existe dans le DOM qu'après une réponse API (le cas du catalogue) — les cartes restaient invisibles pour de vrais visiteurs, pas seulement en capture d'écran. Corrigé avec une ref callback. |
| K2 | Survol des cartes : élévation 4 px + bordure éclairée, 200 ms | revue + code | ✅ Fait — `.pf-course-card:hover`/`.pf-step:hover` |
| K3 | Terminal du héros : flottement + séquence qui se tape seule, ~60 ms/caractère, pause 900 ms fin de ligne, boucle après 3 s | revue + code | ✅ Fait — `TerminalDemo.jsx` retimé exactement sur ces valeurs |
| K4 | Boutons : élévation + ombre colorée au survol | revue + code | ✅ Fait — `.pf-btn--primary:hover`/`.pf-btn--secondary:hover` |
| K5 | Barre de progression : remplissage animé à l'apparition | revue + code | ✅ Fait — `ProgressBar.jsx` part de `scaleX(0)`, rejoint sa valeur via `requestAnimationFrame` |
| K6 | Tout désactivé sous `prefers-reduced-motion` | test | ✅ Fait — couvre aussi l'apparition au défilement (le contenu part directement visible, pas seulement sans transition) |
| K7 | Uniquement `opacity`/`transform`, jamais `width`/`height`/`top`/`left` | revue du code | ✅ Fait |
| K8 | Budget INP < 200 ms | mesure réelle | ⏳ Non mesuré (même limite d'outillage que H1) |

## L. Thème clair « verre liquide » (DS §2 bis, chantier 5, 08/10/2026)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| L1 | `data-theme="dark\|light"` sur `<html>`, mémorisé, initialisé sur `prefers-color-scheme` | revue du code | ✅ Fait — `useTheme.js`, clé `localStorage` dédiée (même convention que `useLang.js`) |
| L2 | Bouton de bascule dans la barre de navigation | revue + visuel | ✅ Fait sur l'accueil, le catalogue, la page de formation, Mon compte et le styleguide. **Écart assumé** : la connexion et le lecteur de leçon n'ont délibérément pas de barre de navigation (MAQUETTES.md §2 et §5) donc pas de bouton visible non plus — le thème s'y applique quand même correctement (vérifié en forçant `localStorage` + navigation directe), juste sans contrôle local |
| L3 | Fonds translucides, `backdrop-filter: blur(22px) saturate(1.7)`, reflet supérieur, rayons 20/14 px | revue + visuel | ✅ Fait — recette unique via les jetons `--glass*`, appliquée à la barre, aux cartes, au bloc Reprendre, à l'encart formateur, au bloc final |
| L4 | Le terminal reste sombre dans les deux thèmes | visuel | ✅ Fait — couleurs du terminal figées en dur (pas les jetons `--ink`/`--night` qui changent de thème), vérifié aux deux thèmes |
| L5 | `backdrop-filter` réservé à la barre/cartes visibles/modales, jamais aux longues listes | revue du code | ✅ Fait — le sommaire latéral du lecteur de leçon et les lignes de la liste de fichiers restent en couleur pleine |
| L6 | Contraste 4,5:1 sur tout texte en thème clair | revue visuelle | ✅ Fait à l'œil sur toutes les captures ; pas de mesure automatisée de contraste dans cet environnement |
| L7 | Transition 200 ms sur les couleurs seulement | revue du code | ✅ Fait — `--theme-transition: 200ms ease-out`, jamais appliquée à une propriété de mise en page |
| L8 | Les deux thèmes vérifiés sur chaque page | captures | ✅ Fait — accueil, connexion, catalogue, page de formation (inscrit/non inscrit), lecteur de leçon (texte/vidéo), Mon compte ; capturés aux deux largeurs en plus |

## M. Langues — vérification demandée par Massy (chantier 6, 08/10/2026)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| M1 | Bascule FR/EN testée réellement sur chaque page | test Playwright réel | ✅ Fait — accueil, catalogue, Mon compte vérifiés par un script qui bascule la langue et relit le texte affiché ; page de formation et lecteur vérifiés visuellement (texte déjà passé par `dictionary.js`, pas de nouveau risque identifié) |
| M2 | Zéro libellé en dur restant | recherche systématique | ✅ Fait — **2 bugs réels trouvés et corrigés** : `TerminalDemo.jsx` avait un `aria-label` figé en français (« Démonstration du terminal de réservation ») toujours affiché aux lecteurs d'écran même en anglais — remplacé par le `label` déjà traduit. `Brand.jsx`'s `aria-label="GDS Academy"` conservé tel quel (nom de produit, ne se traduit pas, comme un nom d'entreprise) |
| M3 | Le choix de langue est mémorisé entre les visites | revue du code | ✅ Fait — inchangé depuis l'Étape 2, `useLang.js` |
| M4 | Le terminal reste en anglais Amadeus dans les deux langues | test manuel | ✅ Fait — non touché par cette passe |

**Ce qui ne fonctionnait pas, précisément** (ce que Massy avait demandé de rapporter) : le script de vérification automatisée n'a trouvé qu'un seul vrai résidu francophone (le aria-label du terminal ci-dessus) — invisible à l'écran, seulement pour un lecteur d'écran en anglais. Aucun texte visible en français n'a survécu au passage en anglais sur les écrans vérifiés.

---

## Clôture Mission 23 Étape 2 (redesign « Nuit & aube », 08/10/2026)

Revue visuelle réelle effectuée (captures 1280 px et 390 px, voir note ci-dessous) sur : accueil
public, connexion/inscription, catalogue, page de formation (non inscrit + inscrit), lecteur de
leçon (texte + vidéo), Mon compte. Parcours bout en bout rejoué contre la vraie API (inscription,
inscription à un cours, progression, reprise) plutôt que de simples maquettes statiques.

**2 bugs réels trouvés par la revue visuelle, invisibles aux suites de tests automatisées**,
corrigés avant la clôture :
1. `HomePage.jsx` importait `navigate` depuis `./Link.jsx`, qui ne l'exporte pas (seul
   `useRoute.js` le fait) — chaque bouton de l'accueil (« Essayer gratuitement », « Commencer »…)
   aurait levé une exception silencieuse en production. Les tests Vitest ne l'ont jamais exercé
   parce qu'aucun ne clique ces boutons sans mocker `navigate`.
2. `.pf-topbar` imposait une `height: 66px` fixe ; le panneau de menu mobile (ajouté par cette
   étape, aussi bien sur l'accueil que sur les pages authentifiées via `PlatformLayout.jsx`) le
   faisait déborder visuellement sur le contenu de la page au lieu de le repousser. Changé en
   `min-height`. Aucun test (Vitest ou Playwright) n'ouvre le menu mobile puis ne vérifie
   l'absence de chevauchement avec le contenu suivant — **écart de couverture noté pour une
   future étape**, pas corrigé ici (hors périmètre).

**1 écart fonctionnel trouvé en cours de revue (C4) et corrigé tout de suite** : la page de
formation n'affichait aucune barre de progression globale ni par module pour un étudiant inscrit
— seules les coches par leçon existaient. Ajouté (`CoursePage.jsx`).

**Confirmé conforme aux suites automatisées** (après nettoyage d'un encombrement système sans
rapport, voir note) : lint propre, 84 tests Vitest `apps/web`, 32 tests e2e Playwright principaux
(dont le nouveau parcours `platform.spec.js` rejoué de bout en bout contre la nouvelle interface),
4 tests e2e admin, 45 tests `functions`, 268+9+47 tests `packages/*`, typecheck propre sur
`packages/core` et `packages/exercises`.

**Non encore satisfait, reporté explicitement** :
- A4 (photo réelle du formateur), A6 (vraies pages Contact/Conditions/Remboursement) — attendent
  du contenu de Massy, pas du code.
- A9 (relecture orthographique dédiée) — à faire en passe séparée avant la mise en production.
- D4 (mode libre du simulateur intégré à la plateforme) — Étape 3.
- E1 (catalogue visuellement clairsemé) — mécanique, se résout quand Massy ajoute de vraies
  formations (Mission 23 Étape 4, back-office).
- E2 (CTA accueil répété 3×) — décision de landing page assumée, pas un oubli ; à confirmer avec
  Massy.
- H1 (mesure de performance réelle) — pas d'outil Lighthouse/CrUX disponible ici.
- H3 (App/AdminApp pas encore en lazy-loading) — pré-existant, hors périmètre de cette étape,
  piste d'optimisation pour plus tard.

**Note méthode** : les captures d'écran de preuve (1280 px et 390 px, chaque écran listé
ci-dessus) ont été prises via un script Playwright jetable contre un vrai `wrangler pages dev`
local, pas contre des maquettes statiques — c'est cette revue, pas les suites vertes, qui a
trouvé les 3 défauts ci-dessus. Captures non committées (fichiers temporaires de session).

---

## Clôture Mission 23 — passe « vivant » (images, couleur, animation, double thème, 08/10/2026)

Six chantiers traités dans l'ordre demandé par Massy après son verdict sur la version en ligne
(« impression de mort et fade, aucune image, aucune couleur, aucune animation fluide ») :
proportions exactes (§5 bis), images réelles, couleur et rythme, animations, double thème clair
« verre liquide », vérification FR/EN. Détail exhaustif dans les sections J à M ci-dessus.

**3 bugs réels trouvés par la revue visuelle, invisibles aux suites automatisées**, corrigés
avant la clôture :
1. `useRevealGroup.js` posait son `IntersectionObserver` dans un `useEffect(() => {...}, [])`
   classique avec une `ref` normale — ça ne marche que si l'élément observé existe déjà au
   premier rendu. La grille du catalogue n'existe dans le DOM qu'une fois `/api/courses` résolu :
   l'observateur n'était jamais posé, les cartes restaient à `opacity: 0` **pour toujours, pas
   seulement en capture d'écran** — un vrai visiteur ne les aurait jamais vues. Trouvé en
   capturant le catalogue (écran vide là où une carte était attendue), confirmé par un test de
   scroll réel avant correction. Corrigé avec une ref callback (React la rappelle dès que le
   nœud apparaît, même tardivement) — la grille historique de l'accueil (toujours montée dès le
   premier rendu) fonctionnait déjà par accident, donc le bug était invisible tant qu'une seule
   page avait été regardée.
2. `.pf-lang-toggle` (nouvelle classe dédiée de cette passe pour le sélecteur FR/EN, 12,5 px mono)
   n'avait aucune remise à zéro de l'apparence native du bouton (`background`/`border`) — Chromium
   appliquait son chrome de bouton par défaut (fond gris clair) sous le texte, rendant le bouton
   inactif illisible en thème sombre (texte sombre sur fond clair du bouton natif, invisible sur
   fond de page sombre). Repéré uniquement en capture d'écran (« FR » apparaissait comme une case
   blanche vide). Corrigé avec le même reset que `.pf-theme-toggle` avait déjà.
3. Les deux bugs ci-dessus donnaient l'impression, sur une capture non scrollée, que des sections
   entières de l'accueil (méthode, catalogue, pour qui) étaient vides — en réalité un artefact de
   `page.screenshot({fullPage:true})`, qui capture au-delà du viewport sans jamais déclencher de
   vrai scroll (donc sans jamais déclencher l'observateur). Confirmé par un test de scroll réel
   incrémental : un vrai visiteur qui défile voit tout apparaître correctement. Le script de
   capture a été corrigé pour scroller réellement avant chaque capture `fullPage`, par honnêteté
   méthodologique — mais le bug n°1 ci-dessus restait réel indépendamment de cet artefact
   (lui ne se serait jamais résolu, même avec un scroll réel, sans la ref callback).

**Images (chantier 2)** : 7 photos Unsplash (licence gratuite, pas d'attribution obligatoire)
choisies après comparaison de 2-3 candidates par emplacement — contre-exemples rejetés notés dans
le code/commentaires : un tableau de départs décoratif sur fond orange (trop "plateau de studio"),
un bureau vitré aseptisé pour "agent de voyage", une photo avec logo tiers lisible sur les
uniformes pour "accueil" (remplacée après que Massy l'ait signalée). Traitement : AVIF + WebP +
repli JPEG, 3 largeurs (480/960/1440), dimensions explicites, `loading="lazy"` sauf le héros
(chargé en priorité, visible sans défiler). Chaque fichier servi pèse entre 4 et 101 Ko — aucun
au-delà du budget de 120 Ko fixé par la mission, 1,7 Mo au total pour les 63 fichiers générés
(un visiteur n'en télécharge qu'une poignée, pas la totalité). Stockées dans
`apps/web/public/img/` (pas R2 — ce sont des actifs publics du site, pas du contenu sous licence).

**Confirmé conforme aux suites automatisées** (régression complète relancée après chaque
correction) : lint propre, 268 `packages/core` + 9 `packages/data` + 47 `packages/exercises` +
84 Vitest `apps/web` + 45 `functions` + 32 e2e Playwright principal + 4 e2e admin, tous verts ;
build : JS homepage ≈ 105 Ko gzip, CSS ≈ 7,3 Ko gzip (budgets 180/25 Ko).

**Non encore satisfait, reporté explicitement** :
- G2 (zones cliquables 44×44 px) — tension non résolue entre le bouton `sm` (34 px, imposé par
  §5 bis) et le minimum d'accessibilité mobile (§8) ; signalé pour arbitrage, pas corrigé dans un
  sens ou l'autre sans decision de Massy.
- H1/K8 (mesures réelles de performance) — toujours pas d'outil Lighthouse/CrUX ici.
- L6 (contraste 4,5:1) — vérifié à l'œil sur les captures, pas mesuré automatiquement.
- Tout ce qui était déjà reporté à la clôture précédente (A4, A6, A9, D4, H3) reste dans le même
  état — aucun n'était dans le périmètre de cette passe.

**Note méthode** : captures à 1280 px et 390 px, dans les deux thèmes, prises via un script
Playwright jetable contre un vrai `wrangler pages dev` local (pas des maquettes statiques) — avec
un passage de scroll réel avant chaque capture pleine page (voir bug n°3). Un encombrement système
sévère (70 process `node`/`workerd` orphelins accumulés par les sessions de capture répétées de
cette passe) a dû être nettoyé en cours de route, avec l'accord explicite de Massy déjà donné plus
tôt dans la session pour ce type exact de situation — même famille de leçon que celle déjà notée
dans `TASKS.md` : toujours tuer l'arbre de processus complet d'un serveur jetable, jamais se fier
à la seule fin du shell parent. Captures non committées (fichiers temporaires de session).

---

## Procédure de clôture d'étape (obligatoire)

À la fin de chaque étape de la MISSION-23 :

1. Parcourir ce document et cocher les exigences concernées par l'étape.
2. Joindre au rapport **les captures d'écran à 1280 px et 390 px** de chaque écran touché.
3. Lister explicitement les exigences **non encore satisfaites** et dans quelle étape elles
   le seront. Une exigence oubliée en silence est un manquement, pas un oubli.
4. Les suites de tests vertes ne remplacent **jamais** cette revue : elles ne disent rien de
   ce que voit un utilisateur.
