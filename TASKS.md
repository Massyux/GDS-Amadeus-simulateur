# TASKS — Simulateur Amadeus GDS

> Tracker vivant exigé par `CLAUDE.md` §Méthode de travail (mis à jour à chaque session/mission).
> Classification des observations selon `CONSTITUTION.md` §5 : bug critique / incohérence
> fonctionnelle / amélioration recommandée / idée d'évolution.

## En cours

**Mission 23 (plateforme e-learning) — EN COURS, mode autonome (décision Massy 06/10/2026).**
Premier des trois chantiers restants (ordre choisi par Massy : 23 Plateforme → 22 Auto-licence
→ 21 Fidélité), 5-8 sessions estimées. Référence complète : `missions/MISSION-23.md` +
`docs/DESIGN-SYSTEM.md` (valeurs figées) + `docs/SECURITE.md` (exigences figées) +
`docs/DESIGN-PSYCHOLOGIE.md`/`docs/ETUDE-PLATEFORMES-ELEARNING.md` (le pourquoi). **Rien n'est
déployé en production** pendant tout le chantier (règle explicite du mode autonome) — la
production actuelle (simulateur + accès par clé) continue de fonctionner à l'identique.

**Étape 0, Étape 1 et Étape 2 (espace étudiant) CLOSES** — Étape 2 reprise en entier le
08/10/2026 sur une nouvelle direction artistique (« Nuit & aube », palette rejetée par Massy
après maquette), puis complétée le même jour par une passe « vivant » (images réelles, couleur,
animation, double thème clair) après le verdict de Massy sur la version en ligne ; voir les
entrées datées ci-dessous pour le détail complet des trois passes.
**Reprise exacte pour la suite** : Étape 3 (intégration du simulateur et des exercices comme
leçons du cours « Amadeus niveau 1 », déjà créé comme donnée par `scripts/seed-dev-course.sql` —
Étape 2 rend déjà les types `simulateur`/`exercice` par un message d'attente, c'est l'Étape 3 qui
branche le vrai terminal/moteur d'exercices dessus).
**Rappel production pour la clôture finale (Étape 5)** : trois choses à faire une fois, qui
n'existent qu'en local pour l'instant — `SESSION_SECRET` (env var Cloudflare Pages, comme
`ADMIN_SECRET_HASH`), le binding R2 réel (`wrangler.jsonc` n'a volontairement PAS été modifié,
voir l'entrée Étape 2 ci-dessous) une fois le bucket créé, et `migrations/0002_platform_users.sql`
appliqué en `--remote`.

**Mission 14 (espace admin + licences par poste) — CLOSE dans son ensemble, y compris l'Étape 3
(bascule production).** Architecture changée en cours de route par l'architecte (07/07/2026) :
Cloudflare D1 au lieu de Supabase — voir `missions/MISSION-14.md` §CHANGEMENT D'ARCHITECTURE.
L'Étape 3 (bascule production) a en réalité été faite et vérifiée le 28/07/2026 (commits
`ff6a652`, `40e8ed9`, `3b3398d`, `9430c9d` : `AccessGate.jsx` branché sur
`/api/license/activate`/`/api/license/check`, 2 bugs de déploiement corrigés, bug de trim sur la
phrase admin corrigé) — **cette section ne l'avait jamais enregistré**, ce qui a fait croire
pendant plus de 2 mois (jusqu'à l'audit de reprise du 05/10/2026) que l'Étape 3 restait à faire.
Reconfirmé vivant le 06/10/2026 après les 4 mois d'arrêt : l'architecte a vérifié que
`/api/license/check` répond bien en production. **Leçon tirée** : le rituel de clôture
(`missions/README.md` §Règles d'exécution point 3 : mettre à jour `TASKS.md`/`CLAUDE.md`/
`PROJECT_MEMORY` avant de considérer une étape terminée) n'avait pas été appliqué à la fin de la
session du 28/07/2026 — probablement parce que les commits de cette session-là corrigeaient des
bugs découverts après coup plutôt que de clore une étape planifiée à l'avance. À refaire
systématiquement même quand la session se termine sur des correctifs imprévus plutôt que sur le
plan initial.

**Mission 14 n'a plus aucun reliquat** : le seul qui restait (code mort
`verify-key.js`/`ACCESS_KEY_HASHES`/`VITE_FALLBACK_KEY_HASHES`, trouvé par l'audit du
05/10/2026) a été retiré le 06/10/2026 dans la même session — voir l'entrée datée ci-dessous pour
le détail complet (retrait du code mort, fix de la suite e2e admin, durcissement de
`admin/login.js`, `npm audit fix`).

**Reprise exacte** : Mission 08 (moteur d'exercices) est entièrement terminée (les 10 exercices
jouables de bout en bout, vérifiés en local ET en production). Aucune reprise en attente sur
cette mission. Prochaine mission après Mission 14 : **tranchée depuis — Mission 23 (ci-dessus),
puis 22, puis 21** (décision Massy 06/10/2026, voir `CLAUDE.md`) ; Mission 09
(quiz/notation/progression) devient Mission 24 dans cette nouvelle numérotation, Mission 10
(assistant IA) devient Mission 25 — les deux après Mission 23.

**Reprise exacte** : Partie A de Mission 07 est terminée côté code. La suite (Partie B) est une
checklist **opérationnelle pour Massy** (générer les clés, les configurer sur Cloudflare,
recruter 5-15 pilotes, consigner les retours dans `docs/PILOTE.md`) — pas une tâche Claude Code.
Prochaine session Claude Code : soit une correction de bug remontée par un pilote (boucle
corrective décrite dans `MISSION-07.md`, traiter immédiatement, protocole habituel), soit la
prochaine mission une fois le pilote conclu.

## À valider par Massy

> Section exigée par le mode autonome de Mission 23 (`missions/MISSION-23.md` §MODE AUTONOME,
> règle 2) : une question vraiment sans réponse dans `docs/DESIGN-SYSTEM.md`/`docs/SECURITE.md`
> est tranchée ici par la solution la plus simple et la plus réversible, consignée, et la session
> continue sans attendre. Rien ci-dessous ne bloque la suite — à revoir quand Massy a un moment.

- **Seuil de bascule menu mobile (Étape 0, 06/10/2026)** : DESIGN-SYSTEM §5 dit « navigation...
  en mobile, menu latéral coulissant » sans préciser à partir de quelle largeur. Choisi 768px
  (le point de rupture nommé « tablette ») plutôt que 640px : au-dessus de 768px, la nav
  horizontale a la place ; en dessous, le menu ☰. Un seul nombre à changer dans
  `apps/web/src/platform/styles/platform.css` (`@media (max-width: 767px)`) si Massy préfère
  640px.
- **Mécanique de confirmation du bouton danger (Étape 0, 06/10/2026)** : DESIGN-SYSTEM §5 exige
  une confirmation obligatoire sans dire comment. Choisi le plus simple et réversible : un
  deuxième clic sur le même bouton, qui change de libellé (« Supprimer » → « Confirmer la
  suppression ? »), pas une modale. Revenir à une modale plus tard ne changerait que l'intérieur
  de `apps/web/src/platform/ui/Button.jsx` (`variant="danger"` + `confirmLabel`), pas l'API vue
  par les futurs appelants (Étape 4, back-office).

## Fait (par session, datée)

### 08/10/2026 — Mission 23, passe « vivant » (images, couleur, animation, double thème, mode autonome)
Massy a vu la version en ligne de la refonte « Nuit & aube » (entrée précédente) et a jugé
l'ensemble « mort et fade : aucune image, aucune couleur, aucune animation fluide ». Six
chantiers traités dans l'ordre demandé, chacun détaillé avec son statut exigence par exigence
dans `docs/EXIGENCES-UX.md` §J-M et le bloc de clôture dédié en bas de ce même document (pas
dupliqué ici). Résumé :

