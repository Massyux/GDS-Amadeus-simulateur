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
| A2 | Le **terminal en démonstration animée** y est visible sans défiler | capture d'écran | ✅ Fait — hero, capturé à 1280 et 390 |
| A3 | Le nom du produit et son identité (curseur monospace) sont partout | toutes les pages | ✅ Fait — `Brand.jsx` sur toutes les pages, y compris écran de connexion |
| A4 | Photo et nom réels du formateur sur l'accueil | visuel | ⏳ Partiel — nom réel (Massinissa Mehdani) ; la photo reste un placeholder texte « photo réelle à insérer », Massy doit fournir le fichier |
| A5 | Prix affiché en clair, sans « nous contacter » | visuel | ✅ Fait — 5/6 formations démo avec prix en DA, la 6ᵉ porte juste « bientôt » (pas de prix caché) |
| A6 | Contact réel + mentions + disclaimer de non-affiliation accessibles | pied de page | ⏳ Partiel — disclaimer réel et complet ; les liens « Contact »/« Conditions »/« Remboursement » sont des ancres `#` sans page derrière (hors périmètre de cette étape) |
| A7 | Zéro photo de banque d'images sur tout le site | revue visuelle | ✅ Fait — vignettes SVG dessinées à la main (`CourseVignette.jsx`), zéro `<img>` |
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
| E1 | Aucun écran vide à plus de 50 % | capture de chaque page | ⏳ Partiel — vrai pour tous les écrans sauf le catalogue (une seule vraie formation en base aujourd'hui, donc beaucoup de vide) : conséquence du contenu actuel, pas un défaut de mise en page |
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
| G1 | Tous les écrans vérifiés à **390 px** et 1280 px | captures des deux | ✅ Fait — captures prises aux deux tailles pour chaque écran touché |
| G2 | Zones cliquables ≥ 44 × 44 px en mobile | revue | ✅ Fait — boutons/liens au gabarit `.pf-btn` existant, déjà dimensionné pour ça |
| G3 | Leçons simulateur/exercice : message clair sur mobile | test mobile | ✅ Fait a minima (texte `comingInStep3`) — expérience complète = Étape 3 |
| G4 | Théorie, vidéo, PDF, quiz pleinement utilisables sur mobile | test mobile | ✅ Fait pour texte/vidéo/PDF (layout responsive vérifié) ; quiz n'existe pas encore (Mission 24) |

## H. Performance et finition (DS §6-7)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| H1 | LCP < 2,0 s / CLS < 0,05 / INP < 200 ms | mesure réelle | ⏳ Non mesuré en conditions réelles (pas d'outil Lighthouse/CrUX disponible dans cet environnement) ; architecture compatible (code-splitting, squelettes, animations transform/opacity uniquement) |
| H2 | JS plateforme < 180 Ko gzip, CSS < 25 Ko | sortie de build | ✅ Fait — JS total homepage ≈ 105 Ko gzip, CSS total ≈ 6,2 Ko gzip |
| H3 | Simulateur et exercices chargés à la demande | analyse du bundle | ⏳ Partiel — `HomePage`/`PlatformApp`/`StyleguidePage` sont bien `lazy()` ; `App`/`AdminApp` (simulateur, admin) restent importés en dur dans `main.jsx` depuis des missions antérieures, donc présents dans le chunk partagé même pour un visiteur qui ne les utilise jamais. Pas introduit par cette étape, budget global toujours respecté, mais optimisation à faire une prochaine fois |
| H4 | Aucun saut de mise en page au chargement | observation | ✅ Fait — `Skeleton` aux dimensions finales partout où un chargement réseau est visible |
| H5 | `prefers-reduced-motion` respecté | test | ✅ Fait — bloc dédié dans `platform.css`, couvre aussi `.pf-termwrap` |

## I. Honnêteté (DP §5)

| # | Exigence | Vérification | Statut |
|---|---|---|---|
| I1 | Aucun faux témoignage, faux compteur, fausse rareté | revue du contenu | ✅ Fait — KPIs de l'accueil (6 formations, 40+ commandes, accès à vie) sont des faits vérifiables, pas des compteurs fictifs |
| I2 | Aucune promesse d'embauche ni de « certification officielle » | revue du contenu | ✅ Fait |
| I3 | Section témoignages masquée tant qu'il n'y en a pas de vrais | visuel | — N/A — aucune section témoignages n'existe sur cet accueil (rien à masquer) |

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

## Procédure de clôture d'étape (obligatoire)

À la fin de chaque étape de la MISSION-23 :

1. Parcourir ce document et cocher les exigences concernées par l'étape.
2. Joindre au rapport **les captures d'écran à 1280 px et 390 px** de chaque écran touché.
3. Lister explicitement les exigences **non encore satisfaites** et dans quelle étape elles
   le seront. Une exigence oubliée en silence est un manquement, pas un oubli.
4. Les suites de tests vertes ne remplacent **jamais** cette revue : elles ne disent rien de
   ce que voit un utilisateur.