- **Proportions exactes** (`docs/DESIGN-SYSTEM.md` §5 bis, nouveau ce jour, valeurs chiffrées
  par l'architecte après que Massy a signalé un bouton de nav surdimensionné, des liens
  soulignés, des chiffres clés d'échelles différentes) : barre 64px, 3 tailles de bouton
  seulement (34/38/46 — `Button.jsx` perd son ancien `compact` booléen pour un `size`
  explicite), zéro lien souligné (reset global `.platform-root a`), chiffres clés uniformes à
  26px mono, rythme vertical des héros/sections aux valeurs exactes données.
- **Images réelles** (le site était vide sans elles) : 7 photos Unsplash (licence gratuite),
  choisies après comparaison de 2-3 candidates par emplacement, présentées à Massy en planche de
  contact avant traitement final (une photo — « Accueil » — changée après qu'il ait signalé un
  logo tiers visible sur des uniformes). AVIF+WebP+repli JPEG, 3 largeurs, dimensions explicites,
  lazy sauf le héros. Aucun fichier servi au-delà de 120 Ko. Stockées dans `apps/web/public/img/`
  (décision : pas R2, ce sont des actifs publics, pas du contenu sous licence — écart volontaire
  par rapport à une note plus ancienne d'IDENTITE-VISUELLE.md qui suggérait R2, corrigée dans le
  doc lui-même).
- **Couleur et vie** : règle unique du dégradé cyan→corail (2ᵉ ligne du h1, dernier mot de
  chaque h2, chiffres clés) implémentée via un composant partagé `GradientText.jsx` plutôt que
  de dupliquer chaque titre en deux clés de dictionnaire par langue. Couleur d'identification par
  formation étendue à `Badge`/`ProgressBar` (nouveau prop `color`/`accentColor`). Alternance
  subtile de fond entre sections (`.pf-section--tint`).
- **Animations** : apparition au défilement (`useRevealGroup.js`, IntersectionObserver natif),
  terminal du héros retimé exactement sur le minutage demandé (60ms/caractère, pause 900ms,
  boucle après 3s), barre de progression animée à l'apparition, survols boutons/cartes avec
  élévation et ombre colorée.
- **Double thème clair « verre liquide »** (`docs/DESIGN-SYSTEM.md` §2 bis, nouveau ce jour) :
  `useTheme.js` (même convention que `useLang.js`), bouton de bascule dans la barre partout où
  il y a une barre, recette de verre unique (`--glass*`), le terminal reste figé en dur sur ses
  couleurs sombres (jamais les jetons qui changent de thème) pour ne jamais blanchir.
- **Vérification FR/EN** demandée explicitement par Massy : testée réellement par un script qui
  bascule la langue et relit le texte affiché, pas seulement une relecture du code.

**3 bugs réels trouvés par la revue visuelle, invisibles aux suites automatisées** (détail complet
et correctifs dans `docs/EXIGENCES-UX.md`, section de clôture dédiée) :
1. `useRevealGroup.js` posait son observateur via `useRef`+`useEffect(() => {}, [])` -- ne
   fonctionne que si l'élément existe déjà au premier rendu. La grille du catalogue n'existe
   qu'après la réponse de `/api/courses` : les cartes restaient invisibles **pour de vrais
   visiteurs**, pas seulement en capture. Corrigé avec une ref callback.
2. `.pf-lang-toggle` (nouvelle classe) n'avait aucun reset de bouton natif -- Chromium appliquait
   son chrome par défaut, rendant le bouton inactif illisible en thème sombre. Corrigé avec le
   même reset que `.pf-theme-toggle`.
3. Conséquence des deux bugs précédents : des sections entières de l'accueil semblaient vides sur
   une capture non scrollée. Diagnostiqué comme un artefact de `page.screenshot({fullPage:true})`
   (ne scrolle jamais réellement le viewport, donc ne déclenche jamais l'observateur) distinct du
   bug n°1 réel -- confirmé par un test de scroll incrémental réel avant de corriger le script de
   capture lui-même, par honnêteté méthodologique.

**Note d'hygiène de session, sans rapport avec le code produit** : les sessions répétées de
capture d'écran de cette passe ont de nouveau laissé des dizaines de processus `node`/`workerd`
orphelins s'accumuler (70 cette fois, contre une cinquantaine lors de l'épisode similaire de la
session précédente) au point de faire échouer/geler un run `test:functions`. Nettoyés avec
l'accord déjà donné explicitement par Massy pour ce type exact de situation plus tôt dans la
session -- même leçon déjà notée : toujours tuer l'arbre de processus complet d'un serveur
jetable, jamais se fier à la seule fin du shell parent.

**Tests** : aucun test automatisé nouveau pour les hooks `useTheme`/`useRevealGroup`/
`GradientText` eux-mêmes (comportement visuel, couvert par la revue d'écran plutôt que par des
assertions unitaires qui auraient dû mocker `matchMedia`/`IntersectionObserver` sans valeur
ajoutée réelle) ; le test existant de `ProgressBar` mis à jour pour attendre la frame d'animation
avant de lire `transform` (`platform-ui.test.jsx`). **Zéro régression** : 268 core / 9 data / 47
exercises / 84 web / 45 functions / 32 e2e principal / 4 e2e admin, lint propre. Build : JS
homepage ≈ 105 Ko gzip, CSS ≈ 7,3 Ko gzip (budgets 180/25 Ko, inchangés malgré l'ajout de tout ce
qui précède). Rien déployé en production.

**Reporté explicitement** (détail et justification dans `docs/EXIGENCES-UX.md`) : tension non
résolue entre le bouton `sm` (34px, imposé par §5 bis) et le minimum d'accessibilité mobile
44×44px (§8) -- signalé pour arbitrage de Massy, pas tranché unilatéralement. Mesure réelle de
performance (LCP/CLS/INP) et de contraste toujours hors de portée de cet environnement.

### 08/10/2026 — Mission 23 Étape 2, reprise (nouvelle direction artistique « Nuit & aube », mode autonome)
**Étape 2 reprise en entier et re-close.** Massy a rejeté la palette précédente (fond gris-bleu,
accent vert) après avoir vu une maquette. Nouvelle direction validée : palette « nuit & aube »
(bleu nuit profond, cyan instrument, corail aube — le vert ne survit que dans le terminal),
référence absolue `docs/maquettes/accueil.html`, régie par `docs/DESIGN-SYSTEM.md` §2 (réécrit),
`docs/IDENTITE-VISUELLE.md` (réécrit — rejette explicitement la précédente « grammaire de
terminal GDS » pour raison juridique/multi-formation), `docs/MAQUETTES.md` (composition
écran par écran) et `docs/EXIGENCES-UX.md` (50 exigences numérotées + procédure de clôture
obligatoire, nouveau document de l'architecte). Tout le visuel de l'Étape 2 (06/10/2026,
ci-dessous) a été refait sur cette direction ; le backend de cette étape (Functions, schéma D1)
n'a pas changé.

- **Jetons de design** (`apps/web/src/platform/styles/platform.css`, entièrement réécrit) :
  palette nuit & aube, atmosphère obligatoire (3 halos radiaux flous fixes + grille en filigrane
  + barre de navigation en verre dépoli), bouton primaire en dégradé cyan→bleu (un des deux seuls
  usages de dégradé autorisés par DESIGN-SYSTEM §2, l'autre étant cyan→corail sur les titres
  forts). Zéro image, zéro requête réseau pour l'atmosphère.
- **Nouvel accueil public `/`** (`HomePage.jsx`, remplace l'ancien onboarding du simulateur à
  cette route) : hero avec terminal flottant animé qui se tape seul en boucle (`TerminalDemo.jsx`,
  respecte `prefers-reduced-motion`), méthode en 3 étapes, catalogue de 6 formations avec vignette
  SVG par formation (`CourseVignette.jsx`, motifs dessinés à la main, jamais une photo de banque
  d'images), section « pour qui », encart formateur, CTA final, pied de page avec disclaimer.
  **Les 6 formations sont des données de démonstration** (`apps/web/src/platform/data/
  demoCourses.js`) que Massy retirera au lancement (seule « Réservation aérienne », la vraie
  formation Amadeus déjà en base, restera) — jamais codées en dur dans un composant.
  L'ancien parcours (Onboarding → AccessGate → Terminal, Mission 06) reste intact et testé,
  déplacé à `/simulateur` (jamais supprimé — le terminal doit rester joignable tant que l'Étape 3
  ne l'a pas intégré comme leçon de la vraie formation) ; 4 fichiers e2e historiques mis à jour
  pour pointer vers cette nouvelle URL, `security-headers.spec.js` volontairement laissé sur `/`
  (valide toujours, teste maintenant le nouvel accueil).
- **Catalogue, page de formation, lecteur de leçon et Mon compte refaits sur la même direction** :
  chaque formation garde sa couleur d'identification (vignette), la coquille reste neutre. Bloc
  « Reprendre » pleine largeur en haut du catalogue et en premier dans Mon compte dès qu'une
  formation est en cours (`Continuer — Module X, leçon Y`, calculé serveur — `/api/courses` et
  `/api/account` enrichis avec `nextModuleIndex`/`nextLessonIndexInModule`/`nextModuleTitle`/
  `nextLessonTitle`, libellé construit par un petit module partagé `resumeLabel.js` qui retombe
  sur un simple pourcentage si la position précise manque). Page de formation : en-tête à deux
  colonnes (texte + vignette), section « Ce que tu sauras faire » (4 puces en verbes d'action par
  formation démo, avant le sommaire — « c'est ce qui vend »), sommaire par module avec icône par
  type de leçon (`lessonTypeIcons.js`, glyphes simples, jamais d'emoji) et état (fait/en cours/
  verrouillé), encart formateur. Lecteur de leçon : barre fine (retour, titre, position « n/total »),
  sommaire latéral repliable (masqué sous 1024px), bouton unique « Marquer comme terminé et
  continuer » qui enchaîne directement sur la leçon suivante sauf en fin de module (écran de
  félicitation dédié avec CTA module suivant ou retour au cours). Écran de connexion : plus de
  barre de navigation (MAQUETTES.md §2), juste la marque au-dessus d'une carte centrée, terminal
  de démonstration atténué à 8 % en fond.
- **Bug de langue corrigé** (exigence explicite de Massy, F1 de EXIGENCES-UX.md) : plus aucun
  libellé d'interface en dur — libellés du menu mobile, bouton « Marquer comme terminé et
  continuer », « Module N »/« leçon N » du bloc Reprendre, tout passe maintenant par
  `dictionary.js`.
- **3 bugs réels trouvés par la revue visuelle** (captures Playwright à 1280px et 390px contre un
  vrai `wrangler pages dev` local, PAS par les suites automatisées — invisibles à toutes, par
  construction) :
  1. `HomePage.jsx` importait `navigate` depuis `./Link.jsx`, qui n'exporte que `Link`
     (`navigate` vit dans `useRoute.js`) — chaque bouton de l'accueil aurait levé une exception
     silencieuse en production. Corrigé.
  2. `.pf-topbar` imposait une `height: 66px` fixe ; le panneau de menu mobile (nouveau sur
     l'accueil, et sur toutes les pages authentifiées via `PlatformLayout.jsx`, qui partage la
     même classe CSS) débordait visuellement SUR le contenu suivant au lieu de le repousser.
     Changé en `min-height`. Même famille de bug sur les deux en-têtes (CONSTITUTION §3) — cherché
     et corrigé une seule fois, à la racine CSS partagée.
  3. (Trouvé pendant la revue, pas un bug visuel mais un écart fonctionnel C4 de
     EXIGENCES-UX.md) : la page de formation n'affichait aucune progression globale ni par
     module pour un étudiant déjà inscrit, seulement des coches par leçon. Ajouté (`ProgressBar`
     globale + une par module dans `CoursePage.jsx`).
- **1 bug pré-existant corrigé au passage, hors périmètre de cette étape mais trouvé en
  relançant la suite `functions` en régression** : `functions/__tests__/platform-api.test.js`
  vérifiait encore la présence du mot « Bienvenue » dans le corps markdown de la première leçon —
  devenu faux depuis la correction d'un doublon de titre affiché (Mission 23 Étape 2 du
  06/10/2026, déjà en place). Le test n'avait jamais été remis en cohérence avec le fixture.
  Corrigé (vérifie maintenant « Au programme », présent dans le corps réel).
- **Flakiness d'infrastructure de test corrigée** : `functions/__tests__/testServer.js` faisait
  parfois échouer son nettoyage en `EPERM` sur Windows (`rmSync` sur le dossier D1 temporaire
  juste après `taskkill` du process wrangler — le handle SQLite n'est pas toujours relâché
  instantanément). Ajouté une reprise avec court délai (5 tentatives, 200ms) — pas vu nécessiter
  plus de 2-3 essais en pratique. Sans lien avec le code produit, mais rendait la suite `functions`
  intermittente.
- **`docs/EXIGENCES-UX.md` rempli** (nouveau document de l'architecte, 50 exigences A1-I3 + bloc
  de clôture dédié) : détail complet des statuts par exigence et des écarts assumés/reportés dans
  le document lui-même plutôt que dupliqué ici. Résumé des reports explicites : photo réelle du
  formateur et vraies pages Contact/Conditions/Remboursement (attendent du contenu de Massy),
  relecture orthographique dédiée, mode libre du simulateur intégré (Étape 3), catalogue
  visuellement clairsemé (une seule vraie formation en base aujourd'hui — mécanique, se résout à
  l'Étape 4), répétition du CTA sur l'accueil (décision de landing page assumée, à confirmer avec
  Massy), mesure de performance réelle (pas d'outil Lighthouse/CrUX disponible dans cet
  environnement), `App`/`AdminApp` pas encore en `lazy()` dans `main.jsx` (pré-existant, piste
  d'optimisation).
- **Tests** : 2 nouveaux fichiers utilitaires sans test dédié séparé (`resumeLabel.js`,
  `lessonTypeIcons.js` — couverts indirectement par les tests de page existants) ; tests existants
  mis à jour pour la nouvelle marque/structure (`platform-ui.test.jsx` : « Simulateur Amadeus »
  → « GDS Academy », libellés de menu explicites) et le nouveau bouton unique du lecteur de leçon
  (`LessonPlayerPage.test.jsx` : plus de bouton « Suivant » séparé, nouveau test de fin de module
  et de passage direct à la leçon suivante) ; `platform.spec.js` (e2e) réécrit pour la nouvelle UI
  (navigation par le sommaire au lieu d'un bouton « Suivant », passage par la page de formation
  pour atteindre « Mon compte » depuis le lecteur). **Zéro régression** : 268 core / 9 data / 47
  exercises / 84 web / 45 functions / 32 e2e principal / 4 e2e admin, lint et typecheck propres.
  Build : JS total au premier chargement de l'accueil ≈ 105 Ko gzip, CSS total ≈ 6,2 Ko gzip
  (budget 180 Ko / 25 Ko). Rien déployé en production.
- **Note d'hygiène de session, sans rapport avec le code produit** : les sessions répétées de
  captures d'écran manuelles (serveurs `wrangler pages dev` jetables lancés en arrière-plan pour
  la revue visuelle) ont laissé une cinquantaine de processus `node`/`workerd` orphelins
  s'accumuler, ralentissant sévèrement la machine au point de faire échouer un run Vitest
  (workers incapables de démarrer, pas un vrai échec de test). Nettoyés avec l'accord explicite de
  Massy (ciblé par horodatage de démarrage, en excluant les processus antérieurs à la session).
  Confirme une leçon déjà notée ailleurs dans ce fichier : toujours tuer l'arbre de processus
  complet d'un serveur de test jetable, pas seulement s'appuyer sur la fin du shell parent.

### 06/10/2026 — Mission 23 Étape 2 (espace étudiant, mode autonome)
**Étape 2 CLOSE.** Premiers écrans réels de la plateforme : catalogue, page de formation,
inscription, lecteur de leçon (5 des 7 types -- `simulateur`/`exercice` affichent un message
d'attente, intégration réelle réservée à l'Étape 3 par `missions/MISSION-23.md` lui-même), « Mon
compte » avec reprise en un clic. Tout sous `/app`, chargé à la demande (`React.lazy`), jamais
dans le bundle visiteur par défaut.

- **8 nouvelles Functions** (`functions/api/courses/`, `functions/api/lessons/[id]/`,
  `functions/api/account/`, `functions/api/files/download.js`) : catalogue et détail de
  formation authentifiés (pas publics -- décision de simplicité, voir note plus bas), inscription
  libre et immédiate (aucun paiement n'existe encore, Mission 22), **404 identique que la leçon
  n'existe pas ou que l'appelant n'y soit pas inscrit** (jamais de distinction, même logique
  anti-énumération que l'Étape 1), marquage de progression `completed`/`in_progress` (score reste
  NULL, réservé à Mission 24).
- **URLs signées pour le contenu R2** (`functions/_lib/fileAccess.js`, docs/SECURITE.md §5) : pas
  de presigned URL S3 natif (aurait demandé des identifiants API R2 en plus du binding déjà
  suffisant pour tout le reste -- CONSTITUTION §8), un jeton HMAC (réutilise
  `functions/_lib/token.js`, `SESSION_SECRET`) vérifié et **re-vérifié** : une fois pour fabriquer
  le lien (`lessons/[id]/index.js`, au moment où l'inscription est déjà confirmée), une seconde
  fois au téléchargement (`files/download.js`) -- sans la seconde vérification, un lien déjà
  distribué resterait utilisable pendant ses 10 minutes même si l'inscription venait d'être
  retirée entre-temps. Testé explicitement (un jeton correctement signé mais dont
  l'utilisateur n'est pas inscrit est quand même rejeté).
- **R2 en local sans toucher `wrangler.jsonc`** : ce fichier est lu par Cloudflare Pages en
  production (incident déjà documenté pour le `database_id` D1) -- le bucket réel n'existe pas
  encore, y ajouter un binding maintenant aurait risqué la même panne de déploiement. Solution :
  `--r2 CONTENT` en CLI uniquement dans les commandes locales/test (`testServer.js`,
  `playwright.config.js`, README). **Découverte en testant** : `wrangler r2 object put` valide
  les noms de bucket selon les règles S3 réelles (minuscules) même en `--local`, alors que
  `--r2 CONTENT` (binding nu, sans `wrangler.jsonc`) garde la casse du binding comme espace de
  stockage local -- les deux ne se rejoignent jamais en passant par le CLI. Résolu par une route
  interne `functions/api/dev/seed-file.js` (même garde `MAIL_DEV_ECHO` que
  `reset-rate-limits.js`) qui écrit depuis l'intérieur du worker déjà démarré, donc forcément
  dans le même espace que celui que les Functions liront.
- **Fixture de développement** (`scripts/seed-dev-course.sql`, PAS une migration, jamais en
  production) : un cours "Amadeus — Niveau 1" avec les 5 types de leçon déjà jouables (texte,
  vidéo, live, pdf, fichier) -- rien d'autre ne peut créer de formation avant le back-office de
  l'Étape 4.
- **Rendu markdown allégé sans librairie** (`apps/web/src/platform/markdownLite.jsx`) :
  construit des éléments React directement depuis le texte, jamais de
  `dangerouslySetInnerHTML` -- aucune leçon ne peut injecter de script, même une fois le
  contenu modifiable sans relecture de code (Étape 4). `.ics` généré côté client sans
  dépendance (`apps/web/src/platform/ics.js`) pour "ajouter à mon agenda" (leçons live).
- **Bug trouvé par les tests avant tout commit** : `functions/api/lessons/[id]/index.js`
  appelait une fonction `notFound()` jamais définie dans ce fichier (faute de frappe/oubli en
  écrivant le fichier) -- invisible tant que le chemin d'erreur n'était pas exercé, détecté
  immédiatement par le premier test qui vérifie qu'un étudiant non inscrit ne peut pas lire une
  leçon (500 au lieu de 404). Corrigé avant tout commit.
- **Bug de CSP trouvé par relecture, confirmé par un test e2e dédié** : le lecteur de PDF affiche
  un `<iframe>` vers sa propre API (`/api/files/download`, même origine) ; la CSP de l'Étape 0
  avait `frame-src` sans `'self'` -- contrairement à `default-src`, `frame-src` n'hérite jamais
  implicitement du same-origin une fois défini explicitement. Aurait bloqué silencieusement
  l'aperçu PDF en production. Corrigé dans `_headers` et `docs/SECURITE.md` (avec la correction
  documentée) ; un test e2e vérifie maintenant l'absence d'erreur CSP en console en plus de la
  présence de l'iframe -- pas seulement que l'élément existe dans le DOM.
- **Décisions de simplicité, consignées ici plutôt qu'en "à valider"** (CONSTITUTION §8 couvre
  chacune, pas des questions sans réponse) : catalogue/page de formation réservés aux comptes
  connectés pour l'instant (pas publics -- DESIGN-PSYCHOLOGIE §6 en parle pour la page d'accueil
  marketing, hors périmètre explicite de cette étape) ; inscription gratuite et immédiate, le
  rattachement aux licences (`licenses.user_id`, reporté à l'Étape 1) et le paiement (Mission 22)
  viendront se greffer sur `enrollments` sans le refondre.
- **Tests** : 13 nouveaux tests d'intégration Functions (`functions/__tests__/platform-api.test.js`,
  vrai `wrangler pages dev` + D1 + R2 local), 17 nouveaux tests Vitest (AuthScreen, CataloguePage,
  LessonPlayerPage -- les 7 types de rendu, AccountPage), 2 nouveaux tests Playwright e2e
  (`apps/web/e2e/platform.spec.js` : parcours complet inscription→catalogue→cours→inscription→
  les 5 types de leçon→progression→compte→déconnexion→reconnexion avec progression conservée ;
  et visite déconnectée bloquée). **Zéro régression** : les 6 suites + les 3 e2e (principal,
  admin, et le nouveau) relancées en entier.
- **Checklist sécurité de fin d'étape** (docs/SECURITE.md §9) : `npm audit` -- 3 vulnérabilités
  hautes **nouvellement publiées** depuis la dernière vérification (CVE librsvg via
  sharp←miniflare←wrangler, devDependency, aucune exposition en production), pas de correctif
  disponible encore (`npm audit fix`/`--force` n'ont rien à proposer) -- suivi, pas forcé sans
  piste réelle ; aucun secret dans le bundle (vérifié) ; test prouvant qu'un étudiant non inscrit
  ne peut pas lire une leçon payante (ci-dessus) ; non-admin toujours bloqué sur `/api/admin/*`
  (suites Mission 14 inchangées) ; en-têtes de sécurité vérifiés servis, CSP corrigée.
- 268 core / 9 data / 47 exercises / **83 web (+17)** / **45 functions (+13)** / **32 e2e (+2)**
  / 4 e2e admin, lint et typecheck propres, build vérifié : chunk `/app` 4,59 Ko gzip (budget
  180 Ko). Rien déployé en production.

### 06/10/2026 — Mission 23 Étape 1 (modèle de données + authentification étudiant, mode autonome)
**Étape 1 CLOSE.** Aucun écran construit (voulu : "rien d'affiché encore", c'est l'Étape 2) --
uniquement le schéma D1 et les Functions d'authentification, testées de bout en bout contre un
vrai `wrangler pages dev` + D1.

- **Migration `migrations/0002_platform_users.sql`** (jamais touché `0001`) : `users`,
  `sessions`, `password_resets`, `rate_limit_attempts`, et déjà `courses`/`modules`/`lessons`/
  `enrollments`/`lesson_progress` (schéma complet de l'Architecture de MISSION-23.md, même si
  Étape 1 ne les utilise pas encore) — `lessons.type` inclut déjà `quiz`, `lesson_progress`
  inclut déjà `score`/`max_score`/`last_command` nullables : les 3 points d'extension à réserver
  pour les missions 24/25, demandés explicitement "dès l'étape 1".
  **Non fait ici, volontairement** : `licenses.user_id` (rattacher une licence à un compte). Un
  `ALTER TABLE ADD COLUMN` n'a pas d'équivalent `IF NOT EXISTS` en SQLite/D1 (contrairement à
  `CREATE TABLE`/`CREATE INDEX`) ; l'ajouter maintenant sans aucun code qui le consomme encore
  aurait cassé la ré-application idempotente du fichier avant chaque run local/CI. Reporté à
  l'étape où un étudiant active réellement une licence depuis son compte (2 ou 3), avec
  l'idempotence résolue dans le code qui l'exécute plutôt que dans le `.sql` lui-même.
- **Mots de passe** (`functions/_lib/passwordHash.js`) : PBKDF2-HMAC-SHA256, 600 000 itérations,
  sel 16 octets, format `pbkdf2$iterations$sel$hash` (durcissable sans casser les hachés
  existants). Liste locale de mots de passe courants refusés
  (`functions/_lib/commonPasswords.js`), aucune exigence de complexité absurde
  (`functions/_lib/validators.js`).
- **Sessions** (`functions/_lib/session.js`) : jeton signé HMAC (réutilise
  `functions/_lib/token.js`) contenant un id de session, **vérifié contre la table `sessions`**
  à chaque requête -- la signature prouve l'émission, la ligne en base prouve la validité
  actuelle (même distinction documentée dans `token.js`). C'est ce qui permet une révocation par
  appareil (logout d'un seul, les autres restent) que `ADMIN_SECRET_HASH`/rotation globale ne
  permettrait pas -- `SESSION_SECRET` est donc un secret dédié, pas une réutilisation de
  `ADMIN_SECRET_HASH`. Cookie `HttpOnly`+`SameSite=Strict`, `Secure` ajouté seulement si la
  requête est en https (sinon aucun test local/CI ne recevrait jamais le cookie, `wrangler pages
  dev` servant toujours en http). Fenêtre glissante de 7 jours, prolongée à chaque requête
  validée.
- **CSRF** (`functions/_lib/csrf.js`) : double-soumission dérivée (HMAC(sessionId,
  SESSION_SECRET)), exposée uniquement dans le corps JSON de `/api/auth/me` (jamais un cookie),
  à renvoyer dans l'en-tête `X-CSRF-Token`. Nécessaire ici (cookie = ambiant) alors que
  `/api/admin/*` n'en a jamais eu besoin (jeton porté manuellement, jamais ambiant).
- **6 Functions** : `register` (anti-énumération -- une collision d'e-mail renvoie EXACTEMENT la
  réponse `{ok:true}` d'un succès, sans jamais créer de session ni toucher au compte existant),
  `login` (anti-énumération -- e-mail inconnu et mot de passe faux renvoient le même message),
  `logout` (CSRF obligatoire, idempotent), `me` (session courante + jeton CSRF), `forgot-password`
  (toujours `{ok:true}`, jeton 32 octets stocké haché, jamais renvoyé en clair sauf
  `MAIL_DEV_ECHO=1`, jamais vrai en prod), `reset-password` (invalide toutes les sessions après
  coup, jeton à usage unique).
- **Correction trouvée en écrivant les tests, avant tout commit** (famille CONSTITUTION §3,
  pas après coup) : la limitation de débit devait être "neutre" (docs/SECURITE.md §3 : même
  réponse, jamais un code distinct) -- la première version renvoyait un 429 `RATE_LIMITED`
  dédié sur les 4 routes concernées, ce qui trahissait exactement la cause que la neutralité est
  censée cacher. Corrigé partout : au-delà du quota, chaque route renvoie sa réponse d'échec
  **habituelle** (login : message générique identifiants invalides ; register/forgot-password :
  le même `{ok:true}` qu'une collision ; activation de licence : `NOT_FOUND`).
- **Deuxième bug trouvé en relançant la suite e2e PRINCIPALE (pas une nouvelle) après ce
  changement** : ajouter la limite à `functions/api/license/activate.js` (nommément exigé par
  docs/SECURITE.md §3) a cassé 9 tests e2e existants (`exercises`/`onboarding`/`pilot`) --
  chaque test soumet la vraie clé fixture `GDS-TEST-0001` via le formulaire réel, et tous les
  appels locaux/tests partagent une même IP factice (`functions/_lib/rateLimit.js clientIp`),
  donc le quota explosait après ~5 tests. Pas un problème de test à contourner : un bucket par
  IP+clé ne freine d'ailleurs jamais un vrai attaquant qui change de clé à chaque essai (même
  angle mort que si "inscription" était bucketée par e-mail). Corrigé à la racine, pas en
  façade : la limite n'est plus comptée QUE sur un échec (clé inconnue/révoquée, le vrai signal
  de brute-force), jamais sur une réactivation légitime répétée d'une clé déjà correcte, et le
  bucket est par IP seule -- symétrique avec "inscription". Les deux suites e2e (30 + 4) sont
  repassées vertes après coup, pas juste les nouveaux tests.
- **Troisième bug trouvé en écrivant les tests d'intégration** : réinitialiser le compteur de
  débit entre deux tests en relançant `wrangler d1 execute` PENDANT qu'un `wrangler pages dev`
  sert déjà le même `--persist-to` provoque des `ECONNRESET` côté serveur (deux process sur le
  même fichier SQLite). Résolu par une route interne `functions/api/dev/reset-rate-limits.js`
  (nommée `dev/`, pas `_dev/` : Cloudflare exclut du routage tout ce qui est préfixé `_`, un
  `_dev/` ne répondrait jamais) qui passe par le binding D1 déjà ouvert du worker, inerte (404)
  tant que `MAIL_DEV_ECHO` n'est pas "1" -- jamais vrai en production.
- **12 tests d'intégration** (`functions/__tests__/auth-api.test.js`, contre un vrai `wrangler
  pages dev` + D1, même protocole que Mission 14) : les deux anti-énumérations avec comparaison
  stricte des réponses, le rate limit neutre jusqu'au 6ᵉ essai inclus, CSRF obligatoire sur
  logout avec invalidation réelle de la session, le cycle complet mot-de-passe-oublié→reset
  (ancien mot de passe mort, toutes les sessions tombent, jeton à usage unique), et la neutralité
  de la limite sur l'activation de licence (même famille, testée au même endroit).
- **Checklist sécurité de fin d'étape** (`docs/SECURITE.md` §9) : `npm audit` à 0 (aucune
  dépendance ajoutée -- Web Crypto natif uniquement) ; aucun secret (`SESSION_SECRET`,
  `MAIL_DEV_ECHO`, `ADMIN_SECRET_HASH`) dans le bundle client, vérifié par recherche dans
  `dist/assets/*.js` après build ; "un non-admin ne peut atteindre `/api/admin/*`" déjà couvert
  par les tests Mission 14 existants, toujours verts ; "un étudiant ne peut pas accéder à un
  cours non acheté" **sans objet à cette étape** (aucun cours/contenu n'existe encore) --
  s'applique à partir de l'Étape 2/3 ; en-têtes de sécurité toujours vérifiés servis (Étape 0).
- 268 core / 9 data / 47 exercises / 66 web / **32 functions (+13)** / 30 e2e / 4 e2e admin, lint
  et typecheck propres, build vérifié. Rien déployé en production.

### 06/10/2026 — Mission 23 Étape 0 (fondations visuelles + sécurité, mode autonome)
**Étape 0 CLOSE.** Socle posé pour les 5 étapes suivantes, sans toucher au métier existant
(terminal, onboarding, admin — tous vérifiés inchangés, voir suites ci-dessous).

- **Jetons CSS** (`apps/web/src/platform/styles/platform.css`) : toutes les valeurs de
  `docs/DESIGN-SYSTEM.md` §2-4/6/7 (couleurs, typo, échelle d'espacement 4px, rayons, durées de
  transition) copiées telles quelles en variables CSS, **scopées sous `.platform-root`** plutôt
  que sur `:root`/`body` globalement — décision technique (CONSTITUTION §8, pas une question de
  design) : `apps/web/src/index.css` fixe déjà `:root`/`body` pour le terminal/onboarding/admin
  (fond bleu clair, police Courier) ; les redéfinir globalement aurait fait fuir ces valeurs dans
  tout l'existant. Les deux feuilles ne se touchent jamais.
- **8 composants de base** (`apps/web/src/platform/ui/`) : `Button` (4 variantes, le bouton
  danger exige un deuxième clic de confirmation — voir § À valider par Massy), `Field` (libellé
  réel, erreur sous le champ qui dit quoi faire, `aria-describedby`/`aria-invalid`), `Card`,
  `Badge` (5 tons, dont warning/danger/info/neutral ajoutés par extension mécanique du motif
  10%-alpha déjà fixé pour `--accent-subtle` — pas une nouvelle décision), `ProgressBar`
  (toujours avec un texte, remplissage animé en `transform: scaleX()` — jamais `width`),
  `EmptyState`, `Skeleton` (shimmer en `transform: translateX()` via un pseudo-élément, pas
  `background-position`, pour respecter strictement DESIGN-SYSTEM §6 « opacity/transform
  uniquement, jamais … d'autre propriété »), `PlatformLayout` (barre 56px, conteneur 1200px,
  menu mobile coulissant sous 768px — seuil consigné en § À valider par Massy).
- **Gabarit + page de démonstration** : `PlatformLayout` + `StyleguidePage.jsx`, route
  `/styleguide` (jamais liée depuis l'accueil, même convention que `/admin` : test de
  `pathname` dans `main.jsx`), **chargée en `import()` dynamique** (DESIGN-SYSTEM §7 : « chargé à
  la demande ») pour ne jamais alourdir le bundle visiteur par défaut.
- **`_headers`** (`apps/web/public/_headers`, copié à la racine de `dist/` par Vite) : les 5
  en-têtes de `docs/SECURITE.md` §4 mot pour mot (CSP, HSTS, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy). **Vérifié servi réellement** (pas juste présent dans
  `dist/`) par un nouveau test Playwright (`apps/web/e2e/security-headers.spec.js`) contre un
  vrai `wrangler pages dev` — la meilleure preuve possible sans déployer (interdit pendant tout
  le chantier).
- **Budgets de performance mesurés** (DESIGN-SYSTEM §7), pas supposés :
  - CSS de la plateforme (tous les composants + jetons) : **1,85 Ko gzip** — budget 25 Ko, large
    marge pour les pages à venir.
  - JS de `/styleguide` (chargé à la demande, séparé du bundle visiteur par défaut) : **2,33 Ko
    gzip** — budget 180 Ko, confirme que le découpage par `import()` fonctionne bien.
  - CLS mesuré (pas supposé) via un test Playwright dédié qui lit les vraies entrées
    `layout-shift` du navigateur après chargement de `/styleguide` : **< 0,05**, budget respecté
    (squelettes et composants dimensionnés explicitement, aucune image).
  - **LCP/INP non mesurés ici, sciemment** : ces deux budgets dépendent de contenu réel et de
    conditions réseau (« 4G lente »), qu'Étape 0 n'a pas encore (page de démo interne, zéro appel
    réseau métier) — les mesurer maintenant produirait un chiffre sans signification. À mesurer
    avec un vrai Lighthouse/WebPageTest une fois l'Étape 2 (catalogue, lecteur de leçon) en
    place, sur du contenu réel.
  - **Point de vigilance identifié, volontairement non corrigé ici** : le bundle visiteur par
    défaut actuel (`index.js`, terminal + onboarding + exercices + admin, tous préexistants)
    pèse **95 Ko gzip** à lui seul — déjà sous le budget "plateforme hors simulateur" de 180 Ko,
    mais seulement parce que **rien de la plateforme n'y est encore accroché**. Le terminal
    (`packages/core`) et le moteur d'exercices n'y sont eux-mêmes pas isolés en chunk séparé
    (ils sont déjà dans ce même bundle aujourd'hui, avant même Mission 23). DESIGN-SYSTEM §7
    exige que « le simulateur et le moteur d'exercices soient chargés à la demande » : respecté
    pour tout le code *ajouté* par Étape 0, mais le *découpage de l'existant* (sortir
    `Terminal.jsx`/`ExercisePanel.jsx` du bundle de `App.jsx` avec `React.lazy`) n'a pas été fait
    ici — Étape 0 dit explicitement « rien de métier ici », et toucher à `App.jsx`/`main.jsx` au-
    delà de la route `/styleguide` aurait été un changement sur le chemin critique du produit en
    production (risque de régression sur l'accès par clé/le terminal) sans bénéfice avant que
    l'accueil de la plateforme (Étape 2) ne remplace réellement `Onboarding.jsx` comme première
    page vue par un visiteur. Décision : traiter ce découpage **en Étape 2**, quand il aura un
    effet mesurable réel (la page d'accueil de la plateforme ne doit pas tirer le terminal), pas
    maintenant où ça n'aurait été qu'un risque sans gain. Noté ici pour ne pas l'oublier.
- **Tests** : 17 nouveaux tests Vitest (`apps/web/src/platform/ui/platform-ui.test.jsx` — tous
  les composants, tous leurs états : confirmation danger, erreurs de champ, clamp de la barre de
  progression, états vides avec/sans action) + 4 nouveaux tests Playwright (`styleguide.spec.js`
  + `security-headers.spec.js`). **Zéro changement sur le terminal, l'onboarding, l'admin** —
  confirmé en relançant les 6 suites + les deux e2e en entier, pas seulement les nouveaux tests.
- 268 core / 9 data / 47 exercises / **66 web (+17)** / 19 functions / **30 e2e (+6)** / 4 e2e
  admin, lint et typecheck propres, build vérifié (`npm run build:web`). **Checklist sécurité de
  fin d'étape** (`docs/SECURITE.md` §9) : `npm audit` toujours à 0 vulnérabilité (voir session
  précédente) ; aucun secret dans le bundle (aucun secret introduit par cette étape — pas encore
  de backend auth/paiement) ; les deux items restants de la checklist (« un étudiant ne peut pas
  accéder à un cours non acheté », « un non-admin ne peut atteindre aucune route `/api/admin/*` »)
  ne s'appliquent pas encore — rien de métier n'existe avant l'Étape 1. En-têtes de sécurité
  vérifiés servis (ci-dessus). **Rien déployé en production** (règle du mode autonome) : tout
  vérifié en local/CI uniquement.
- `CLAUDE.md`/`missions/README.md` (éditions de l'architecte : contexte Missions 21-25,
  renumérotation 09→24/10→25) et les 5 nouveaux documents de cadrage
  (`missions/MISSION-21.md` à `25.md`, `docs/DESIGN-SYSTEM.md`, `docs/SECURITE.md`,
  `docs/DESIGN-PSYCHOLOGIE.md`, `docs/ETUDE-PLATEFORMES-ELEARNING.md`) étaient présents dans
  l'arbre de travail mais pas encore commités au début de cette session — vérifiés stables
  (identiques à trois relectures espacées dans la session) avant d'être commités ici avec le
  travail d'Étape 0, même pattern que le commit `d29feda` (Mission 14) qui avait déjà inclus des
  éditions externes de l'architecte présentes dans l'arbre de travail.

### 06/10/2026 — Traitement des conclusions de l'audit de reprise (AUDIT.md, 05/10/2026)
Session consacrée à traiter, dans l'ordre demandé par Massy, les trois catégories de constats de
l'audit de reprise après 4 mois d'arrêt.

1. **Rituel de clôture Mission 14** : `TASKS.md`, `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md` et
   `CLAUDE.md` disaient encore « Étape 3 (bascule production) non commencée » alors que
   l'historique git (commits `ff6a652`/`40e8ed9`/`3b3398d`/`9430c9d`, 28/07/2026) et `README.md`
   montraient qu'elle avait été faite et vérifiée le même mois. Confirmé toujours vivant en
   production par l'architecte (`/api/license/check` répond) avant de corriger les trois
   fichiers et de marquer Mission 14 CLOSE dans son ensemble. **Leçon ajoutée dans `TASKS.md`** :
   le rituel de clôture doit s'appliquer même quand une session se termine sur des correctifs
   imprévus plutôt que sur le plan initial — c'est précisément ce qui avait fait sauter la mise à
   jour le 28/07/2026.
2. **Bug e2e admin (pollution D1 locale entre runs)** : `playwright.admin.config.js` lançait
   `wrangler pages dev` sans `--persist-to`, donc sur le D1 local persistant du dépôt plutôt
   qu'un D1 jetable — les licences fixtures `Client E2E`/`Client Revoke E2E` créées par chaque
   run s'accumulaient sans jamais être nettoyées, jusqu'à ce que deux lignes du même nom cassent
   les locators Playwright (`strict mode violation`, reproduit en direct par l'audit après
   plusieurs mois de runs locaux accumulés). Corrigé avec le même motif que
   `functions/__tests__/testServer.js` (déjà correct) : un répertoire temporaire frais
   (`mkdtempSync` + `--persist-to`) généré une fois par invocation de la config, pour la
   migration ET pour `wrangler pages dev`. Vérifié par deux exécutions consécutives de
   `npm run test:e2e:admin` (4/4 les deux fois). `playwright.config.js` (suite e2e principale) a
   le même répertoire D1 non isolé, mais volontairement — la licence fixture `GDS-TEST-0001` est
   insérée de façon idempotente (`ON CONFLICT DO NOTHING`) et son palier école/4 postes absorbe
   explicitement la variance d'empreinte entre runs (voir `scripts/seed-e2e-test-license.sql`) ;
   ce n'est donc pas la même famille de bug, juste un design différent et déjà documenté comme
   tel — **non modifié**, noté en Backlog comme amélioration possible (pas un bug) si Massy
   préfère l'isoler aussi un jour.
3. **Points mineurs de l'audit** :
   - Code mort retiré : `functions/api/verify-key.js`, `scripts/generate-keys.mjs`, la variable
     `ACCESS_KEY_HASHES` (plus aucune référence côté `apps/web/src` depuis la bascule du
     28/07/2026, confirmé par recherche avant suppression) ; `VITE_FALLBACK_KEY_HASHES` n'avait
     déjà plus aucune référence dans le code (son seul appelant, `apps/web/src/lib/keyHash.js`,
     avait été supprimé dans le commit `ff6a652`) — seules des mentions en commentaires/doc
     restaient, mises à jour (`README.md`, `docs/LICENCES.md`).
   - Comparaison à temps constant : `functions/api/admin/login.js` comparait le haché de la
     phrase admin avec `===` (s'arrête à la première différence) alors que `functions/_lib/
     token.js` le fait déjà correctement pour les signatures. Extrait un helper partagé
     `constantTimeEqual()` dans `functions/_lib/hash.js`, réutilisé par les deux (réduit aussi la
     duplication de la boucle XOR qui n'existait jusqu'ici que dans `token.js`).
   - `npm audit fix` : 13 vulnérabilités (toutes en devDependencies — vitest/@vitest/mocker,
     wrangler/miniflare/sharp/undici, vite/postcss/browserslist, brace-expansion, js-yaml,
     nanoid) → 0 après `npm audit fix` (33 paquets mis à jour, aucun changement de version majeure
     forcée). Les 6 suites + lint + typecheck + build ré-exécutés après coup pour confirmer
     l'absence de régression.
   - Décompte « 51 web » vs 49 observés par l'audit (ligne du 27/07/2026 ci-dessous) : ce n'est
     pas une erreur à corriger — c'était vrai au moment où c'était écrit, c'est juste une
     photographie historique d'un instant différent de celui de l'audit. Rien à changer.
4. **Note sur une édition concurrente** : pendant cette session, l'architecte a mis à jour
   `CLAUDE.md`/`missions/README.md` et ajouté `missions/MISSION-21.md`/`22.md`/`23.md` en
   parallèle (nouvelle correction de Massy : le produit n'est pas fini, 3 chantiers restants —
   plateforme e-learning, paiement Chargily automatisé, fidélité des écrans). Ces fichiers n'ont
   pas été touchés par cette session ni inclus dans ses commits — à lire séparément.

Suites vérifiées vertes après l'ensemble des changements de cette session : 268 core, 9 data,
47 exercises, 49 web, 19 functions, 24 e2e, 4 e2e admin, lint et typecheck propres, build OK.

### 27/07/2026 — Mission 14 (espace admin + licences par poste, Étapes 1/2/4/6 — Phase 8 anticipée)
- **Changement d'architecture appliqué** (bandeau architecte 07/07/2026, lu en tête de fichier
  avant de commencer) : Cloudflare D1 partout où la mission disait Supabase. Auth admin par
  phrase secrète (`ADMIN_SECRET_HASH`, même pattern que `ACCESS_KEY_HASHES`), pas de Supabase
  Auth.
- **Schéma D1** (`migrations/0001_init.sql`) : `licenses` (clé hachée, palier individuel/école,
  `max_devices`, statut) + `activations` (une ligne par appareil, contrainte unique
  `(license_id, device_fingerprint)` qui fait à la fois l'idempotence de réactivation et le
  comptage de postes utilisés). Pas de RLS (n'existe pas sur D1/SQLite) — son intention protectrice
  est préservée autrement : D1 n'est accessible que depuis l'intérieur des Pages Functions,
  jamais exposé à un SDK client.
- **Conception des jetons repensée en cours de route** : la mission décrivait un « jeton signé »
  pour l'activation ET la session admin. Pour l'activation, un jeton signé (JWT-like) aurait de
  toute façon fallu re-vérifier l'état en base à chaque `check` (la révocation doit être
  instantanée) — un jeton opaque aléatoire stocké dans `activations.token` et recherché
  directement est donc plus simple ET tout aussi correct (pas de double mécanisme de validité à
  raisonner). Gardé le jeton signé (HMAC-SHA256, `functions/_lib/token.js`) uniquement pour la
  session admin, où il évite un aller-retour base de données par requête ; signé avec
  `ADMIN_SECRET_HASH` lui-même (pas de deuxième secret à faire configurer à Massy — rotation de
  la phrase secrète invalide tous les jetons existants du même coup).
- **7 Cloudflare Pages Functions** : `license/activate` (limite de postes, réactivation
  idempotente, `DEVICE_LIMIT`/`NOT_FOUND` distincts — contrairement à `verify-key.js`, la mission
  demande explicitement des messages différenciables ici), `license/check` (révocation
  instantanée, l'état en base est la seule source de vérité), `admin/login`, `admin/licenses`
  (GET liste + POST création), `admin/licenses/[id]` (PATCH révoquer/réactiver/prolonger),
  `admin/licenses/[id]/activations` (GET détail des postes), `admin/activations/[id]` (DELETE
  libérer un poste sans révoquer toute la licence).
- **Limite connue documentée, pas contournée** : `activate` a une fenêtre de course théorique
  (deux activations simultanées sur le dernier poste disponible) — accepté sans verrou
  transactionnel vu l'échelle réelle du produit (CONSTITUTION §8, pas d'over-engineering) ;
  détaillé dans `docs/LICENCES.md` §4.
- **UI `/admin`** (`apps/web/src/admin/`) : pas de dépendance routeur pour une seule page en plus
  — un simple test de `window.location.pathname` dans `main.jsx`, cohérent avec le reste de
  l'appli qui gère déjà son propre état d'écran à la main. `AdminLogin` + `AdminDashboard`
  (tableau licences, Nouvelle clé affichée une seule fois, révoquer/réactiver/prolonger, détail
  des appareils par licence + libérer un poste, export CSV). Session en `sessionStorage` (pas
  `localStorage`) — se termine à la fermeture de l'onglet. `apps/web/public/_redirects` ajouté
  (SPA fallback `/* -> /index.html`) : sans lui, une navigation directe vers `/admin` renvoie 404
  sur Cloudflare Pages (seule la route `/` existait jusqu'ici).
- **Empreinte appareil** (`apps/web/src/lib/deviceFingerprint.js`) : hash de signaux navigateur
  (user agent, écran, fuseau, canevas léger). Limites documentées explicitement (pas une
  barrière de sécurité, contournable) dans le code et `docs/LICENCES.md` §3, comme demandé par
  la mission.
- **Tests, 3 couches** : `functions/__tests__/license-api.test.js` (18 tests d'intégration
  contre un vrai `wrangler pages dev` + D1 local disposable — postes 1/1, 2/2, 4/4 et 5ᵉ refusé,
  révocation instantanée, réactivation, libérer un poste — pas de mock D1) ; Vitest sur
  `AdminLogin`/`AdminDashboard` (9 tests, réseau simulé) ; `apps/web/e2e-admin/admin.spec.js`
  (4 tests Playwright contre `wrangler pages dev` réel — `vite preview` ne fait pas tourner les
  Functions, d'où une config Playwright dédiée `playwright.admin.config.js`, isolée de la suite
  e2e principale). `.dev.vars` (gitignored) fixe `ADMIN_SECRET_HASH` à une valeur de test connue
  pour que tout ça tourne de façon déterministe en local et en CI.
- **Scripts** : `scripts/generate-admin-secret.mjs` (phrase + haché, jamais écrit sur disque),
  `scripts/migrate-keys-to-d1.mjs` (Étape 3 — écrit et testé contre D1 local, **jamais exécuté
  contre la production**, prêt pour la bascule).
- **Doc** : `README.md` §Administration (les 4 étapes exactes pour Massy, ÉTAPE 0 de la
  mission), `docs/LICENCES.md` (fonctionnement, limites de l'empreinte, procédure de support).
- **Étape 3 (bascule production) volontairement non commencée** : nécessite que Massy ait
  d'abord fait ses 4 étapes manuelles (`README.md` §Administration) — rien à migrer/brancher tant
  que la base D1 de production n'existe pas. Décision assumée, pas un oubli : l'ÉTAPE 0 de la
  mission demande explicitement de tout tester en local avant de toucher à la production.
- 268 core / 9 data / 47 exercises / 51 web (+10) / **18 functions (nouveau)** / 24 e2e / **4 e2e
  admin (nouveau)**, lint et typecheck propres. Rituel de clôture appliqué (protocole habituel).

### 25/07/2026 — Mission 08 Étape 4 (rituel de clôture final + production vérifiée, Phase 6)
- **e2e étendu aux 10 exercices** (`apps/web/e2e/exercises.spec.js`) : un nouveau bloc
  paramétré (`ALL_EXERCISES`) résout chacun des 10 exercices avec sa séquence de commandes
  vérifiée (les mêmes séquences que les tests golden de `packages/exercises`), confirme
  « Exercice réussi » affiché dans un vrai navigateur — auparavant seul l'exercice 3 avait une
  preuve e2e ; les 9 autres n'étaient couverts que par les tests golden `packages/exercises`
  (logique métier) et Vitest `ExercisePanel.test.jsx` (un seul exercice fixture). 12 nouveaux
  tests e2e (12→24 au total), tous verts en local avant toute vérification production.
- **Vérification production** (critère explicite de l'étape) : le hash du bundle JS déployé sur
  Cloudflare Pages (`index-dx2ePTKe.js`) est identique à celui du build local testé (même
  contenu, même taille — 306 029 octets) ; le bundle contient bien les 10 identifiants/titres
  d'exercice (`ex-10-full-workflow`, « Liste d'attente », « Dossier complet de A », etc.),
  confirmant que le déploiement reflète bien tout le contenu de l'Étape 3 et pas une version
  périmée. **Limite assumée et documentée** (pas contournée en silence) : le parcours réel de
  validation de clé d'accès (Cloudflare Pages Function `verify-key.js`) n'a pas pu être
  re-testé de bout en bout en production, faute d'une vraie clé (seul Massy en détient, par
  design — CLAUDE.md §Accès par clé). La suite e2e locale tourne contre le build produit par la
  même commande (`npm run build:web`) que celle utilisée par Cloudflare Pages pour le
  déploiement — c'est donc le même artefact qui est exercé, à l'exception de la couche
  Cloudflare Function elle-même (déjà validée lors des missions 06/07, hors périmètre ici).
- **Mission 08 CLOSE dans son ensemble** (Étapes 1 à 4) : moteur d'exercices pur (`evaluate()`),
  10 exercices FR/EN avec deux chemins valides + un échec typique chacun, UI mode exercice
  intégrée sans dégrader le mode libre, rituel de clôture complet. 6 suites vertes (268 core,
  9 data, 47 exercises, 41 web, 24 e2e, lint et typecheck propres). `CLAUDE.md` (Phase 6) et
  `PROJECT_MEMORY` mis à jour pour refléter la clôture complète.

### 24/07/2026 — Mission 08 Étape 3 (exercices 5-10 + indices/barème + polissage, Phase 6)
- **Contenu réel des exercices 5-10** (`packages/exercises/content/*.json`) : vente directe sans
  AN (long sell), retrouver et modifier un dossier existant (`RT` locator/nom + `SB`), corriger
  des erreurs (`NU`/`DL`/`XE`/`IG`), tarifer et émettre (`FXP`/`FP`/`TTP`/`TWD`), liste d'attente
  (`SS...PE` ou classe épuisée + `ETK`), dossier complet de synthèse (tout combiné). Chaque
  exercice testé golden avec deux chemins valides différents ET un échec typique à feedback
  précis par objectif — même rigueur que les exercices 1-4. « Chronométré » (exercice 10) traité
  comme un défi personnel dans la consigne (texte uniquement), pas un minuteur applicatif : la
  mission ne demandait ni moteur de chronométrage ni changement d'UI pour cette étape.
- **Toutes les commandes des exercices 5-10 vérifiées contre le vrai moteur avant rédaction**
  (comme pour 1-4) : numéros d'éléments RT exacts pour `SB`/`NU`/`DL`/le `n/KL` de la liste
  d'attente (dépendent de l'ordre des éléments du PNR, pas devinés), vols/classes/sièges
  disponibles réels sur ALG-PAR/26DEC (ex: D class du vol AH5469 = 4 sièges, confirmé avant
  d'écrire l'exercice liste d'attente).
- **Bug réel trouvé et corrigé en écrivant le contenu** (famille CONSTITUTION §3, pas un
  contournement local) : `applySeedState` ne faisait qu'une fusion superficielle
  (`{...state, ...exercise.seedState}`) — les objets imbriqués d'un `seedState` (ex: `pnrStore`)
  restaient **partagés par référence** avec l'objet exercice importé une seule fois (module JS).
  Comme `processCommand` mute l'état en place (`ER` remplace `state.pnrStore[locator]`), une
  première tentative (ou un premier étudiant) sur un exercice avec `pnrStore` seedé corrompait
  l'exercice pour toute tentative suivante — découvert via une vraie pollution croisée entre
  deux tests golden de l'exercice 6 (RT locator/modification). Corrigé par un `structuredClone`
  du `seedState` avant fusion ; test de régression dédié ajouté (`evaluate.test.js`).
- Deux nouveaux seeds `pnrStore`/`recordedSnapshot`/`activePNR` construits à la main (exercices
  6 et 7) suivant exactement la forme réelle produite par `recordPnr()` (vérifiée en inspectant
  un vrai snapshot), pas devinée.
- 28→47 tests exercises (19 nouveaux : 3×6 exercices + 1 régression `applySeedState`). Suites
  core/data/web/e2e inchangées (268/9/41/14), lint et typecheck propres, build web vérifié.
  **Mission 08 Étape 3 CLOSE**. Prochaine étape : Étape 4 (rituel de clôture final + vérification
  production des 10 exercices).

### 16/07/2026 — Mission 08 Étape 2 (exercices 1-4 + UI mode exercice, Phase 6)
- **Contenu réel des exercices 1-4** (`packages/exercises/content/*.json`, chargé via
  `src/content.js`, ré-exporté par `src/index.js` pour garder un point d'entrée unique comme
  `packages/core`/`packages/data`) : lecture de disponibilité (AN/MD/AC), décodage
  (DAC/DNA/DC), première vente (AN→SS→RT), dossier complet (NM/AP/RF/TKTL/ER). Chaque exercice
  testé par un golden qui déroule deux chemins valides différents ET un échec typique avec
  feedback précis par objectif (14 nouveaux tests, `content.test.js`).
- **Deux petites extensions de l'évaluateur**, nécessaires au contenu (pas un changement
  d'architecture) : filtre `airline` sur l'objectif `route` ; nouveau type d'objectif `tk-set`
  (vérifie qu'un TKTL/TKXL/TKOK a été posé, requis par l'exercice 4).
- **Point de fidélité vérifié avant d'écrire le contenu** : le filtre compagnie inline
  `AN.../XX` mentionné dans `CLAUDE.md` (Phase 0) est une fonctionnalité d'affichage côté UI
  (`Terminal.jsx`, sélection clavier), pas une vraie commande du dispatcher `processCommand` —
  confirmé en exécutant le moteur réel (`AN26DECALGPAR/AH` → `CHECK FORMAT`). L'exercice 1
  utilise donc `AC/AAH` comme alternative testée, pas le filtre inline.
- `packages/exercises/tsconfig.json` : `module`/`moduleResolution` passés à `nodenext` pour
  supporter les import attributes JSON (`with { type: "json" }`) — vérifié compatible avec
  `node --test` ET le pipeline Vite/Vitest d'`apps/web` avant d'écrire le contenu (risque de
  compatibilité bundler identifié et levé en amont, pas découvert après coup).
- **UI mode exercice** (`apps/web`) : `Terminal.jsx` rendu réutilisable sans changement visuel
  ni comportemental en mode libre — `forwardRef` + `useImperativeHandle` (expose
  `getState()`) et prop `initialState` optionnelle (défaut : `createInitialState()` inchangé).
  Nouveaux composants `ExercisePicker.jsx` (liste les 4 exercices) et `ExercisePanel.jsx`
  (panneau consigne repliable + le VRAI Terminal, inchangé, en dessous + boutons
  Vérifier/Indice/Abandonner + écran de résultat avec feedback par objectif). Entrée « Mode
  exercices » sur l'accueil (`Onboarding.jsx`), **derrière la même clé d'accès que le mode
  libre** — décision : les exercices font tourner le vrai terminal complet, un bypass gratuit
  aurait contourné le modèle commercial de la Mission 06 (`App.jsx`, `postKeyDestination`).
  FR/EN via le dictionnaire existant (`i18n/dictionary.js`, section `exerciseMode`).
- 2 tests unitaires Vitest ajustés/évités : le libellé d'objectif est isolé dans son propre
  `<span>` (au lieu d'un texte JSX mêlé à l'icône ✓/✗) pour rester interrogeable par
  `getByText` — détail de rendu, pas une règle métier.
- 11 nouveaux tests Vitest web (`ExercisePicker.test.jsx`, `ExercisePanel.test.jsx`) + 2 dans
  `App.test.jsx` (gating par clé, y compris le raccourci "clé déjà validée"). 2 nouveaux
  scénarios Playwright (`e2e/exercises.spec.js`) : un exercice réussi avec feedback par
  objectif, un exercice échoué avec feedback précis — critère d'acceptation de l'étape.
- 28 tests exercises (14 Étape 1 + 14 nouveaux), 41 tests web (30 + 11), 14 e2e (12 + 2).
  **Mission 08 Étape 2 CLOSE** : 6 suites vertes (268 core, 9 data, 28 exercises, 41 web,
  14 e2e, lint et typecheck propres), build web vérifié (JSON bundlés correctement).
  Enchaînement sur l'Étape 3 selon la décision de Massy pour la suite de session.

### 16/07/2026 — Mission 08 Étape 1 (moteur d'exercices guidés — format + evaluate(), Phase 6)
- Nouveau package `packages/exercises` (même architecture que `packages/core` : pur, zéro UI,
  `// @ts-check` + JSDoc, `node --test`), dépendance vers `@simulateur/core` (réutilise
  `createInitialState`/`processCommand` — un exercice se joue dans le VRAI moteur, aucune
  simplification).
- **Format JSON d'un exercice** documenté en JSDoc (`Exercise`/`Objectif`/`JalonTrace`/`Aide`
  typedefs dans `src/index.js`) : `id`, `niveau`, `titre`/`consigne` bilingues, `seedState`
  (état initial, fusionné sur `createInitialState()`), `objectifs[]` (critères sur l'état
  final), `jalonsTrace[]` (commandes-clés optionnelles, jamais bloquantes), `aides[]` (indices
  à pénalité), `bareme` implicite (points par objectif).
- **`evaluate(exercise, finalState, commandTrace, options)`** : évalue chaque `objectif`
  indépendamment (7 types couverts : `pnr-recorded`, `segment-count`, `route`, `passenger-name`,
  `tst-present`, `ticket-issued`, `element-status`), `passed` = tous les objectifs `required`
  passent (défaut : tous), `score`/`maxScore` en points, pénalité de `hintsUsed` appliquée aux
  `aides[]` révélées dans l'ordre, plancher à 0. Type d'objectif inconnu → échec propre (pas de
  crash, pas de faux positif silencieux). `jalonsTrace` évalué séparément (`jalonsFeedback`),
  jamais pris en compte dans `passed` — conforme au principe du mission : évaluation par l'état
  final, pas par la séquence exacte.
- Tests golden (`evaluate.test.js`, 14 tests) sur un exercice fixture représentatif (réservation
  ALG→PAR pour M. Dupont, mission 08 §Vision) : **deux chemins valides différents réussissent**
  tous les deux (vente numérique après AN, vs long sell sans AN — la même fin d'état, deux
  parcours) ; **un échec typique** (vol vendu mais dossier jamais nommé/enregistré) donne un
  feedback précis objectif par objectif, pas un échec sec ; couverture unitaire des 7 types
  d'objectif (dont statuts annulés ignorés par `segment-count`, liste d'attente `HL` via
  `element-status`) + pénalités d'indices + type inconnu.
- Chaîne d'outillage étendue au nouveau package (README/CLAUDE.md §Outillage déjà à jour dans
  leur principe, appliqué ici) : `npm run test:exercises` (racine), husky pre-commit
  (`.husky/pre-commit`), `lint-staged.config.mjs` (typecheck sur `packages/exercises/src/**/*.js`,
  même pattern que `packages/core`). `npm install` exécuté pour enregistrer le nouveau workspace.
- **Mission 08 Étape 1 close** : suites vertes (268 core, 9 data, **14 exercises**, 30 web,
  12 e2e — web/e2e inchangés, cette étape ne touche aucune UI), lint et typecheck (core +
  exercises) propres. Aucun contenu réel d'exercice encore écrit (les 10 exercices canoniques
  sont l'Étape 2/3, pas celle-ci) — le fixture de test n'est qu'une démonstration du moteur.
  Enchaînement sur l'Étape 2 selon la décision de Massy pour la suite de session.

### 07/07/2026 — Mission 07 Partie A (préparation technique du pilote)
- **Analytics Cloudflare sans cookies** : nouveau module `apps/web/src/analytics.js`
  (`initAnalytics()`, appelé une fois dans `main.jsx`) qui injecte le beacon Cloudflare
  UNIQUEMENT si `VITE_CF_BEACON_TOKEN` est configuré (variable Cloudflare Pages) — même
  convention que `VITE_FALLBACK_KEY_HASHES` : vide par défaut, donc inactif (aucun script
  externe chargé, aucun appel réseau) tant que Massy ne configure pas la variable lui-même.
  Documenté dans `README.md` §Mesure d'audience.
- **Bouton Feedback** (`FeedbackButton.jsx`) : discret, coin bas-droit, présent sur l'accueil et
  le terminal (les deux emplacements demandés par la mission). Mailto pré-rempli avec version
  (`1.0.0-pilot`) et écran d'origine dans l'objet, vers l'adresse de contact déjà utilisée pour
  « Demander un accès ». FR/EN via le dictionnaire i18n existant.
- **Guide de démarrage rapide** (`QuickStartGuide.jsx`) : bouton « ? » discret, coin bas-gauche,
  même deux emplacements. Overlay listant les commandes de base (AN/SS/NM/AP/RF/ER/RT/HELP) et
  la séquence complète de réservation, FR/EN, imprimable (bouton dédié + règles `@media print`
  qui masquent tout le reste de l'interface). `Terminal.jsx` lit la langue déjà choisie via
  `useLang()` (persistée en localStorage depuis l'accueil) sans dupliquer d'état — le terminal
  lui-même reste en anglais Amadeus-authentique, seule cette enveloppe est traduite (décision
  confirmée le 05/07/2026, non remise en cause).
- Tests : 8 nouveaux tests Vitest (`analytics.test.js`, `FeedbackButton.test.jsx`,
  `QuickStartGuide.test.jsx`) + 1 nouveau scénario Playwright (`e2e/pilot.spec.js`, guide +
  feedback accessibles depuis l'accueil ET le terminal). 22→30 tests web, 10→12 tests e2e.
  **Mission 07 Partie A close** : 6 suites vertes (268 core, 9 data, 30 web, 12 e2e, lint et
  typecheck propres), build vérifié.
- **Partie B (checklist opérationnelle Massy)** : génération des clés, configuration
  `ACCESS_KEY_HASHES`/`VITE_CF_BEACON_TOKEN` sur Cloudflare, recrutement des pilotes, tenue de
  `docs/PILOTE.md` — hors périmètre Claude Code, pas d'action prise ici.

### 07/07/2026 — Mission 19 réduite (magasin de PNR + RT locator/nom, clôture de la chaîne)
- **Question de persistance posée en début de session** (comme demandé explicitement par la
  bannière PÉRIMÈTRE RÉDUIT de `MISSION-19.md`) : Massy a confirmé **en mémoire pour la session
  de travail uniquement**, pas de localStorage — cohérent avec l'architecture actuelle
  (`state.pnrStore`, déjà alimenté par `ER`/`ET`/`ERK`/`ETK` depuis Mission 15/13).
- **Choix d'architecture assumé** : le magasin de PNR existait déjà côté `packages/core`
  (`state.pnrStore`, clé = record locator, alimenté par `recordPnr`) et fonctionne, testé
  extensivement (IG/IR/XI). Plutôt que de le migrer vers `packages/data` (refactor risqué sans
  bénéfice fonctionnel pour ce périmètre réduit, contraire à CONSTITUTION §8 "minimiser le
  risque de régression"), cette mission l'expose simplement via de nouvelles commandes `RT`.
- `RT<LOCATOR>` (6 lettres) : récupère un PNR enregistré par son record locator, même sémantique
  transactionnelle que `IR<LOCATOR>` (discard des segments non enregistrés de la session
  courante, restitution d'inventaire) — testé explicitement.
- `RT/<NOM>` : recherche par nom de famille (sous-chaîne, insensible à la casse) dans tous les
  PNR enregistrés. Une seule correspondance → récupération directe. Plusieurs → liste de
  similitude numérotée (`RT<n>` sélectionne, `RT0` réaffiche la liste). Aucune → `PNR NOT FOUND`.
- `RT<AA><vol>/<ddMMM>-<NOM>` : même recherche par nom, filtrée en plus par vol+date exacts
  (utile pour désambiguïser deux passagers du même nom sur des PNR différents).
- Non-collision vérifiée avec les `RT` partiels reportés en v2 (`RTN`/`RT ABC123`/`RTZZ` restent
  `CHECK FORMAT`, aucune régression sur les tests Mission 16).
- `RH`, `SP`/`EF`/`RTAXR`, `RRN`/`RRI`/`RRP` **reportés en v2** (décision Massy 07/07/2026, hors
  périmètre réduit de cette mission).
- 259→268 tests core (9 nouveaux : retrieve par locator, par nom simple/multiple, liste
  `RT<n>`/`RT0`, filtre vol+date, cas d'erreur, discard transactionnel). **Mission 19 réduite
  CLOSE** : 6 suites vertes (268 core, 9 data, 22 web, 10 e2e, lint et typecheck propres).
  **Chaîne d'implémentation v1.x terminée** (missions/README.md §ALLÈGEMENT) — prochaine étape :
  Mission 07 (pilote).

### 07/07/2026 — Mission 13 (statuts de segment & liste d'attente HL/UC/KK/KL + ETK/ERK)
- **Spec validée par Massy en début de session** (question posée par l'assistant avant de coder,
  comme demandé par la mission) : modèle de statuts HK/HL/KK/KL/UC/UN/NO validé tel quel ;
  règle de promotion FIFO validée — quand une place se libère sur un vol (`XE`/`DL`), le premier
  `HL` de CE VOL (pas seulement de la même classe) passe `KL`.
- `SS`/SS long sell : classe pleine → segment `HL` (waitlist) au lieu du refus `NO SEATS` ; le
  vrai refus (`NOT ENOUGH SEATS`) reste pour une demande partiellement insatisfaite. `...PE`
  force un waitlist explicite même si des sièges restent (ex. `SS1Y1PE`). Un `HL` ne décrémente
  jamais l'inventaire (`segmentHoldsInventory`, nouvelle fonction partagée : seuls HK/KK/KL
  tiennent un vrai siège).
- **Bug critique corrigé au passage** (CONSTITUTION §3, famille de bugs) : `XE` ne libérait
  JAMAIS l'inventaire d'un segment annulé (contrairement à IG/DL/SB/XI) — une classe pleine le
  restait pour toujours après une annulation. Corrigé dans `markSegmentElementsCancelled`
  (point de passage commun XE/XEALL/XE-range). Détecté en creusant l'inventaire pour la
  promotion de liste d'attente : sans ce correctif, la promotion n'aurait jamais eu l'occasion
  de se déclencher.
- **2e correctif du même type** : `handleSSLongSell` reconstruisait une disponibilité complète
  à CHAQUE appel (jamais de cache), donc un 2e long sell sur le même vol écrasait silencieusement
  l'inventaire déjà entamé par le 1er — même famille de bug que ci-dessus, cassait directement
  le test du waitlist en long sell. Corrigé en réutilisant `state.lastAN` quand le contexte
  correspond déjà (même pattern que `SB`).
- Promotion `HL→KL` (`promoteWaitlistOnRelease`) : FIFO par ordre de création (ordre du tableau
  `itinerary`, jamais réordonné), recherche sur tout le vol (choix Massy) mais la promotion
  elle-même reste gatée par `findAvailabilityClass` sur la propre classe du `HL` — un siège
  libéré dans une AUTRE classe ne promeut jamais un `HL` d'une classe différente (testé
  explicitement), pas de fausse confirmation inventée.
- `ETK`/`ERK` : jumeaux de `ET`/`ER` (mêmes égalités strictes, non-collision testée) qui
  résolvent d'abord les codes-conseil (`applyWaitlistAdviceCodes`) : KK/KL→HK, UC/UN/NO
  supprimés de l'itinéraire (pas d'historique RH — mission 19 future).
  `ETK` n'affiche pas et n'émet pas de billet (comme `ET`) ; `ERK` réaffiche (comme `ER`).
- `n/HK`\|`HL`\|`KK`\|`KL`\|`UC`\|`UN`\|`NO` (item 5) : override manuel du statut d'un segment
  par n° d'élément RT, ajouté à `handleElementModify` (seule exception SEG de ce handler,
  documentée). Cohérence d'inventaire maintenue par `applySegmentStatusOverride` : libère en
  sortant d'un statut tenu, consomme (ou `NO SEATS`) en y entrant. Bloqué `NOT ALLOWED - TST
  SEGMENT` si verrouillé par un TST (même garde que SB), `ELEMENT NOT FOUND` sur un segment déjà
  annulé.
- IG/IR/XI bénéficient automatiquement du même modèle (item 6) via `segmentHoldsInventory`
  partagé dans `releaseInventoryForSegments` — testé explicitement (KK libéré correctement).
- **Hors périmètre, noté en Backlog** : interaction FXP/TTP avec un segment `HL`/`UC` non
  confirmé (peut-on tarifer/émettre un billet dessus ?) — non demandé par la mission, non
  deviné, à trancher dans une session future si besoin.
- 12 nouveaux tests dédiés (waitlist SS/PE, XE/DL + promotion FIFO, non-promotion inter-classes,
  override manuel, ETK/ERK, IG restitution, non-collision ETK/ERK vs ET/ER) + 1 test existant
  mis à jour pour refléter le nouveau comportement (`SS` sur classe pleine ne refuse plus).
  247→259 tests core. **Mission 13 close** : rituel complet exécuté (6 suites vertes : 259 core,
  9 data, 22 web, 10 e2e, lint et typecheck propres).

### 07/07/2026 — Mission 17 réduite (DD, DC, DNA — utilitaires agent, clôture de la mission)
- **DD** (calculateur de dates, pur calcul) : `DDddMMM` (date + jour de semaine),
  `DDddMMM/±n` (décalage signé depuis une date donnée), `DD±n` (décalage signé depuis
  aujourd'hui). Réutilise les helpers de date déjà présents (`ddmmmToDate`, `formatDDMMM`,
  `dayOfWeek2`), même convention année courante sans rollover que le reste du moteur.
  `CHECK DATE` sur date invalide (`DD31FEB`). Un code ville seul (`DDPAR`, un des exemples
  donnés par la mission elle-même) ne correspond à aucune des formes implémentées → `CHECK
  FORMAT` : décision documentée plutôt que devinée (une variante "heure locale par ville"
  aurait demandé une donnée de fuseau horaire absente du projet, ce qui aurait contredit la
  note "pur calcul, aucune donnée externe" de la doc). Sortie exacte (libellés `FROM`/`TO`)
  marquée à vérifier terrain avec Massy — logique de calcul fiable et testée.
- **DC** (pays/nationalité) et **DNA** (compagnies) : nouvelles tables dans `packages/data`
  (`InMemoryStore.loadCountriesFromArray`/`loadAirlinesFromArray` + `cmdDC`/`cmdDNA`,
  `createCountryProvider`/`createAirlineProvider`), chargées à la demande côté `Terminal.jsx`
  comme `locations` pour DAC/DAN. `DC` reprend la dualité decode-par-code/encode-par-texte de
  DAC/DAN en une seule commande ; `DNA` ajoute une 3e forme (code numérique de billetterie),
  conforme aux exemples de la mission (`DNA DELTA`/`DNA AF`/`DNA 057`). Nouvelles données
  publiques (codes IATA pays/compagnies, pas une règle métier Amadeus) : `countries.json` (20
  pays, dont DZ/FR/MA/TN cohérents avec le focus Algérie du projet) et `airlines.json` (13
  compagnies, dont les 6 déjà utilisées par le provider de disponibilité AH/AF/TK/PC/SV/AT) —
  à compléter si besoin, non exhaustif par choix (CONSTITUTION §7).
- `resolveDeps` étendu pour accepter `deps.countries`/`deps.airlines` (même contrat que
  `deps.locations` : objet avec une méthode `lookup`), sinon `COUNTRY/AIRLINE PROVIDER NOT
  CONFIGURED`. `HELP`/`HE DD`/`HE DC`/`HE DNA` documentés.
- 237→247 tests core (dont DD/DC/DNA + non-collision), 3→9 tests `packages/data`. Build web
  vérifié (`countries.json`/`airlines.json` bien copiés dans `dist/data/`), vérification
  manuelle bout-en-bout des 3 commandes avec les vraies données. **Mission 17 réduite close** :
  rituel complet exécuté (6 suites vertes : 247 core, 9 data, 22 web, 10 e2e, lint et typecheck
  propres).
- **Hors périmètre de cette mission (reporté en v2, décision Massy 07/07/2026)** : `DO`, `DF`,
  `DNE`, `DB`, `DM`, `JI`/`JO` — voir `docs/COMMANDES-MANQUANTES.md` §Priorité 2.

### 07/07/2026 — Mission 16, commande 6/6 (RE/RE2 — clôture de la mission)
- Nouvel état CORE `state.commandHistory: string[]` (comme `state.lastDisplay`) : historique des
  entrées uppercasées, alimenté à chaque `processCommand` juste avant le dispatch. `RE` lui-même
  n'est jamais enregistré (sinon un second `RE` rappellerait son propre rappel, comportement
  confus) — toute autre commande l'est.
- `RE` = rappelle et ré-exécute la dernière entrée ; `RE(\d{1,2})?` généralisé (`RE2`, `RE3`…, n
  par défaut 1) plutôt que de coder seulement les deux exemples nommés — généralisation naturelle
  à faible risque, pas une règle métier inventée. `NO PREVIOUS ENTRY` si l'historique est trop
  court ou vide (nouveau texte ajouté à `ERROR_EVENT_TEXTS` pour classification `error`).
- `RT` partiels (item 5/6) confirmés **reportés en v2** par décision de Massy (06/07/2026, déjà
  actée dans `MISSION-16.md`) : aucun code ajouté, seulement des tests de non-collision prouvant
  que le dispatcher actuel (`if (c === "RT")` en égalité stricte, fallback générique `CHECK
  FORMAT`) laisse déjà passer `RTN`/`RT ABC123`/`RTZZ` sans collision ni crash.
- 7 nouveaux tests (recall nominal, RE2, historique vide, historique trop court, non-ré-
  enregistrement de RE, non-collision RE/RF, non-collision RT partiels). 230→237 tests core, tout
  vert. `HELP`/`HE RE` documentés. `docs/COMMANDES-MANQUANTES.md` et `AUDIT-COMMANDES.md` mis à
  jour (RE fait, RT partiels reportés).
- **Mission 16 close** : rituel complet exécuté (6 suites vertes : 237 core, 3 data, 22 web, 10
  e2e — la 1ère tentative web/e2e a rencontré des flakes d'environnement sans rapport avec le
  changement, résolus par ré-exécution ; l'e2e local nécessite `VITE_FALLBACK_KEY_HASHES` en
  variable d'environnement comme en CI, sinon un seul test d'accès par clé échoue pour une raison
  d'environnement, pas de régression).

### 06/07/2026 — Mission 16, commande 3/6 (AC/SC/ACR — spec architecte, 8 règles déterministes)
- L'architecte a ajouté une spec complète et non ambiguë dans `MISSION-16.md` (§Spec AC/SC/ACR),
  levant l'ambiguïté relevée à la clôture précédente (ordre de désambiguïsation du parsing en
  8 règles strictes, testées dans cet ordre exact).
- Refactor `state.lastDisplay` : `itemLines: string[]` → `items: string[][]` (chaque item = 1 à
  3 lignes) pour supporter les entrées `AN` qui peuvent wrapper sur plusieurs lignes — nécessaire
  car `AC` doit réafficher en style `AN` paginé, ce que le modèle de la commande 1/6 (pensé pour
  `TN`/`SN`, 1 ligne = 1 item) ne permettait pas. `formatAvailabilityItem` extrait de `handleAN`
  pour réutilisation sans dupliquer le rendu multi-lignes.
- `AC`/`SC` : rejouent `state.lastAN.query` en changeant SEULEMENT le delta indiqué (date, delta
  jours signé, paire de villes, origine seule, destination seule via `//`, filtre compagnie
  `/AXX[,YY,ZZ]` max 3, filtre classe `/Cx[y,z]` max 3 (`/C` seul annule), sièges min `/Bn`,
  heure de départ mini 4 chiffres) — tous les autres critères conservés et chaînables (`AC/CF`
  puis `AC3` puis `MD` fonctionne). `AC` réaffiche toujours en style AN, `SC` toujours en style
  SN, quel que soit le type du dernier affichage réel (ex: `AC` juste après un `SN`). `MN`/`MY`
  (commande 2/6) mis à jour pour préserver les mêmes filtres (cohérence de toute la famille).
- `ACR` : inverse les villes, défaut départs ≥18h00 même jour ; `ACRhhmm` (heure) ;
  `ACRddMMMhhmm` (date + heure). Toujours en style AN.
- Erreurs réutilisées : `NOT IN TABLE`, `CHECK DATE`, `CHECK CLASS OF SERVICE` (lettre de classe
  invalide) ; filtre compagnie/sièges/heure sans correspondance → liste vide affichée, pas
  d'erreur inventée (non spécifié par l'architecte). 209→230 tests, tout vert (typecheck/lint/
  web aussi).

### 06/07/2026 — Mission 16, commandes 1-2/6 (MD/MU/MT/MB, MN/MY)
- **1/6 — MD/MU/MT/MB** : nouvel état CORE `state.lastDisplay` ({type, header, itemLines,
  pageSize, page}), demandé explicitement par la mission ("principe d'architecture" avant les
  commandes). `TN`/`SN` n'affichent plus que la page courante (avant : toutes les pages d'un
  coup, comportement historique changé) ; `MD`/`MU`/`MT`/`MB` font défiler, bornes cadenassées en
  silence (pas d'erreur inventée pour "après la dernière page"). `AN`/`RT` pas branchés (jamais
  assez de résultats pour paginer dans ce simulateur aujourd'hui, pas une régression). Dispatch
  par égalité stricte (`c === "MD"`, pas `startsWith`) — testé explicitement pour ne jamais
  intercepter un futur préfixe plus long (leçon Mission 04). 197→204 tests.
- **2/6 — MN/MY** : relance `state.lastAN.query` (from/to/date) décalé de ±1 jour comme un vrai
  `AN`, même si le dernier affichage était un `TN`/`SN` (état partagé). Chaînable, résultat
  addressable par SS ensuite. `NO ACTIVE DISPLAY` sans recherche préalable. 204→209 tests.
- Suites vertes après chaque commande (core/typecheck/lint, + web à la fin de ce lot).

### 06/07/2026 — Mission 16, Étape 0 (correction fidélité ET — reliquat arbitré de M15)
- L'architecte a mis à jour `missions/MISSION-16.md` pour trancher explicitement le point laissé
  en Backlog à la clôture de Mission 15 (correction `ET` mentionnée dans la doc mais absente de
  la liste numérotée de M15 — périmètre non élargi de ma propre initiative à l'époque).
- `ET` partage désormais la logique d'enregistrement de `ER` (helper commun `recordPnr` extrait
  du handler `ER`) : valide NM/AP/RF, génère/réutilise le record locator, promeut les TST
  CREATED→VALIDATED, enregistre le snapshot — **mais n'affiche que la confirmation** (`PNR
  RECORDED` + `RECORD LOCATOR X`), sans réafficher le PNR (contrairement à `ER`). `ET` n'émet
  plus de billet : seul `TTP` le fait désormais (`if (c === "TTP")`, retiré de l'ancien
  `if (c === "ET" || c === "TTP")` partagé).
- Tests : ~16 tests existants qui utilisaient `ET` comme raccourci « émettre un billet »
  (TWX/TWD/NU/ITR-EML/RT/XE, dans `processCommand.test.js` et `e2e.golden.test.js`) basculés sur
  `TTP` — c'est la commande qui émet réellement, pas un simple renommage cosmétique. 5 nouveaux
  tests dédiés au vrai comportement `ET` (enregistre sans réafficher, n'émet pas de billet,
  exige NM/AP/RF comme ER, idempotent). `HELP`/`HE ET`/`HE TTP` mis à jour pour refléter la
  distinction. Suite core 192 → 197 tests, tout vert (typecheck/lint aussi).
- `docs/COMMANDES-MANQUANTES.md` (tableau des 2 écarts) et le Backlog `TASKS.md` mis à jour :
  l'écart `ET` est maintenant marqué corrigé, à égalité avec `VOID`→`TWD`/`TWX` (Mission 15).

### 06/07/2026 — Mission 15 (servicing du PNR actif — chaîne d'implémentation)
- **Étape 0 (bug critique signalé par Massy, traité en premier)** : « IG ne sort pas complètement
  du PNR et ne l'ignore pas. » Cause racine : `resolveRecordedLocator` avait un repli sur
  `state.lastRecordedLocator`, un pointeur GLOBAL déconnecté du PNR actif courant — après
  ER (PNR A) → XI → nouveau PNR B jamais enregistré → IG résurrectait A au lieu de jeter B. Pointeur
  supprimé ; résolution scopée strictement au PNR actif. Même famille : IG/IR/XI ne restituaient
  jamais les sièges vendus via SS lors d'un discard/rollback — corrigé (restitution scoping à la
  part non enregistrée depuis le dernier ER, jamais celle d'un autre PNR). Matrice d'état complète
  documentée dans `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md` §2.2. 137→141 tests.
- **1/8 — VOID→TWD/TWX** : `VOID` retiré du dispatcher, remplacé par `TWD` (affichage, format
  minimal — richesse réelle de l'écran non modélisée, marqué « à vérifier ») et `TWX` (annulation,
  logique VOID conservée). 141→143 tests.
- **2/8 — SS long sell** : `SS<compagnie><vol><classe><date><villes><pax>` vend directement sans
  AN préalable ; alimente `state.lastAN` comme un AN implicite (sièges partagés avec un SS
  numérique ultérieur, restitution IG/IR/XI déjà couverte). 143→151 tests.
- **3/8 — SB rebooking** : classe (`SBY6`), date (`SB12APR7`), vol (`SBBA194*3`) — référence le
  segment par son numéro d'élément RT (même convention que XE). **Syntaxe non confirmée par
  expérience terrain**, déduite des 3 exemples de `docs/COMMANDES-MANQUANTES.md` — marqué
  « à vérifier ». Ancien segment `HX`, nouveau `HK`, inventaire libéré/re-décrémenté sans écraser
  d'autres sièges déjà vendus sur le même contexte. Bloqué par `NOT ALLOWED - TST SEGMENT` (même
  règle que XE). 151→158 tests.
- **4/8 — Modification par n°** (`n/valeur`) : périmètre réduit aux éléments texte/date libres
  (RM/OSI/SSR/OP/TKTL) — `4/2` (sièges) et `2/HK` (statut segment) volontairement pas faits
  (redondants avec SB, voir `docs/COMMANDES-MANQUANTES.md`). `NOT ALLOWED` pour tout autre type
  d'élément. 158→170 tests.
- **5/8 — NU** correction de nom : position référencée deux fois (`NU1/1SMITH/JOHN MR`), doit
  correspondre sinon `CHECK FORMAT`. Bloqué après émission d'un billet (`NOT ALLOWED`). 170→175.
- **6/8 — DL** suppression de segment : en relisant `cancelElements` (logique XE), tous les autres
  types d'éléments sont déjà réellement supprimés par XE (pas juste historisés) — `DL` n'a donc de
  sens réel QUE pour les segments (`NOT ALLOWED` pour tout le reste, rediriger vers XE). Mêmes
  garde-fous que XE (`NOT ALLOWED - TST SEGMENT`, `NOT ALLOWED - LAST SEGMENT`), restitution
  d'inventaire. 175→182 tests.
- **7/8 — SI ARNK** : élément d'itinéraire neutre (aucune détection automatique de trou de
  continuité n'existait — rien à « supprimer » comme avertissement). Compatible XE/DL comme un
  vrai segment. 182→187 tests.
- **8/8 — TKOK/TKXL** : refactor de `pnr.tktl` (date simple) vers `pnr.tk = {kind, date}` — un
  seul élément TK par PNR (poser `TKOK` après `TKTL` remplace, n'additionne pas). 187→192 tests.
- **Écart de fidélité NON traité, à trancher** : `docs/COMMANDES-MANQUANTES.md` et le libellé de
  Mission 15 dans `missions/README.md` mentionnent aussi la correction de `ET` (traité aujourd'hui
  comme une émission de billet, alors qu'en vrai Amadeus `ET` = End Transaction, jumeau de `ER`,
  et seul `TTP` émet). **Mais la liste numérotée de `missions/MISSION-15.md` §Commandes à
  implémenter ne contient PAS ce point** (8 items listés, ET absent) — periomètre non élargi de ma
  propre initiative (CONSTITUTION §6). Signalé pour arbitrage : implique un changement de
  comportement significatif (ET n'émettrait plus de billet), qui casserait une bonne partie des
  tests de cette session utilisant `ET` comme raccourci pour « émettre un billet ». Proposé comme
  item dédié d'une mission future (voir Backlog ci-dessous).
- Suites : core 137→192 (+55), typecheck/lint verts après chaque commande, web (22) + e2e (10)
  verts en fin de mission, production vérifiée (`/api/verify-key` répond toujours correctement
  après déploiement — mission 100% `packages/core`, pas de changement web/functions).
- **Enchaînement immédiat sur MISSION-16** dans la même session (règle de la chaîne).

### 06/07/2026 — Mission 06 (accès par clé + habillage commercial v1)
- Décisions Massy en début de session : canal « demander un accès » = e-mail
  (massinissa.mehdani@gmail.com) ; wording de la proposition de valeur proposé par l'assistant.
- **Validation des clés côté serveur** : `functions/api/verify-key.js` (Cloudflare Pages
  Function), `POST {key} -> {valid}`. Clés jamais en clair : hachés SHA-256 dans la variable
  d'environnement Cloudflare `ACCESS_KEY_HASHES`. Anti-abus minimal (réponse identique clé
  absente/invalide/config vide, délai plancher 300ms, pas de listing).
- **Repli client documenté** (`VITE_FALLBACK_KEY_HASHES`, vide par défaut donc inactif en prod) :
  utilisé uniquement par les tests (clé `GDS-TEST-0001`, pas un vrai secret) — voir `CLAUDE.md`
  Phase 3 pour le détail du compromis accepté.
- **Écran d'accès** (`AccessGate.jsx`) : clé mémorisée en `localStorage`
  (`simulateur-amadeus:access-key-valid`), erreur sobre si invalide, terminal jamais monté sans
  clé validée (vérifié y compris en rechargeant/rappelant l'app directement).
- **Page d'accueil enrichie** (`Onboarding.jsx`) : proposition de valeur + public cible, aperçu
  du terminal réel-rendu (composant statique, pas une image), bouton « J'ai une clé d'accès »,
  bouton « Demander un accès » (mailto), disclaimer conservé.
- **FR/EN** : `apps/web/src/i18n/dictionary.js` (dictionnaire plat) + `useLang.js` (bascule
  mémorisée, FR par défaut). Le terminal reste en anglais Amadeus-authentique.
- **Outil de gestion des clés** : `scripts/generate-keys.mjs` — génère N clés `GDS-XXXX-XXXX`,
  écrit un CSV en clair dans `keys/` (gitignored) + affiche les hachés à coller dans Cloudflare.
  Usage documenté dans `README.md` §Gestion des clés (ajout/révocation sans toucher au code).
- Suite web passée à 22 tests Vitest (+11 : `keyHash.test.js`, `AccessGate.test.jsx`,
  `App.test.jsx` réécrit) ; Playwright étendu (10 scénarios au total, `onboarding.spec.js`
  réécrit pour couvrir accueil FR/EN + clé valide/invalide/persistance ; `terminal.spec.js` ajusté
  pour poser aussi le flag de clé validée). CI (`ci.yml`) injecte le haché de test pour l'étape
  e2e — aucun secret réel requis. Toutes les suites (core/data/web/e2e/lint/typecheck) vertes.

### 06/07/2026 — Mission 05 (déploiement public)
- Déployé sur Cloudflare Pages : **https://gds-amadeus-simulateur.pages.dev/**. Redéploiement
  automatique sur push `main` confirmé (plusieurs push, chacun a déclenché un build+deploy).
  Séquence complète AN→SS→NM→AP→RF→ER→RT vérifiée en production (Record Locator généré,
  onboarding + disclaimer visibles).
- **Bug 1 (déploiement échoue)** : premier essai créé un **Worker** (flux unifié Cloudflare
  "Workers & Pages") au lieu d'un projet Pages classique → `wrangler deploy` échouait
  ("application detection... run in the root of a workspace"), aucun `wrangler.jsonc` dans le
  repo pour lever l'ambiguïté du monorepo. Ajout de `wrangler.jsonc` (assets-only, pointe vers
  `apps/web/dist`) ; Massy a finalement recréé le projet en Pages classique, qui a fonctionné.
- **Bug 2 (titre "frontend" en prod)** : après déploiement réussi, la page affichait encore le
  titre par défaut de Vite au lieu du vrai titre/lang/description. Fausse piste explorée d'abord
  (cache de build Cloudflare, comportement `emptyOutDir` du bundler expérimental
  `rolldown-vite` — ni l'un ni l'autre n'était la cause, même si les deux correctifs ajoutés
  restent en place par hygiène, sans nuire). **Cause réelle** : `apps/web/index.html` (titre,
  `lang="fr"`, meta description) existait comme modification locale **jamais committée** depuis
  la session Phase 2 onboarding — chaque déploiement construisait donc le vrai template Vite
  resté en l'état dans git. Corrigé en committant le fichier.
- Jeton API Cloudflare (scope Pages, créé par Massy pour cette session) utilisé pour diagnostiquer
  et corriger via l'API (lecture des logs de build, désactivation temporaire du cache de build,
  déclenchement de déploiements de test) — révoqué par Massy après la mission.

### 05/07/2026 — Mission 04 (fidélité visuelle du terminal)
- `docs/FIDELITE-VISUELLE.md` créé : Massy a comparé le terminal au vrai Amadeus (expérience
  terrain) → **aucun écart visuel signalé**. Aucune modification cosmétique nécessaire.
- **Bug critique trouvé et corrigé pendant la vérification** (hors périmètre visuel, corrigé
  immédiatement — CONSTITUTION §5) : `splitANFilter()` (filtre compagnie `AN.../XX`) était
  appliqué à **toutes** les commandes dans `Terminal.jsx`, pas seulement AN. Toute commande
  contenant un `/` dont les 2 derniers caractères formaient un motif de 2 lettres se faisait
  tronquer avant d'atteindre le moteur. Cassait silencieusement `NM1<nom>/<prénom>` (signalé par
  Massy — "le nom est une variable", le bug ne dépendait d'aucun nom précis), `OP<date>/<texte>`,
  `TKTL/<date>`. Corrigé : le split ne s'applique que si la commande commence par `AN`.
- Un test Playwright existant ("full happy path") passait par accident depuis le début (il ne
  vérifiait que la ligne échouée affichée, jamais le contenu réel du PNR) — corrigé pour vérifier
  le Record Locator. Tests de non-régression ajoutés (Vitest + Playwright) pour NM/OP/TKTL avec
  un `/`.
- Suite web passée à 11 tests Vitest (+1), 8 Playwright inchangés, tout vert après le fix.

### 05/07/2026 — Mission 03 (messages d'erreur fidèles Amadeus)
- `docs/ERREURS-AMADEUS.md` créé : inventaire exhaustif des 30 messages d'erreur de
  `packages/core`. 4 déjà conformes (Phase 5 Étape 1), 3 confirmés/corrigés cette session
  (NO NAME, NOTHING TO CANCEL, END PNR FIRST), 1 hors périmètre (message technique interne),
  1 point business confirmé mais non traité (voir Backlog), 21 encore « à vérifier » sans urgence.
- **DATA-1 corrigé** (repris du Backlog Mission 02) : AN/TN/SN consultent maintenant
  `deps.locations.findByIata()` (nouvelle méthode exposée par `packages/data`) et renvoient
  `NOT IN TABLE` pour un code ville inconnu, quand un provider est configuré. Bug de câblage
  trouvé et corrigé au passage : `resolveDeps` ignorait silencieusement un provider qui n'expose
  que `findByIata` sans `decodeIata`/`searchByText`. Ajout de `PAR` (code ville) aux données
  réelles ; correction d'une course dans `Terminal.jsx` (le fetch de `locations.json` n'était
  attendu que pour DAC/DAN, jamais pour AN/TN/SN) ; mock de fetch ajouté au setup Vitest web.
- **FXR corrigé** : ne doit pas exiger de NM (contrairement à FXP/FXB), confirmé par Massy.
  Contrôle `NO NAME` retiré de FXR (resté correctement absent de FXL).
- Suite core passée de 131 à 137 tests, toutes vertes après chaque fix (core/data/web/e2e/lint/
  typecheck + CI GitHub).

### 05/07/2026 — Mission 02 (close)
- `AUDIT-COMMANDES.md` créé : grille CONSTITUTION §2 pour les ~35 commandes du dispatcher.
- 5 bugs trouvés, corrigés et testés (1 commit par famille) :
  - **SS ne décrémentait jamais l'inventaire de sièges** (`state.lastAN`) → survente/duplication
    de segments illimitée sur la même ligne/classe. C'est l'exemple même cité par
    CONSTITUTION §3. Corrigé : décrément de `paxCount` à chaque vente réussie.
  - **FXP/FXR/FXB tarifaient sans aucun NM dans le PNR** (repris de la session précédente,
    "Bug 5", jamais terminé). Nouvelle erreur `NO NAME`.
  - **AP acceptait un payload vide** sans validation (seule commande PNR sans garde-fou).
    Alignée sur RM/OP/RF/etc. : `CHECK FORMAT` si vide.
  - **VOID re-validait silencieusement un billet déjà void** si son numéro exact était fourni.
    Retourne maintenant `NOTHING TO CANCEL`.
  - **NM-1** : noms avec apostrophe/tiret rejetés (`O'BRIEN`, `JEAN-PIERRE`) — repris de l'ancien
    "Bug 4", confirmé par Massy dans cette mission. Classe de caractères étendue à `[A-Z'-]+`.
- 1 point identifié mais **non corrigé**, documenté dans `AUDIT-COMMANDES.md` et ci-dessous
  (DATA-1 : AN/TN/SN sans validation de code ville — hors périmètre d'un correctif contenu).
- Suite core passée de 123 à 131 tests (8 tests golden ajoutés), toutes vertes après chaque fix.

### 05/07/2026 — Mission 01 (close)
- Déblocage Git : verrous `HEAD.lock`/`index.lock` orphelins supprimés (aucun process git actif),
  `git fsck` propre (seulement des commits "dangling" normaux, tolérés), push des commits en
  attente fait.
- 6 suites/contrôles au vert côté Windows : `test` (123), `test:data` (2), `test:web` (10 Vitest),
  `test:e2e` (8 Playwright), `lint`, `typecheck` core.
- `npm audit fix` : 5 vulnérabilités (@babel/core, brace-expansion, flatted, js-yaml, postcss)
  corrigées sans casse, 0 vulnérabilité restante, suites re-vérifiées au vert après fix.
- Renommage `FIDELI~1.MD` → `FIDELITE_AMADEUS_COMPARAISON.md` (nom court Windows 8.3 committé par
  accident) via `git mv`, aucune référence cassée.
- Triage des 11 branches distantes dormantes : les 11 étaient mergées ou obsolètes, aucun apport
  à préserver. PR #6 fermée avec commentaire (contenu déjà porté en Phase 0). Toutes les branches
  supprimées côté distant ; `git branch -r` = `origin/main` uniquement. Détail :
  - `codex/stabilize-core-first-architecture`, `copilot/lot-2-datastore-clean`,
    `fix/monorepo-workspaces-data`, `lot3-an-offline-improved`,
    `lot4d-pricing-ultra-realistic-taxes`, `refactor-engine`,
    `ux/amadeus-terminal-scroll-anselect-history-alt` : 0 commit unique vs main, déjà mergées.
  - `codex/stabilize-core-first-architecture-oo2898` (PR #2) : DataStore redondant, déjà
    diagnostiqué et fermé sans merge en Phase 0.
  - `lot4-pricing-amadeuslike` : pricing FXP/FXB/FXR/FXL basé sur une architecture pré-refactor
    (`options` au lieu de `deps`) ; refait autrement et mieux sur main (commits PRC-1→5, Lot 4d).
  - `ux/amadeus-mode-b-scroll-an-token-filter` (PR #6) : 6 apports déjà portés manuellement dans
    `Terminal.jsx` en Phase 0.
  - `ux/an-filter-and-class-selection` : filtre compagnie + curseur clignotant déjà livrés
    autrement sur main. Un détail cosmétique non repris → voir Backlog.
- Décision `package-lock.json` (validée par Massy) : committer le lock. Retiré du `.gitignore`,
  `npm install` puis `npm ci` vérifiés localement (0 vulnérabilité, 281 packages), CI GitHub
  Actions basculée de `npm install` vers `npm ci` + cache npm (`actions/setup-node` `cache: npm`).
  Toutes les suites re-vérifiées au vert après le `npm ci` local.
- Rituel de clôture : `TASKS.md` (ce fichier), `CLAUDE.md` et `PROJECT_MEMORY` mis à jour, tout
  commité et poussé sur `main`.

## Backlog

> Amélioration recommandée / idée d'évolution → ne pas implémenter sans validation explicite de
> Massy (CONSTITUTION §5). Bug critique / incohérence → à traiter en priorité dès qu'une mission
> les couvre.

- **Amélioration recommandée** : espacement fixe de 12ch après le `>` du prompt (`.prompt-gap`),
  vu dans la branche supprimée `ux/an-filter-and-class-selection`. Cosmétique, non implémenté —
  à valider avec Massy si jugé utile (pas indispensable à la fidélité Amadeus).
- **Amélioration recommandée** (trouvée en corrigeant le bug e2e admin du 06/10/2026) :
  `apps/web/playwright.config.js` (suite e2e principale) lance aussi `wrangler pages dev` sans
  `--persist-to`, donc sur le même D1 local persistant du dépôt entre deux runs — mais c'est
  volontaire et déjà documenté (`scripts/seed-e2e-test-license.sql` : licence fixture
  `GDS-TEST-0001` insérée de façon idempotente, palier école/4 postes choisi explicitement pour
  absorber la variance d'empreinte appareil entre runs/workers). Pas un bug : contrairement à la
  suite e2e admin, aucune collision de locator n'a jamais été observée ici. Isoler aussi cette
  suite avec un répertoire temporaire (même motif que l'admin et `functions/__tests__`) la
  rendrait plus cohérente avec le reste du projet, mais ce n'est qu'un confort de robustesse, pas
  une correction — à valider avec Massy avant de la traiter.
- **Observation mineure, non traitée** (vue en re-testant après le fix e2e admin du 06/10/2026) :
  `functions/__tests__/testServer.js` a occasionnellement échoué sur un `EPERM` Windows en
  nettoyant son répertoire D1 temporaire (`rmSync` dans `stop()`) alors que les 19 tests
  eux-mêmes passaient tous — probablement le process `wrangler` qui n'a pas encore relâché son
  verrou sur le fichier SQLite au moment du `rmSync`. Flaky, pas reproductible à volonté (repassé
  vert au 2ᵉ essai), aucun changement de code pour cette session. À creuser seulement si ça
  revient souvent en pratique (CI Linux non concerné — ce comportement de verrouillage de fichier
  est spécifique à Windows).
- **Bug critique confirmé, mission dédiée future (SS liste d'attente HL/UC)** : SS refuse
  purement la vente si la classe est à 0 siège ou si le nombre de pax dépasse le disponible.
  **Confirmé par Massy (05/07/2026, Mission 03)** : le vrai Amadeus met en liste d'attente
  (statut de segment `HL`/`UC`) au lieu de refuser. Le simulateur ne crée aujourd'hui que des
  segments statut `HK`. Chantier plus large qu'un wording : revoir la logique SS/statuts de
  segment, l'affichage RT des statuts HL/UC, probablement une commande de confirmation HL→HK.
  Détail dans `docs/ERREURS-AMADEUS.md`. Non traité dans Mission 03 (hors périmètre message).
- **Formulations encore à vérifier** (21 messages, sans urgence, aucun impact fonctionnel connu
  au-delà du texte affiché) : voir la table complète dans `docs/ERREURS-AMADEUS.md`.
