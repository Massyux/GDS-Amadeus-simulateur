# JOURNAL — Simulateur Amadeus GDS / Orionis Academy

> **Historique daté, séparé de `TASKS.md` le 09/10/2026 par l'architecte.**
>
> Pourquoi : `TASKS.md` avait atteint 1416 lignes (122 Ko). Il est relu à chaque démarrage de
> session, donc son historique se repayait intégralement à chaque fois — environ 30 000 tokens
> avant d'écrire la première ligne de code, et le coût augmentait à chaque session ajoutée.
>
> **Rien n'a été supprimé.** Tout le contenu ci-dessous se trouvait dans `TASKS.md` §Fait et en
> est le report exact, dans le même ordre (plus récent en premier).
>
> **Règle d'usage :** `TASKS.md` reste le fichier vivant (état courant, reprise exacte, backlog)
> et c'est le seul à lire au démarrage. Ce journal ne se lit **que** pour répondre à une question
> précise sur le passé (« qu'est-ce qui a été décidé le jour où… », « pourquoi ce choix »).
> Ne jamais le charger « pour se mettre en contexte ».
>
> **À la clôture d'une session**, la nouvelle entrée datée s'ajoute ici, en haut de la section
> §Fait, et `TASKS.md` §En cours est mis à jour — pas l'inverse, et pas les deux fois.

---

## Fait (par session, datée)

### 22/10/2026 — Le terminal et l'administration deviennent adaptatifs

`missions/PROMPT-MOBILE.md` : constat et mesures de l'architecte, confirmés par Massy sur son
téléphone. Aucune des deux zones n'avait la moindre règle CSS mobile — la feuille servie sur
`/demo` ne contenait qu'une requête média, `print`. Mesuré : une ligne de 80 colonnes occupe
~768px à 16px de police (la police par défaut du terminal) ; un téléphone en fait 390.
Priorité haute explicite : `/demo` est le premier écran d'un visiteur qui clique « Essayer le
terminal », et l'essentiel du public algérien arrive par téléphone via les réseaux sociaux.

**Décision d'architecture imposée, appliquée telle quelle** : jamais de retour à la ligne sur
une sortie de terminal (l'alignement des colonnes EST l'information sur un écran Amadeus —
replier détruit le contenu et apprend à lire un écran qui n'existe pas), jamais de réduction à
l'échelle (`transform: scale`, revient au même problème en plus flou). Retenu : défilement
horizontal + police réduite sur petit écran.

**Le terminal, aux quatre portes à la fois** (`apps/web/src/index.css`, feuille unique partagée
par la démo publique, le mode libre `/simulateur`, la leçon `simulateur` et la leçon `exercice`
— une seule passe suffit, toutes les quatre montent le même `Terminal.jsx` habillé par les mêmes
classes) :
- `.screen` : `white-space: pre` remplace `pre-wrap` (chaque ligne le posait déjà
  individuellement, mais le conteneur lui-même l'affirme maintenant, pour toute future leçon qui
  l'oublierait) + `overflow-x: auto` explicite (ne plus compter sur la conversion implicite du
  navigateur) + indice visuel de défilement : ombre sur le bord droit tant qu'il reste du
  contenu, en CSS pur à deux calques (`background-attachment: local` qui se déplace avec le
  contenu masque un calque `scroll` fixe par rapport au viewport — l'ombre s'efface exactement
  au bout du défilement, jamais avant). Vérifié réellement par capture d'écran avant/après
  défilement, pas seulement en lisant le CSS.
- `.terminal` : police réduite à 13px sous 480px (80 colonnes passent d'environ 768px à ~600px,
  donc beaucoup moins de défilement nécessaire) — portée à `.terminal` seul, pas à `:root`, pour
  que tout ce qui vit dessous (prompt, lignes, PNR) suive en cascade via les unités `em` déjà en
  place, sans toucher à l'onboarding ni à l'admin.
- `.terminal`/`.demo-page`/`.exercise-mode` : `height: 100dvh` en seconde déclaration après
  `100vh` (ignorée par les navigateurs qui ne connaissent pas `dvh`, sans `@supports`) — le
  clavier virtuel ouvert ne cache plus le champ de saisie, puisque `dvh` suit la hauteur visible
  réelle alors que `vh` ne bouge pas sur mobile.
- `LandscapeHint.jsx` (nouveau) : suggestion de passage en mode paysage, montée directement dans
  `Terminal.jsx` — couvre les quatre portes d'un seul coup, même geste déjà établi pour
  `FeedbackButton`/`QuickStartGuide`. Jamais une modale : une bannière visible seulement sous
  480px en portrait (CSS), fermée définitivement via `localStorage` (pas `sessionStorage` : une
  fois pour de vrai, pas une fois par visite). 4 tests unitaires dédiés.
- Puces de commandes d'exemple et champ de saisie : hauteur de cible agrandie sous 480px
  (padding de `.demo-hint-chip`) ; `.exercise-toolbar` se replie (`flex-wrap`) plutôt que de
  déborder avec ses trois boutons sur un écran étroit.

**L'administration, après le terminal comme demandé** : les trois tableaux (licences, journal,
formations) vivent désormais dans un conteneur à défilement horizontal dédié
(`.admin-table-scroll`, un `<div>` ajouté dans les trois fichiers JSX concernés) — jamais la
page entière, et sans perdre une seule colonne (le tableau des licences mesurait ~1287px).
En-têtes figés jugés non « simples » ici et donc pas faits : la vraie zone de défilement vertical
reste la page entière, pas ce conteneur (qui n'a pas de hauteur bornée) — un `position: sticky`
dessus n'aurait rien eu à quoi s'accrocher. Padding horizontal réduit sous 480px (logo, onglets,
contenu — les trois ensemble, pour ne pas désaligner les bords verticaux) ; `.admin-header-actions`
se replie (la barre de l'éditeur de formation — « Retour aux formations »/« Supprimer la
formation »/« Déconnexion » — mesure à elle seule ~390px de texte, déborderait sans ça à 360px).

**Bug réel trouvé PAR le garde-fou demandé, pas par relecture visuelle** : le constat initial du
prompt affirmait l'accueil public « correct, mesures à l'appui ». Le nouveau test
`document.documentElement.scrollWidth <= clientWidth` à 390px l'a contredit : 402 au lieu de 390.
Diagnostiqué par parcours récursif du DOM (pas une supposition) jusqu'à `.pf-termglow` — le halo
décoratif derrière le mock-terminal du héros (`inset: -28px`, jamais clippé par un ancêtre).
Corrigé à la racine commune de toutes les pages publiques, `.platform-root` (`overflow-x:
hidden`) plutôt que sur `.pf-termwrap` directement : un filet de sécurité pour toute la famille
de halos/dégradés décoratifs à bavure négative (`.pf-halo-1/2/3` compris), pas un correctif
isolé — règle d'or des familles de bugs (CONSTITUTION §3). Rendu visuel strictement inchangé
(vérifié : le halo continue de « baver » exactement pareil) ; seul le défilement fantôme
disparaît. Vérifié aussi sur le catalogue, le compte et la fiche de formation connectés : aucun
autre débordement cliché par erreur par ce filet.

**Garde-fou permanent ajouté** (`apps/web/e2e/responsive-overflow.spec.js`, demandé
explicitement) : aucun débordement horizontal à 390px sur l'accueil, `/demo`, `/app`, `/admin`,
`/conditions`, `/remboursement`, `/simulateur` (avec un vrai `AN15DECALGPAR` lancé et vérification
que c'est bien `.screen`, jamais la page, qui défile), le catalogue/compte/fiche de formation
connectés. Même garde-fou côté admin (`e2e-admin/admin.spec.js`) : le tableau des licences défile
dans son propre conteneur à 390px, jamais la page.

**Vérifié réellement en production, par émulation d'appareil (pas par redimensionnement de
fenêtre — l'architecte avait prévenu que Chrome refuse de redimensionner une fenêtre maximisée,
ce qui avait failli lui faire manquer le défaut)**, à 390px **et** 360px : aucun débordement
horizontal nulle part (accueil, `/demo`, `/admin`) ; police du terminal à 13px ; un vrai
`AN15DECALGPAR` reste aligné en colonnes et se parcourt horizontalement par capture d'écran
avant/après défilement (le `/ALG PAR` de fin de ligne, invisible avant, apparaît après) ; la
bannière de suggestion de mode paysage s'affiche. Administration authentifiée non re-vérifiée en
production cette fois (Massy a préféré garder sa phrase secrète pour lui, comme la session
précédente) — couverte par `e2e-admin` contre une vraie Function + D1 locale à la place.

**Fait par ailleurs, hors scope de cette session mais découvert en chemin** : `docs/
DESIGN-SYSTEM.md` portait encore la règle « le terminal reste sombre dans les deux thèmes »,
retirée (travail non commité d'une session antérieure, intégré ici) — elle contredisait une
décision déjà vérifiée avec Massy (`docs/FIDELITE-VISUELLE.md`) : le fond clair `#dde5f4` EST la
fidélité au vrai Amadeus Selling Platform, pas un défaut à corriger.

**Non-régression complète** : lint/build/typecheck clean ; 268/268 `packages/core`, 9/9
`packages/data`, 47/47 `packages/exercises`, 117/117 web (4 nouveaux pour `LandscapeHint`),
90/90 `functions/__tests__`, 67/67 e2e (8 nouveaux dans `responsive-overflow.spec.js`), 8/8
e2e-admin (1 nouveau).

### 17/10/2026 — Fiche de formation publique, vitrine d'accueil réelle, accès admin sans URL

`missions/PROMPT-FICHE-FORMATION.md` : demande de Massy après la correction du terminal clair
sur `/demo`, trois chantiers en vue de la vraie formation « Amadeus — Niveau 1 » que Massy va
créer depuis l'administration. Référence de mise en page (novasavo.com), parcourue par
l'architecte — jamais copiée (textes/couleurs/visuels propres au projet).

**Chantier 1 — on ne tape plus jamais `/admin` à la main.** Lien « Administration » discret
ajouté au pied de page de l'accueil (même niveau que Contact, nouveau composant
`AdminShortcut.jsx` réutilisé aussi dans `PlatformNav.jsx` pour le raccourci de barre de
navigation — invisible tant qu'aucune session admin n'existe dans `sessionStorage`, visible dès
qu'elle existe). Depuis `/admin`, un lien « Retour au site » ramène à l'accueil sans recharger
toute l'app (même mécanique `pushState`/`popstate` que `useRoute.js`, dupliquée volontairement
plutôt qu'importée — l'admin reste un module autonome, sans dépendance vers `platform/`).
`useNoIndex.js` (nouveau) pose une balise `<meta name="robots" content="noindex">` sur `/admin`
et `/demo` — nécessaire parce que `index.html` est unique (SPA) et ne peut pas porter cette
balise par route de façon statique. Audit de la règle « jamais un chemin technique en texte
visible » : zéro violation trouvée dans l'existant (vérifié par recherche exhaustive) — seules
les nouvelles pièces de ce chantier auraient pu y contrevenir, et ne le font pas.

**Chantier 2 — la fiche de formation, cœur de la demande.** `CoursePage.jsx` entièrement
reconstruite : fil d'Ariane, bandeau d'en-tête sombre (titre, catégorie, description, ligne de
repères leçons/durée/niveau/langue), carte d'inscription sticky (visuel, toujours « Gratuit » —
aucun prix n'est inventé puisque l'inscription reste gratuite et immédiate tant que Mission 22
n'existe pas, CONSTITUTION §5), bouton « Commencer la formation »/« Reprendre la formation »
selon l'état, lien « Voir tout le contenu » qui déplie un résumé des modules dans la carte,
« Ce que tu vas apprendre » (objectifs), « Le programme » (type + durée + mention « aperçu
gratuit » par leçon), **« Les documents de la formation » en vraies cartes** (titre, description
courte, poids, bouton de téléchargement — demande explicite de Massy, jamais une liste de liens
bruts), bloc « Le simulateur » autonome et visuellement fort (mène à `/demo`, toujours
joignable, jamais un cul-de-sac même pour une leçon non accessible), panneau
« Caractéristiques » à icônes, encart formateur inchangé (toujours en attente de la vraie
photo). Détail d'implémentation notable : l'icône et le titre d'une leçon forment SEULS le nom
accessible de son lien — les badges de méta (type, durée, aperçu) sont un sibling du lien, pas
à l'intérieur, pour ne pas le polluer (trouvé en répercutant le renommage du bouton d'inscription
sur la suite e2e, voir plus bas).

Rendu public : `/api/courses` et `/api/courses/:slug` n'exigent plus de session (`userId` devient
`null` pour un visiteur anonyme, les champs personnels `enrolled`/`progressPct`/`next*` restent
`false`/`0`/`null` dans ce cas) ; `PlatformApp.jsx` teste désormais la route `/app/cours/:slug`
(et `/app/cours/:slug/lecon/:id`) AVANT le portail de connexion, alors que `/app/catalogue` et
`/app/compte` restent derrière. Une leçon marquée `isPreview` dans son `content` (nouvelle clé
universelle, avec `durationMinutes`, lisible par n'importe quel type de leçon) s'ouvre sans
compte via `/api/lessons/:id`, qui distingue désormais 401 (anonyme, leçon non-aperçu — la page
propose de créer un compte) de 404 (connecté mais pas inscrit — anti-énumération inchangée). Le
cas le plus délicat : un visiteur anonyme qui télécharge le PDF d'une leçon aperçu n'a pas de
`userId` à vérifier contre `enrollments` au moment du téléchargement réel — `isPreview` est donc
embarqué dans le jeton signé lui-même, constaté une seule fois à la génération (où le `content`
réel de la leçon, source de vérité, est lu), jamais re-dérivé d'un `userId` inexistant pour lui
(`functions/_lib/fileAccess.js`, `functions/api/files/download.js`). Nouvelle table
`migrations/0004_course_extras.sql` (`objectives`, `duration_hours` — `CREATE TABLE IF NOT
EXISTS`, le seul motif idempotent déjà prouvé sûr sur ce projet, une vraie `ALTER TABLE` aurait
cassé le rejeu des migrations par la suite e2e principale).

**Chantier 3 — la vitrine d'accueil devient réelle.** `HomePage.jsx` ne lit plus
`data/demoCourses.js` pour sa section « Formations » — un vrai appel à `/api/courses`, avec un
état vide honnête (aucune vignette inventée) tant que rien n'est publié : message sobre + le
terminal de démo reste joignable depuis cet état vide. Vérifié en production avant et après le
chantier : `/api/courses` renvoie bien `{"courses":[]}` aujourd'hui, donc cet état **est** ce
que voit tout visiteur actuel. `data/demoCourses.js` n'est pas supprimé — il reste la seule
source des couleurs/motifs visuels par formation (`CourseVignette.jsx`), déjà réutilisée ainsi
par `CataloguePage.jsx`.

**Bugs trouvés en route et corrigés avant tout commit (famille des régressions de reciblage,
CONSTITUTION §3) :**
- `CoursePage.jsx` perdait `brandTo="/app/catalogue"` pendant la réécriture (remplacé par `"/"`
  par erreur de recopie) — cassait deux e2e qui cliquaient le logo depuis la fiche en étant
  connecté et attendaient le catalogue. Corrigé en conditionnel : `/app/catalogue` si `user`,
  `/` sinon (un visiteur anonyme qui clique le logo depuis la fiche doit atterrir sur l'accueil,
  pas sur un mur de connexion).
- Le libellé du bouton d'inscription est passé de « S'inscrire » à « Commencer la formation »
  (demande du prompt) — deux occurrences oubliées dans `navigation.spec.js`/`platform.spec.js`
  (la troisième avait été renommée), trouvées par l'exécution réelle de la suite e2e, pas par
  relecture.
- Le champ universel « Durée (minutes) » ajouté à `CoursesAdmin.jsx` pour toute leçon entrait en
  collision avec le champ « Durée (minutes) » déjà existant du type `live` (même clé
  `content.durationMinutes`, deux champs visuellement identiques sur le même formulaire — la
  suite e2e admin l'a détecté en violation de mode strict Playwright, mais c'était une vraie
  collision d'écriture, pas qu'un doublon visuel : pour une session live, "durée de la leçon" ET
  "durée de la session" SONT la même valeur réelle). Corrigé en masquant le nouveau champ
  universel pour `type === "live"`.
- `apps/web/playwright.admin.config.js` n'avait pas été mis à jour avec la migration
  `0004_course_extras.sql` (seul `playwright.config.js`, la suite principale, l'avait reçue) —
  la suite e2e admin plantait entièrement sur « no such table: course_extras » dès qu'un
  formulaire touchait `/api/admin/courses/:id` (GET comme PATCH, les deux font le LEFT JOIN).

**Demande complémentaire de Massy, pendant la vérification de production** : ajouter un vrai
bouton de suppression de formation dans `/admin` — jusqu'ici aucune route ne supprimait une
formation entière (`docs/SECURITE.md` §7, « dépublier plutôt que supprimer », délibéré). Ajouté
comme **exception** à cette règle (pas un retour en arrière sur elle — §7 protège une formation
qui a eu de vrais inscrits, pas un brouillon jetable créé pour vérifier un déploiement) :
`DELETE /api/admin/courses/:id` cascade manuellement progression → inscriptions → leçons (+ les
fichiers R2 qu'elles référencent, supprimés après la base) → objectifs/durée → modules →
formation, journalisé dans l'audit log. Bouton « Supprimer la formation » dans l'éditeur,
confirmation `window.confirm` (même convention que les boutons de suppression de module/leçon
déjà existants). Testé côté serveur — y compris la disparition RÉELLE de l'objet R2, pas
seulement des lignes D1, via un jeton d'aperçu forgé qui isole les deux — et côté UI (e2e-admin,
création puis suppression entièrement par clics).

**Vérifié en production, par l'architecte, sans compte admin** (Massy a préféré garder sa phrase
secrète pour lui et faire la suite — création d'une formation jetable, vérification de la fiche
remplie, suppression — de son côté) : l'état vide honnête de l'accueil (`/api/courses` répond
bien `{"courses":[]}`), le terminal de démo toujours joignable depuis cet état vide, et le lien
« Administration » du pied de page qui mène bien à l'écran de connexion admin, sans jamais taper
l'URL. Migration `0004_course_extras.sql` appliquée en `--remote` sans l'aléa réseau documenté
le 11/10/2026 (`--file` a fonctionné du premier coup cette fois).

**Non-régression complète** : lint/build/typecheck clean ; 268/268 `packages/core`, 9/9
`packages/data`, 47/47 `packages/exercises`, 113/113 web, 90/90 `functions/__tests__` (dont les
quatre nouveaux describe : aperçu gratuit isPreview, suppression de formation, round-trip
objectives/durationHours), 60/60 e2e, 7/7 e2e-admin (nouveau test de suppression inclus).

### 17/10/2026 — Correction TU/SV et garde-fou étendu aux valeurs, pas seulement aux codes

Suite directe de la session du 16/10 (élargissement des données, entrée ci-dessous). Deux écarts
avaient été signalés sans être corrigés, faute de mandat pour toucher des entrées préexistantes
(« ajoute seulement »). L'architecte a vérifié les deux à la source et tranché :

**`TU` (Tunisair) : vraie erreur, corrigée.** La base portait le préfixe numérique `083`. Ce
n'est pas une variante acceptable ni une question de convention — **083 est le préfixe IATA de
South African Airways** (`SA`, déjà correctement enregistré avec cette valeur dans la même base),
confirmé par l'architecte via la liste des membres IATA et le fichier de la Chambre de
compensation IATA, qui écrit explicitement « TU-199 ». Corrigé à `199`
(`apps/web/public/data/airlines.json`, une seule ligne changée).

**`SV` (Saudia) : alignement sur la fiche, pas une erreur de fait.** La base portait le nom
`SAUDI ARABIAN AIRLINES`, dénomination légale toujours exacte. L'architecte a choisi d'aligner
sur `SAUDIA`, la marque commerciale actuelle, parce que c'est elle qui est imprimée sur la fiche
distribuée aux élèves — un élève qui tape `DNA SV` doit retrouver exactement ce qu'il a lu en
cours, pas une dénomination légale qu'il n'a jamais vue.

Les douze autres compagnies préexistantes (`AH`, `AF`, `TK`, `PC`, `AT`, `DL`, `AA`, `BA`, `LH`,
`EK`, `QR`) ont été revérifiées par l'architecte lui-même contre les fiches et confirmées exactes
— consigne explicite de ne pas refaire ce contrôle, suivie telle quelle.

**Le vrai sujet de cette session, au-delà des deux corrections** : le garde-fou
`dataCoverage.test.js` écrit la veille ne vérifiait que la *présence* d'un code enseigné dans les
données — jamais l'exactitude de sa valeur. Il n'aurait jamais détecté `TU=083` : le code
existait, il répondait, juste avec un mauvais chiffre. Un chiffre faux a pu rester en production
sans qu'aucun test ne le signale, précisément le scénario que le garde-fou était censé empêcher.

**Correction structurelle, pas un simple patch de valeurs.** `apps/web/src/data/
ficheCoverage.json` entièrement régénéré : il portait jusqu'ici deux listes de codes nus
(`locationCodes`, `airlineCodes`) ; il porte désormais les **valeurs complètes** transcrites des
fiches — `city`/`country` pour chacun des 226 aéroports, `numeric`/`name` pour chacune des 105
compagnies (y compris, pour la première fois, les 28 aéroports et 13 compagnies préexistants,
qui n'avaient jamais été comparés à leur source avant cette session — vérification indépendante
qui confirme au passage qu'aucun des 28 aéroports préexistants n'avait d'erreur de ville ou de
pays, contrairement à `TU`). `apps/web/src/dataCoverage.test.js` compare désormais champ par
champ : un aéroport dont la ville ou le pays diffère de la fiche fait échouer le test, même si
son code IATA est bien présent — plus un test dédié qui rejoue `DNA TU` (doit contenir `199`,
ne doit jamais contenir `083`) et `DNA SV` (doit contenir `SAUDIA`, ne doit jamais contenir
`SAUDI ARABIAN AIRLINES`) sur le vrai moteur, pour que cette régression précise ne puisse plus
jamais repasser inaperçue.

**Non-régression complète** : lint clean, 268/268 `packages/core`, 9/9 `packages/data`, 113/113
tests web (112 existants + le nouveau test de régression dédié TU/SV), 59/59 e2e (dont les
scénarios golden ALG→PAR de `terminal.spec.js`, inchangés), 6/6 e2e-admin.

**Vérifié en production après déploiement** : `DNA TU` affiche `199`, `DNA SV` affiche `SAUDIA`.

### 16/10/2026 — Élargissement des données du simulateur (locations.json/airlines.json) à la formation Amadeus niveau 1

Prompt de l'architecte (`missions/PROMPT-DONNEES-SIMULATEUR.md`) : le contenu de la formation
« Amadeus niveau 1 » venait d'être produit (présentation, six fiches PDF, cours écrit, dans
`D:\cowork\formation-amadeus-n1\`) et enseignait environ 250 aéroports et 100 compagnies, alors
que le simulateur n'en connaissait que 25 et 12. Un élève tapant un code appris en cours
(`DAN DUBAI`, `AN15DECALGDXB`) obtenait une erreur et croyait s'être trompé — défaut pédagogique
qui ruine la confiance dans l'outil. Décision de Massy, rappelée dans le prompt : les fiches sont
la référence métier, c'est le simulateur qui s'élargit — pas l'inverse, et sans toucher au moteur.

**Source des données.** Aucun fichier de données Python trouvé dans le dossier de travail de
l'architecte (`D:\cowork\formation-amadeus-n1\`, vérifié aussi plus largement dans `D:\cowork\`)
— seuls les PDF existaient. Extraction directe des trois fiches concernées : `03-aeroports-
algeriens.pdf` (35 aéroports algériens, dont 12 déjà présents), `04-aeroports-du-monde.pdf`
(~191 aéroports internationaux par région, dont 16 déjà présents), `05-compagnies-
aeriennes.pdf` (105 compagnies, dont 13 déjà présentes). Les comptages collent à ce que le
prompt annonçait (« environ 250 aéroports », « 100 compagnies ») : 226 au total pour les
aéroports (35 Algérie + 191 monde, moins les doublons déjà en place), 105 pour les compagnies.

**Décision prise sans consigne explicite, documentée ici plutôt que devinée en silence** : les
fiches sont rédigées en français (« LONDRES », « FRANCFORT », « ÉGYPTE »...), mais les 16 entrées
déjà présentes dans `locations.json` avant cette passe utilisaient systématiquement les noms
anglais (`LONDON`, `FRANKFURT`, `EGYPT`...) — convention Amadeus authentique, cohérente avec le
reste du projet (le terminal reste en anglais même quand l'enveloppe pédagogique est en
français). Toutes les nouvelles entrées ont donc été anglicisées ville par ville et pays par
pays (ex. « Dubaï » → `DUBAI`, « Köweït » → `KUWAIT`, « Maroc » → `MOROCCO`), pas transcrites
telles quelles depuis le PDF — vérifié par relecture contre chacune des 16 entrées déjà en place
pour garantir la cohérence du style.

**Incident évité en construisant les données** : le script générateur temporaire (jeté après
usage) avait d'abord oublié que `TUN` (Tunis) existait déjà dans `locations.json` — détecté par
un contrôle automatique de doublons dans le script lui-même avant toute écriture dans le vrai
fichier, corrigé avant que ça ne devienne un problème. Même contrôle appliqué aux 92 nouvelles
compagnies : aucun doublon, ni avec l'existant ni en interne à la nouvelle liste.

**Ajout pur, confirmé par `git diff`** : la demande explicite était de ne modifier aucune entrée
existante. Première tentative avec `JSON.stringify(..., null, 2)` sur tout le tableau fusionné
a reformaté chaque ligne de `airlines.json` (passage d'un style compact une-ligne-par-objet à un
style étalé) — un diff de 538 lignes pour 92 vraies additions, bruit qui aurait masqué ce qui
change réellement. Corrigé en régénérant le fichier à la main dans le style compact d'origine :
diff final de 94 lignes pour 92 additions, une seule ligne non additive (la virgule de syntaxe
ajoutée à la fin de l'ancienne dernière entrée). `locations.json` était déjà formaté en
multi-lignes par objet, donc `JSON.stringify` n'a touché qu'une ligne vide parasite entre deux
entrées existantes (pas un changement de contenu).

**Codes de ville (PAR/LON/NYC).** La fiche 04 signale explicitement trois regroupements :
« PAR pour Paris, LON pour Londres, NYC pour New York ». `PAR` existait déjà en `type: "C"`.
`LON` et `NYC` ajoutés avec le même type, leurs aéroports constitutifs (CDG/ORY/BVA pour Paris,
LHR/LGW/STN pour Londres, JFK/EWR/LGA pour New York) restant en `type: "A"` — vérifié par un
test dédié. Bangkok (BKK+DMK), Milan (MXP+LIN), Moscou (SVO+DME), Pékin (PEK+PKX), Tokyo
(NRT+HND), Bruxelles (BRU+CRL), Dubaï (DXB+DWC) et Istanbul (IST+SAW) ont aussi plusieurs
aéroports mais **aucun** code de ville dédié dans la fiche — traités comme deux aéroports
distincts de même ville, pas comme un regroupement, conformément à ce que la fiche enseigne
réellement (ne pas inventer un regroupement que les élèves n'apprennent pas).

**Garde-fou automatique** (demande explicite du prompt : « écris un test qui le vérifie
automatiquement »). `apps/web/src/data/ficheCoverage.json` : photographie figée des 226 codes
aéroport/ville et 105 codes compagnie enseignés, distincte des fichiers de données eux-mêmes
(sinon le test ne vérifierait jamais rien — il comparerait un fichier à lui-même). `apps/web/src/
dataCoverage.test.js` (11 tests) : (1) chaque code du manifeste résout dans `locations.json`/
`airlines.json` ; (2) PAR/LON/NYC sont bien de type C, leurs aéroports constitutifs de type A ;
(3) aucun code dupliqué ; (4) le **vrai moteur** (`packages/core` + `packages/data`, même
câblage que `Terminal.jsx` : `createInMemoryStore`/`createLocationProvider`/
`createAirlineProvider`) répond correctement à `DAC DXB`, `DAN DUBAI`, `AN15DECALGIST`,
`AN15DECALGDXB`, aux trois codes algériens secondaires (`TMR`/`BSK`/`GHA`), aux trois compagnies
(`QR`/`EK`/`TK`), et à deux codes nouvellement ajoutés par cette passe (`CBH`/Béchar,
`6R`/Tassili Airlines, ce dernier avec un préfixe numérique vide comme prévu par le prompt).
**Limite assumée et documentée dans le test lui-même** : ce garde-fou protège contre une
régression future des données (quelqu'un supprime une entrée par erreur), pas contre l'ajout
futur d'un code dans une fiche sans toucher au dépôt — les PDF vivent hors du dépôt
(`D:\cowork\formation-amadeus-n1\`), jamais parsés automatiquement ; `ficheCoverage.json` devra
être mis à jour à la main le jour où une fiche change, et cette mise à jour fait alors partie de
la tâche, pas une étape optionnelle.

**Bug de wiring trouvé en écrivant le test d'intégration, corrigé avant commit** : première
version du test utilisait `result.lines`, qui n'existe pas sur le retour de `processCommand` —
la vraie forme est `result.events` (tableau de `{type, text}`), confirmé en lisant les tests
existants de `packages/core`. Corrigé (`textOf(result) = result.events.map(e => e.text).join
("\n")`), les 11 tests passent après correction.

**Poids et temps de chargement vérifiés** (demande explicite du prompt), aucun changement de
chargement nécessaire : `locations.json`/`airlines.json` sont déjà chargés à la demande, par un
`fetch()` asynchrone dans `packages/data` (`loadFromUrl`/`loadAirlinesFromUrl`), déclenché au
montage de `Terminal.jsx` — jamais inclus dans le bundle JS (confirmé en lisant le câblage réel,
pas supposé). Poids brut : `locations.json` 4 Ko → 33 Ko, `airlines.json` 0,8 Ko → 6,5 Ko.
Gzippé (ce qui transite réellement sur le réseau) : environ 7 Ko au total pour les deux fichiers
— négligeable pour un fetch unique, non bloquant pour le premier rendu de la page.

**Observation signalée, non corrigée** (hors périmètre explicite « ajoute seulement, ne modifie
pas les entrées existantes ») : l'entrée `TU` (Tunisair) déjà présente porte le préfixe
numérique `083`, alors que la fiche 05 — censée faire référence — indique `199`. L'entrée `SV`
(Saudia) déjà présente porte le nom `SAUDI ARABIAN AIRLINES`, la fiche indique `SAUDIA` (son nom
commercial actuel). Aucune des deux n'a été touchée ; à trancher par Massy s'il souhaite aligner
le simulateur sur la fiche — l'écart est mineur (préfixe de billetterie et nom d'affichage, pas
une faute fonctionnelle) mais réel.

**Non-régression complète** : lint clean, typecheck clean (`packages/core`, `packages/
exercises`), 268/268 tests `packages/core` (inchangés, aucune fixture ne référence les fichiers
de données réels), 9/9 `packages/data`, 112/112 tests web (101 existants + 11 nouveaux), 59/59
e2e **y compris les scénarios golden ALG → PAR de `terminal.spec.js`, restés identiques** (le
point de vigilance explicite du prompt), 6/6 e2e-admin. Les trois suites (web/e2e/e2e-admin) ont
été rejouées **séquentiellement**, pas en parallèle — leçon déjà tirée plusieurs fois cette
semaine sur cette machine (la parallélisation de plusieurs suites Playwright/wrangler lourdes
produit des échecs de contention de ressources, pas de vraies régressions).

**Reste à vérifier en production après déploiement** (demande explicite du prompt) : `DAC DXB`,
`DAN DUBAI`, `AN15DECALGIST`, `AN15DECALGDXB`, trois codes algériens secondaires (`TMR`, `BSK`,
`GHA`), trois compagnies (`QR`, `EK`, `TK`).

### 16/10/2026 — Intégration des deux textes juridiques de Massy, verrouillés derrière un drapeau unique

Massy a rédigé et déposé `docs/legal/CONDITIONS-GENERALES-DE-VENTE.md` et
`docs/legal/POLITIQUE-DE-REMBOURSEMENT.md`, destinés à alimenter `/conditions` et
`/remboursement` (routes créées au chantier 3 de `PROMPT-PASSE-ACCUEIL.md`, 15/10/2026, restées
en état « en préparation » faute de contenu). Règle centrale posée par Massy, respectée à la
lettre : ces brouillons **ne sont pas publiables en l'état** (mentions obligatoires de
l'article 11 de la loi 18-05 absentes — registre du commerce, identifiant fiscal, adresse,
téléphone, prix TTC, prestataire de paiement — et blocs `[À COMPLÉTER]`/`[DÉCISION]` non
tranchés) ; intégrer le contenu dans les pages ne doit **pas** le rendre visible au public.

**Rendu du contenu.** Aucune bibliothèque markdown ajoutée : un rendu minimal maison
(`apps/web/src/platform/legalMarkdown.js` pour le parsing, `LegalMarkdown.jsx` pour le rendu),
couvrant exactement le sous-ensemble utilisé par les deux documents — titres h1/h2, citations
pouvant contenir plusieurs paragraphes, listes à puces, tableaux, règle horizontale, gras et
code en ligne. Les deux fichiers source sont lus tels quels par `LegalPendingPage.jsx` via un
import `?raw` (`../../../../docs/legal/*.md?raw`) : **aucune phrase n'est retranscrite à la
main**, une seule source de vérité (le fichier que Massy édite), pas de copie dupliquée dans
`apps/web/`. Un bug réel trouvé en vérifiant le rendu contre les vrais fichiers (pas une fixture
inventée) : CGV Article 1 contient `` **`.com.dz`** `` (gras ET code imbriqués) — un premier
parseur à une seule passe laissait les accents graves s'afficher tels quels à l'intérieur du
gras. Corrigé par un parsing en deux passes (code d'abord, gras ensuite, avec un niveau de
nesting pour le gras contenant du code) ; 9 tests golden contre les deux documents réels
détectent ce genre de fuite de syntaxe brute pour de bon.

**Le verrou.** Un seul booléen, `LEGAL_CONTENT_PUBLISHED` (`apps/web/src/platform/
legalContentFlag.js`), actuellement à `false` : tant qu'il l'est, `LegalPendingPage.jsx` affiche
toujours l'état « en préparation » habituel, quel que soit l'avancement du contenu réel derrière.
Vérifié que le bundler (rolldown-vite) élimine bien la branche "publié" (imports des deux
fichiers markdown inclus) quand le drapeau est à `false` — chunk `LegalPendingPage` à 0,72 ko —
et la réintègre correctement quand il passe à `true` — 18,26 ko, contenu réel confirmé par
capture d'écran locale (`wrangler pages dev`) avant de repasser le drapeau à `false`. Le switch
fonctionne dans les deux sens, pas seulement en théorie.

**Incident évité en cours de route** : création d'un composant `MarkdownLite.jsx` (M majuscule)
qui, sur le système de fichiers Windows (insensible à la casse), a écrasé le contenu d'un fichier
pré-existant sans rapport, `markdownLite.jsx` (rendu minimal des leçons de type texte, Mission 23
Étape 2, `renderMarkdownLite`). Détecté immédiatement par `git status` (fichier marqué modifié
sans qu'aucune intention ne l'explique), restauré par `git checkout`, et tous les nouveaux
fichiers renommés (`legalMarkdown.js`, `LegalMarkdown.jsx`, `legalContentFlag.js`) pour ne plus
jamais partager un nom de base avec le fichier existant, même en différant par la casse.

**Nouvelle question de conformité, trouvée en intégrant le texte** (pas inventée, elle figurait
déjà dans l'Article 1 des CGV tel que rédigé par Massy) : l'article 8 de la loi 18-05 subordonne
l'exercice du commerce électronique à un site hébergé en Algérie avec une extension `.com.dz`
déposée auprès du CNRC — or `orionisacademy.com` est un `.com` hébergé chez Cloudflare, hors
d'Algérie. Consignée dans `TASKS.md`, à trancher par Massy auprès du CNRC ou d'un avocat avant
Mission 22, indépendamment du reste de son avancement.

**Non-régression** : lint clean, 19/19 fichiers / 101/101 tests web (dont les deux nouveaux
fichiers créés cette session), 59/59 e2e (dont `legal.spec.js`, qui confirme que l'état « en
préparation » reste bien celui vu en pratique tant que le drapeau est à `false`), 6/6 e2e-admin.
**Observation en cours de route, sans rapport avec cette session** : lancer les trois suites
(tests unitaires web, e2e, e2e-admin) en parallèle sur cette machine a produit un échec dans
`ExercisePanel.test.jsx` (timeout à 5000ms) et un échec total de la suite e2e (webServer jamais
démarré sous 120s) — tous deux de la contention de ressources, pas des régressions : les trois
suites, rejouées l'une après l'autre, passent toutes au vert. Confirme une leçon déjà tirée plus
tôt dans le projet : ne jamais lancer plusieurs suites Playwright/wrangler lourdes en parallèle
sur cette machine.

Ne démarre rien d'autre après cette clôture, comme demandé explicitement par Massy.

### 15/10/2026 — Constat architecte « accueil en anglais sur navigateur anglais » : diagnostic, non-reproduction, deux incohérences adjacentes corrigées

Constat de l'architecte, observé en production : sur un navigateur configuré en anglais, l'accueil
s'affichait entièrement en anglais dès le premier rendu, sans aucun clic. Instruction explicite :
diagnostiquer d'abord (« si c'est bien de là que ça vient »), corriger ensuite, et ne jamais
remettre l'anglais par défaut sur ce marché (Algérie, contenu pensé en français).

**Diagnostic, avant tout correctif.** Recherche exhaustive (`navigator.language`,
`navigator.languages`, `Accept-Language`, `Intl.`, `fallbackLng`, `geoip`, `cf-ipcountry`) dans
tout `apps/web/src` et `functions/` : un seul résultat, non lié (`navigator.language` utilisé dans
`deviceFingerprint.js` pour le hachage d'empreinte appareil, pas pour choisir une langue).
`apps/web/src/i18n/useLang.js` n'a qu'un seul commit dans toute son histoire (Mission 06,
`9801bf0`) et son défaut a toujours été inconditionnellement `localStorage.getItem(...) || "fr"`
— aucune lecture de la langue du navigateur n'a jamais existé dans ce fichier ni ailleurs.

Reproduit en conditions réelles, pas seulement en lisant le code : `curl -H "Accept-Language:
en-US,en;q=0.9" https://orionisacademy.com/` → HTML brut strictement identique, `<html lang="fr">`,
titre français, `cf-cache-status: DYNAMIC` (aucune mise en cache ni négociation de contenu côté
edge Cloudflare qui pourrait varier selon l'en-tête). Playwright avec un contexte
`locale: "en-US"` complet (aligne `navigator.language`, `Intl`, et l'en-tête HTTP
`Accept-Language` envoyé par le navigateur) sur la production réelle → accueil rendu en français,
`document.documentElement.lang` à `"fr"`, `localStorage` vide avant le test.

**Conclusion : le bug tel que décrit ne se reproduit pas depuis un état réellement neuf.**
Deux explications restent plausibles pour ce que l'architecte a observé, sans pouvoir trancher à
distance : (1) le navigateur de test n'était pas réellement vierge — un `localStorage` portant
`simulateur-amadeus:lang=en` d'un essai antérieur sur le même profil aurait produit exactement ce
symptôme sans aucun bug de code ; (2) la traduction automatique du navigateur (Chrome) a pu
traduire silencieusement la page et être confondue avec le site lui-même servant de l'anglais —
d'autant plus trompeur que nos propres traductions FR→EN sont très littérales (« Essayer
gratuitement » → « Try for free », etc.), donc proches de ce qu'une traduction automatique aurait
produit. Aucune des deux n'est une régression de ce projet.

**Deux incohérences réelles trouvées en vérifiant la famille** (consigne explicite : vérifier
`<html lang>`, les métadonnées SEO, l'attestation PDF — pas seulement la ligne suspectée),
corrigées par prudence même si elles ne causaient pas le symptôme rapporté :
1. **`<html lang>` ne suivait jamais un choix explicite d'anglais** — figé à `"fr"` dans
   `index.html`, jamais mis à jour après un clic sur le sélecteur EN. Incohérence SEO/
   accessibilité réelle et indépendante. `useLang.js` applique désormais le même motif que
   `useTheme.js`/`data-theme` : un `useEffect` qui synchronise
   `document.documentElement.setAttribute("lang", lang)` à chaque changement de langue.
2. **`og:locale` était absent** de `index.html`. Ajouté : `og:locale` `fr_FR` (le document initial
   envoyé par le serveur est toujours en français, quel que soit l'en-tête `Accept-Language` —
   confirmé ci-dessus) et `og:locale:alternate` `en_US` (le contenu est bien traduisible).

**Attestation PDF vérifiée à part, rien à corriger** : `functions/_lib/certificate.js` défaute
déjà sur `lang = "fr"` au niveau de la fonction (`generateCertificatePdf({ ..., lang = "fr" })`),
et la valeur réelle transmise vient de `?lang=${lang}` (`CoursePage.jsx`), lui-même alimenté par
le même `useLang()` que l'accueil — donc par la même règle « français par défaut, anglais
seulement sur choix explicite ». Pas de chemin séparé à corriger.

**Tests ajoutés** (`apps/web/e2e/language-default.spec.js`) — un garde-fou permanent contre une
future régression, même en l'absence de bug actuel à corriger : (1) un contexte Playwright
`locale: "en-US"` complet visitant l'accueil doit voir le français (`<html lang="fr">`, « Apprends
un métier, » visible, « Learn a trade, » absent) ; (2) un choix explicite d'anglais via le
sélecteur doit être respecté immédiatement ET après un rechargement complet de la page (teste la
mémorisation `localStorage`, pas seulement l'état React en mémoire).

**Non-régression** : lint clean, 90/90 tests unitaires web, suite e2e complète + e2e-admin rejouées
sans régression. **Vérifié en production avec un vrai navigateur configuré en anglais** (pas
seulement en local où la configuration de la machine est déjà en français) : `curl` avec en-tête
anglais explicite, et un contexte Playwright anglais complet contre `https://orionisacademy.com`
réel — les deux confirment le français par défaut.

### 15/10/2026 — PROMPT-PASSE-ACCUEIL.md chantiers 3 et 4 (pied de page, habillage /admin) — clôture complète du prompt

Suite directe de la session du 14/10 (chantiers 1+2 + variante compacte du logo, entrée
ci-dessous). Enchaîné sans feu vert entre les deux chantiers restants, comme demandé.

**Chantier 3 — les trois liens morts du pied de page.** `Contact`, `Conditions` et
`Remboursement` pointaient vers `href="#"` en production. `Contact` → vraie adresse e-mail
(`mailto:contact@orionisacademy.com`, routage actif depuis le 09/10/2026, vérifié par un test
dédié sur l'attribut `href`). `Conditions`/`Remboursement` → deux vraies routes (`/conditions`,
`/remboursement`), un composant partagé neuf (`apps/web/src/platform/LegalPendingPage.jsx`,
prop `page: "terms" | "refund"`) rendu via le même `PlatformLayout` que le reste du site —
jamais une page isolée hors du système de design. Chaque page affiche un état d'attente
explicite et visible (« Page en préparation », texte à écrire par Massy) plutôt qu'un faux texte
juridique inventé — instruction explicite et non négociable de l'architecte : « un faux texte de
loi est pire que l'absence ». **Ces deux pages bloquent Mission 22** (paiement Chargily) : on
n'encaisse pas sans CGV ni politique de remboursement publiées, noté dans `TASKS.md`.
`apps/web/src/Root.jsx` : deux routes ajoutées au même niveau que les autres (`/conditions`,
`/remboursement`), même motif de `return` conditionnel direct que le reste du fichier. 3 nouveaux
tests (`apps/web/e2e/legal.spec.js`) : href du lien Contact, clic réel sur Conditions/
Remboursement jusqu'à l'état d'attente visible — jamais un `goto()` direct dans la page, par clic
depuis l'accueil (leçon du 11/10 appliquée).

**Chantier 4 — habillage `/admin` aux jetons du design system.** Avant de toucher quoi que ce
soit, vérification du risque le plus sérieux de ce chantier : `apps/web/src/index.css` est
partagé entre `/admin` et le terminal/onboarding historique (règle absolue : le terminal ne doit
jamais changer). Confirmé par grep exhaustif que **tous** les `className` des fichiers
`admin/*.jsx` sont préfixés `admin-` — le bloc CSS correspondant (lignes ~769-1132, ~370 lignes)
est donc entièrement isolé et sans risque pour le reste du fichier. Confirmé aussi que
`platform.css` scope délibérément ses variables CSS à `.platform-root` (commentaire d'en-tête
explicite dans le fichier lui-même) — jamais disponibles pour `/admin`. Conséquence : la palette
a été reprise en valeurs **littérales** (mêmes valeurs que `docs/DESIGN-SYSTEM.md` §2 bis,
thème clair — pas de bascule de thème sur `/admin`), pas en `var(--...)`, pour respecter cette
isolation volontaire plutôt que la contourner. Mapping : `#2f2a7a` (texte/bordures) →
`#0A1733` ; boutons et accents → `#1593A8` (survol `#1D7FB8`) ; `#dde5f4` (fond de page,
nouveau, posé explicitement sur `.admin-login`/`.admin-dashboard` plutôt que sur un sélecteur
global qui aurait affecté le reste du fichier) → `#F2F7FF` ; `#eef2fa` (cartes/panneaux) →
`#FFFFFF`. Les deux déclarations orphelines `font-family: "Courier New", Courier, monospace`
(`.admin-dashboard`, `.admin-tabs`) retirées au profit de la pile système du design system.
**Décision explicite** : couleurs de statut (`.admin-login-error` rouge,
`.admin-new-key-banner` vert) **non touchées** — ce sont des couleurs sémantiques, pas des
teintes de marque, hors périmètre d'un « habillage, pas une refonte ». Même décision pour la
glassmorphie (`backdrop-filter`) du reste de la plateforme : jugée trop invasive pour ce
chantier, cartes `/admin` restées en blanc opaque. Zéro changement de structure JSX, zéro
changement de comportement — confirmé par les 6 tests `e2e-admin` existants (login, licences,
formations) restés verts sans la moindre modification.

**Non-régression de la session complète** : lint clean, 90/90 tests unitaires web (`vitest`),
57/57 e2e (suite complète, `legal.spec.js` inclus), 6/6 e2e-admin. La suite
`npm run test:functions` (3 fichiers `__tests__`, chacun avec son propre `wrangler pages dev`
local sur un port distinct) est restée bloquée sans aucune sortie ni évolution de process
observable pendant ~15 minutes malgré plusieurs vérifications espacées — tuée (processus
`wrangler`/`node --test` orphelins nettoyés explicitement, aucun laissé vivant en fin de
session) plutôt que laissée tourner indéfiniment. Aucun rapport de cause avec cette session :
chantiers 3 et 4 ne touchent aucun fichier sous `functions/`. À rejouer isolément (sans e2e en
parallèle, qui occupaient peut-être les ressources) en tout début de prochaine session pour
confirmer qu'il s'agissait d'un aléa machine et pas d'une régression silencieuse — consigné dans
`TASKS.md` plutôt que faussement déclaré vérifié.

**Vérification finale en production, par clic réel (pas par URL tapée), 1280px et 390px** :
accueil → terminal du héros (ou bouton de secours « Essayer le terminal ») → trois commandes
d'exemple cliquées → PNR complet → carte de fin en superposition → « Créer mon compte » →
atterrissage sur `/app/inscription`. `/admin` : connexion (nouvelle palette claire) + tableau de
bord (nouvelle palette, onglets formations inchangés dans leur fonctionnement). `/conditions` et
`/remboursement` : état d'attente visible, pas de texte juridique inventé. Aucune anomalie
visuelle constatée aux deux largeurs.

**Clôture du prompt `PROMPT-PASSE-ACCUEIL.md` dans son ensemble** : les quatre chantiers sont
faits, vérifiés, documentés. Rien n'a touché Mission 22, le poivre sur les mots de passe, ou la
typographie Cormorant/Inter — conformément aux interdictions explicites de l'architecte pour
cette passe.

### 14/10/2026 — PROMPT-PASSE-ACCUEIL.md chantiers 1 et 2 (démo du terminal, inscription directe) + variante compacte du logo

Session en mode autonome, démarrée après confirmation en production (14/10) que la régression de
navigation du 11/10 était bien réparée et le logo en place. Enchaîné sans feu vert entre les
chantiers, comme demandé. La variante compacte du logo (`PROMPT-LOGO-COMPACT.md`) est arrivée en
cours de route — intégrée immédiatement entre les chantiers 1 et 2, comme son propre prompt le
demandait explicitement.

**Chantier 1 — démonstration du terminal depuis l'accueil** (option A tranchée par Massy :
démonstration limitée, pas d'accès libre complet, pas une simple animation). `apps/web/src/
DemoTerminalPage.jsx` (nouveau) : route `/demo`, sans compte ni clé. Monte le **vrai**
`Terminal.jsx` — jamais une imitation — et ne le modifie **jamais** : tout s'observe depuis
l'extérieur, par les mêmes mécanismes qu'un vrai utilisateur (événements DOM réels sur son
`<input>`, sa seule référence impérative `getState()`). Deux bugs de compréhension corrigés en
testant localement avant de considérer le chantier fini, pas supposés corrects : le champ réel
est `state.activePNR.recordLocator`, pas `state.pnr.recordLocator` (trouvé par un
`console.log` temporaire, retiré ensuite) ; l'élément du héros a une animation CSS perpétuelle
(`pf-float`) qui empêche Playwright de le considérer « stable » — pas un bug, juste la raison
d'utiliser `click({force:true})` dans les tests.

Fin de la démo au premier des deux événements : `recordLocator` rempli (ER/ET réussi) ou 15
commandes saisies. Trois commandes d'exemple affichées = **fenêtre glissante de 3 sur les 6
étapes** d'un parcours complet (`AN26DECALGPAR`, `SS1Y1`, `NM1DOE/JOHN MR`, `AP123456`, `RFTEST`,
`ER` — mêmes commandes exactes que le test e2e historique « full happy path »), pas trois boutons
figés : avec seulement 3 aides fixes, personne n'irait au bout d'un PNR complet. Cliquer un
exemple insère son texte dans le **vrai** `<input>` via le contournement standard du
value-setter natif de `HTMLInputElement.prototype` (patché par React pour les inputs contrôlés) +
un événement `input` réel — jamais un prop ajouté à Terminal.jsx pour accepter une valeur
externe. Carte de fin en **superposition** (fond qui s'estompe vers le haut, `pointer-events:
none` sauf sur la carte elle-même) — jamais un effacement, le transcript reste lisible derrière,
vérifié par un test dédié. Compteur en `localStorage`, explicitement documenté comme n'étant
**pas** un dispositif anti-fraude : persiste au rafraîchissement (pas de regain gratuit via F5),
repart à zéro si le navigateur est vidé (accepté, sans conséquence) — vérifié par un test des
deux comportements. Terminal du héros rendu actionnable : `TerminalDemo.jsx` accepte désormais un
`onActivate`/`activateLabel` optionnels (absents sur l'usage décoratif d'`AuthScreen.jsx`,
inchangé) ; bouton de secours « Essayer le terminal » ajouté à côté du CTA du héros pour qui ne
devinera pas que l'image est cliquable.

**Non-régression** (le critère le plus important de ce chantier) : `Terminal.jsx` et
`packages/core` **non modifiés**, vérifié par `git diff --stat` vide sur ces chemins avant
commit. 48/48 e2e verts dont `terminal.spec.js` (mode libre) et `exercises.spec.js` (mode cours)
inchangés. 6 nouveaux tests dans `apps/web/e2e/demo.spec.js`.

**Chantier 2 — « Commencer » mène à l'inscription** : `/app/inscription` (nouvelle route dans
`PlatformApp.jsx`) ouvre `AuthScreen` directement en mode `"register"` via une prop
`initialMode`, pas un écran dupliqué. Les trois boutons « Commencer »/« Essayer gratuitement » de
`HomePage.jsx` (nav, héros, CTA final) pointent désormais dessus ; le lien « Connexion » de la
nav reste inchangé, vers `/app` (mode `"login"`). `navigation.spec.js` (régression du 11/10)
mis à jour : ces boutons attendaient encore l'écran de connexion, maintenant corrigé pour
attendre l'inscription — pas une régression, le comportement attendu a changé par construction.

**Variante compacte du logo** (`PROMPT-LOGO-COMPACT.md`, intégrée entre les deux chantiers
ci-dessus) : corrige le défaut de lisibilité d'ACADEMY constaté en production avec le grand
format dans la barre de nav. Fichiers du designer (archive `kit-orionis-compact.zip` dans les
Téléchargements de Massy) extraits dans un dossier neuf du scratchpad — l'extraction partielle
déjà présente dans `Téléchargements/compact/` (faite par quelqu'un/quelque chose avant cette
session) **n'a pas été réutilisée**, précisément parce qu'elle s'est révélée incomplète (il
manquait les SVG/PNG de l'emblème petites tailles) : une bonne illustration de pourquoi la
consigne « décompresse dans un dossier neuf et vide » existe. Seuls les `.svg` copiés dans
`apps/web/public/brand/compact/`, comme demandé (pas les PNG ni les captures de validation du
designer, pas nécessaires au rendu).

`apps/web/src/brandLogo.js` (nouveau) : **seule source de vérité** pour le choix de fichier
(seuil de hauteur, thème) — demande explicite du designer, pour que la règle ne devienne pas
fausse à trois endroits sur quatre en deux mois. Partagée par `Brand.jsx` (thème dynamique) ET
`admin/AdminLogin.jsx`/`admin/AdminApp.jsx` (thème `"light"` fixé en dur, `/admin` n'a pas de
bascule) — ces deux derniers utilisaient jusqu'ici un chemin de fichier codé en dur,
indépendamment de `Brand.jsx` ; désormais centralisés. Seuils exprimés en **hauteur de rendu
voulue** par l'appelant, jamais une mesure DOM après coup (anti-CLS, explicitement demandé) :
≥150px grand format, 32-150px compacte, <32px emblème seul — ratios mesurés sur les vrais
`viewBox` des fichiers fournis (640:240, 151.76:40, 150.85:150.85 — carré), pas supposés.
Barre de navigation : 40px partout, valeur donnée par le designer — plus de palier mobile séparé
(l'ancien 36px du grand format disparaît, inutile avec la compacte). Repli supplémentaire pour
« petit mobile » (barre descendant sous 120px de large disponible) : un `<picture>` avec
`<source media="(max-width: 340px)">` vers l'emblème seul — en CSS pur, jamais une mesure
JavaScript de la largeur réelle, comme demandé. 340px choisi après calcul réel de la place
disponible dans `.pf-topbar-inner` (padding + bouton hamburger) : à 390px — la largeur
habituellement vérifiée sur ce projet — la compacte tient très large, ce repli ne joue donc que
sur des téléphones nettement plus étroits ; défensif, pas le cas courant.

**Vérifié réellement en production** après déploiement, par capture d'écran réelle (script
Playwright jetable, pas une maquette) de la barre de navigation à taille réelle, sans zoom, sur
fond sombre et sur fond clair, à 1280 et 390px : ACADEMY nettement lisible dans les quatre
captures (c'était précisément le défaut à corriger — « si ACADEMY n'est pas lisible sur ces
captures-là, ce n'est pas bon, quel que soit le rendu en grand »). Écran de connexion et
`/admin` vérifiés aussi. Budgets de performance re-mesurés sur le site réel après coup :
LCP ≈ 1,47s (budget < 2s), CLS ≈ 0,002 (budget < 0,05) — aucune dégradation.

Rituel de clôture complet avant chaque commit : lint, build, 90/90 web, 54/54 e2e (48 + les 6
nouveaux de `demo.spec.js`), 6/6 e2e admin, 82/82 functions.

**Reprise exacte** : chantiers 3 (liens morts du pied de page — contact réel, pages CGV/
remboursement en attente du texte de Massy, à noter comme bloquant Mission 22) et 4 (habillage
de `/admin` aux jetons du design system, sans refonte) de `PROMPT-PASSE-ACCUEIL.md` restent à
faire, dans cet ordre, toujours en mode autonome.

### 12/10/2026 — Intégration du logo officiel Orionis Academy

Prompt dédié de l'architecte, après lecture du kit logo fourni par Massy dans son dossier
Téléchargements (`kit-orionis-academy/`, notice `LISEZ-MOI.md` lue en entier et suivie).

**Fichiers posés** dans `apps/web/public/brand/` (svg/png/favicon) — pas R2, même raisonnement
que les photos Unsplash (`docs/IDENTITE-VISUELLE.md`) : actifs publics du site, pas du contenu
sous licence étudiant. `apps/web/public/vite.svg` (favicon par défaut de Vite, plus référencé)
retiré.

**`Brand.jsx` ne recompose plus le logo en texte HTML** — interdiction explicite du kit. Devient
une `<img>` qui bascule entre les deux variantes (fond sombre/clair) selon `useTheme()`, résolu
dès le premier rendu (pas de flash, même garantie que partout ailleurs dans l'app). Hauteur
48px bureau / 36px mobile — bas de la fourchette conseillée par le kit (40-56/32-40), choisi
pour se loger proprement dans la barre de navigation de 64px fixée par `DESIGN-SYSTEM.md` §5 bis,
contrainte plus serrée que ce que le kit anticipait. Dimensions HTML explicites (anti-CLS).

**Posé partout, pas seulement l'accueil** : nav plateforme (via `PlatformLayout`), écran de
connexion/inscription, réinitialisation, pied de page (déjà couverts par `Brand.jsx`/
`HomePage.jsx`), **`/admin`** (n'avait aucune marque jusqu'ici — `AdminLogin.jsx` et
`AdminApp.jsx`, variante fond clair fixée en dur puisque `/admin` n'a pas de bascule de thème,
simple pose d'image sans toucher à sa structure, l'habillage complet restant un chantier
séparé), et **l'attestation PDF** (`functions/_lib/certificate.js`) : le logo (variante
transparente fond sombre) est désormais embarqué en base64 (`functions/_lib/
certificateLogo.js`) plutôt que composé en Helvetica comme avant — un Worker Cloudflare ne peut
pas lire un fichier statique sur disque à l'exécution, et le bundler ne sait pas importer un
PNG binaire directement ; l'inline évite aussi une dépendance réseau supplémentaire à chaque
génération de certificat. Rendu vérifié en relisant le PDF généré (logo net, bien centré,
espacement correct avec la mention légale en dessous).

**Favicon et Open Graph** posés dans `index.html` selon la notice, avec l'URL absolue réelle
pour `og:image` (`https://orionisacademy.com/brand/png/image-partage-1200x630.png`) — vérifié
servi (200) en production, de même que le favicon.

**Conflit de palette résolu** (`docs/DESIGN-SYSTEM.md` §2/§2 bis) : le kit (`--cyan` `#43C9D9`,
`--coral` `#FC8C5E`, plus les variantes "sur fond clair" `#1593A8`/`#E8703F`) et le système de
design fixé le 06/10/2026 ne donnaient pas exactement les mêmes teintes. **Décision de
l'architecte : le logo fait référence** — objet vectorisé figé, on ne le repeint pas ; c'est la
palette d'usage qui s'aligne sur lui. Mis à jour en famille partout où ces teintes étaient
dupliquées en dur (pas seulement les jetons CSS) : `certificate.js`, et les couleurs d'accent
par défaut de `AccountPage.jsx`/`CataloguePage.jsx`/`CoursePage.jsx`/`CourseVignette.jsx`/
`demoCourses.js`. `--cyan-2` (bleu du dégradé des boutons primaires) volontairement laissé
inchangé : pas une teinte de la marque, une décision d'interface distincte, le kit ne lui donne
aucune valeur de référence. Les variables `--oa-*` du kit n'ont pas été ajoutées en parallèle —
une seule source de vérité, `DESIGN-SYSTEM.md`.

**Contrastes WCAG réellement calculés** (pas une estimation) avant/après la bascule : en thème
sombre, aucun changement notable (marge énorme dans les deux cas, ≈ 9-11:1). En thème clair, le
dégradé de texte `.pf-grad` (gros titres, chiffres clés) était **déjà** sous le seuil AA avant
cette session (≈ 2,9:1 pour les deux anciennes teintes) — pas une régression introduite ici : le
cyan s'améliore légèrement (≈ 3,4:1, passe désormais le seuil 3:1 des gros caractères et des
composants d'interface comme le contour de focus), le corail recule de façon négligeable
(≈ 2,86:1). Noté dans `DESIGN-SYSTEM.md`/`TASKS.md` comme amélioration recommandée à part,
jamais corrigé en touchant à la teinte du logo lui-même.

**Non appliqué volontairement** : la typographie Cormorant Garamond + Inter que le kit
recommande pour toute l'interface — changement de typographie générale du site, pas une pose de
logo. Décision en attente de Massy, consignée dans `TASKS.md` avec le pour (cohérence avec le
logo, dont le texte est de toute façon déjà vectorisé) et le contre (refonte à revalider écran
par écran).

**Vérification visuelle réelle en production**, 1280 et 390px, deux thèmes (captures via un
script Playwright jetable, pas des maquettes) : logo nécessaire net sur l'accueil (en-tête et
pied de page), l'écran de connexion, et `/admin` — dans les deux thèmes où applicable. Favicon
et aperçu de partage confirmés servis avec le bon contenu. Budgets de performance re-mesurés
après coup sur le site réel : LCP ≈ 1,27 s (budget < 2 s), CLS ≈ 0,002 (budget < 0,05) — aucune
dégradation malgré l'ajout d'une image dans l'en-tête de chaque page.

Rituel de clôture complet : lint, typecheck, 90/90 web (une assertion corrigée : le nom du
produit n'est plus un texte, `getByText` → `getByAltText`, même correction dans
`navigation.spec.js`/`platform.spec.js` pour le clic sur le logo), 48/48 e2e, 6/6 e2e admin,
82/82 functions, 268/268 core, 9/9 data, 47/47 exercises.

### 11/10/2026 — Régression critique : le site était un cul-de-sac depuis l'accueil

Prompt dédié de l'architecte, priorité absolue sur tout le reste (y compris le chantier
« accueil » déjà en file). Constaté par Massy puis l'architecte : sur `https://
orionisacademy.com`, cliquer « Commencer » change l'URL en `/app` mais l'écran reste sur
l'accueil. Taper `/app` directement dans la barre d'adresse fonctionne.

**Cause, donnée par l'architecte dans le prompt** : `apps/web/src/main.jsx` lisait
`window.location.pathname` une seule fois, à l'import du module, pour choisir quel composant
racine monter (HomePage/PlatformApp/AdminApp/App/StyleguidePage). `navigate()`
(`platform/useRoute.js`) fait un vrai `history.pushState` puis émet un `popstate` — mais rien
dans `main.jsx` n'écoutait cet événement. L'URL changeait, le composant monté ne changeait
jamais. `useRoute.js` fonctionnait très bien pour la navigation interne à `/app/*` (son propre
composant s'abonne à `popstate`) ; il manquait l'équivalent au sommet, pour franchir la
frontière entre les cinq racines — y compris via les boutons précédent/suivant du navigateur,
qui déclenchent `popstate` nativement.

**Étape 1 — inventaire complet avant toute correction**, exigé par le prompt : accueil (barre
de nav desktop/mobile, bouton du héros, CTA final, carte de formation réelle, pied de page —
ces trois derniers liens restent `href="#"`, hors périmètre, déjà noté dans
`PROMPT-PASSE-ACCUEIL.md`), plateforme (connexion/inscription/mot de passe oublié,
réinitialisation, catalogue, page formation, lecteur de leçon avec fil d'Ariane et
précédent/suivant, Mon compte, déconnexion), admin (3 onglets, déconnexion — purement interne,
aucun lien sortant, non affecté), simulateur intégré à une leçon (ouverture/fermeture en état
local, jamais une navigation d'URL — structurellement correct, jamais nesté sous
`.platform-root`, vérifié), simulateur autonome `/simulateur` (aucun lien vers ailleurs, atteint
uniquement par URL directe — voulu), styleguide `/styleguide` (outil interne, même motif). Deux
bugs supplémentaires de la même famille trouvés en lisant le code pendant l'inventaire, pas
nouveaux : le fil d'Ariane « Accueil » de `CoursePage.jsx`/`LessonPlayerPage.jsx` et le logo par
défaut de `AuthScreen.jsx`/`ResetPasswordScreen.jsx`/`StyleguidePage.jsx` pointaient déjà
correctement vers `/` depuis l'Étape 3 — seul `main.jsx` empêchait que ça mène quelque part.
`PlatformApp.jsx` retombait aussi en silence sur le catalogue pour toute sous-route `/app/*`
inconnue (ex. `/app/nimportequoi`), au lieu de dire clairement « introuvable ».

**Étape 2 — correctif** : `apps/web/src/Root.jsx` (nouveau) porte la racine réactive, abonnée à
`popstate`, qui choisit la branche à chaque rendu via des `return` conditionnels directs sur les
cinq composants lazy (jamais une variable intermédiaire — `react-hooks/static-components`
l'interdit, même quand la référence est stable, ce qui a demandé d'extraire `Root` dans son
propre fichier : `react-refresh/only-export-components` exige qu'un composant défini dans un
fichier y soit exporté, et `main.jsx` ne l'était pas). `main.jsx` devient un point d'entrée
minimal. `apps/web/src/platform/NotFoundPage.jsx` (nouveau) : page « introuvable » propre avec
un retour vers l'accueil, utilisée en racine (URL de premier niveau inconnue) et par
`PlatformApp.jsx` (allowlist explicite des sous-routes `/app/*` connues, cette page pour le
reste). Chaque branche racine reste montée au premier niveau, jamais imbriquée — vérifié par
les e2e existants (le terminal réel ne se retrouve jamais sous `.platform-root`). Chargement à
la demande inchangé, aucun import statique réintroduit.

**Étape 3 — les quatre cas qui ne sont jamais testés** : retour/suivant du navigateur (cassé
par le même bug, corrigé par le même correctif) ; rafraîchissement sur une URL profonde ; URL
inconnue ; lien profond collé dans un onglet neuf. Vérification de la redirection SPA de
Cloudflare Pages (`_redirects`/`_routes.json`), demandée explicitement : **aucun fichier de ce
type n'existait**. Requête réelle en production (avant tout correctif) : `/`, 200 ; `/app`,
`/admin`, `/simulateur`, `/styleguide`, 404 — mais le corps de la réponse 404 est déjà le vrai
`index.html` (confirmé par `curl -i`), pas une page d'erreur Cloudflare générique : c'est le
repli par défaut de Cloudflare Pages (sert `index.html` pour tout chemin non reconnu), qui
explique pourquoi taper `/app` « fonctionne » déjà pour un visiteur réel malgré le statut HTTP
faux. Tenté de corriger le statut avec la règle standard documentée par Cloudflare
(`apps/web/public/_redirects` : `/* /index.html 200`) : **`wrangler` détecte cette règle exacte
comme une boucle infinie et l'ignore au build** (« strip `.html` or `/index`... triggering this
rule again ») — le même type d'incident que celui déjà vécu sur ce projet (« Parsed 0 valid
redirect rules »), cette fois intercepté avant le déploiement plutôt que découvert après.
Fichier retiré : laisser une règle connue pour être neutralisée serait plus trompeur que ne pas
l'avoir. Le comportement fonctionnel reste correct (confirmé par le nouveau test de
rafraîchissement et par une requête réelle en production après déploiement) ; le code de statut
erroné est noté comme amélioration recommandée dans `TASKS.md`, pas comme bug — la corriger
proprement demanderait soit un réglage `assets.not_found_handling` dans `wrangler.jsonc` (risque
explicitement écarté cette session, vu l'historique de ce fichier) soit un réglage dashboard à
étudier séparément.

**Étape 4 — tests** : `apps/web/e2e/navigation.spec.js` (nouveau, 13 tests). Règle appliquée
strictement : chaque test entre par l'endroit où un vrai visiteur commence et **clique** —
`goto()` réservé aux cas où c'est le comportement réel d'un visiteur (rafraîchir, URL inconnue,
lien profond dans un onglet neuf), jamais comme raccourci vers la zone testée. Couvre
l'inventaire de l'Étape 1 : chacun des quatre boutons/liens de l'accueil vers `/app` (nav
desktop, héros, CTA final, nav mobile à 390px), la carte de formation réelle, le parcours
complet par clic jusqu'à la déconnexion et au retour à l'accueil, le logo depuis l'écran de
connexion, retour/suivant du navigateur, rafraîchissement d'une URL profonde, sous-route et URL
totalement inconnues. Une erreur dans le premier jet du test de menu mobile (locator cherchant
un `<nav>` par un nom accessible qu'aucun des deux `<nav>` de `HomePage.jsx` ne porte) corrigée
en ciblant l'id réel du menu mobile.

**Étape 5 — vérification en production, en cliquant réellement, 1280px et 390px** (jamais en
tapant une URL — « c'est précisément ce qui a masqué le problème ») : parcours complet accueil
→ Commencer → inscription → catalogue → Mon compte → déconnexion → retour à l'accueil, plus URL
inconnue → « Page introuvable » → retour qui fonctionne, aux deux largeurs. Le parcours
formation → leçon → fil d'Ariane n'a pas pu être vérifié EN PRODUCTION (toujours aucune vraie
formation là-bas, gap déjà connu et consigné depuis la clôture de Mission 23 Étape 5) — mais
vérifié en local par `navigation.spec.js`, qui exerce exactement ce chemin.

Rituel de clôture complet (lint, typecheck, 90/90 web, 48/48 e2e dont les 13 nouveaux, 6/6 e2e
admin). Deux corrections en cours de route, consignées pour ne pas les reproduire : ESLint
(`react-hooks/static-components`, `react-refresh/only-export-components`) a forcé le passage
d'une variable de composant choisie dans `main.jsx` à des `return` conditionnels directs dans
un fichier dédié, `Root.jsx` — plus robuste de toute façon, pas juste une concession au linter.

**Leçon à retenir, qui vaut pour la suite du projet** (demandée explicitement par l'architecte) :
une suite de tests qui entre toujours par URL directe (`goto()`) ne teste jamais la porte
d'entrée. Tout parcours que vit un visiteur réel doit avoir au moins un test qui commence là où
il commence, et qui clique.

### 11/10/2026 — Bug critique : l'inscription ne créait jamais de compte en production (deux bugs empilés)

Prompt dédié de l'architecte, en priorité absolue sur tout le reste, à partir d'un symptôme
remonté par Massy en production : une personne crée un compte, « il ne se passe rien », puis
l'écran annonce « Adresse e-mail ou mot de passe incorrect ».

**Bug n°1, diagnostiqué par lecture de code (le symptôme rapporté)** : `functions/api/auth/
register.js` renvoyait `{ok:true}` dans trois situations incompatibles — inscription réussie,
e-mail déjà pris (anti-énumération voulue), **et** quota de débit dépassé (5/15min/IP). Le
front (`AuthScreen.jsx`) traitait les deux derniers cas de façon identique : `me()` ne renvoie
personne → bascule silencieuse vers l'écran de connexion, sans message. La personne retapait
alors son mot de passe sur un compte qui n'avait jamais existé. Corrigé : le quota dépassé
renvoie désormais la même réponse d'échec générique que n'importe quelle autre erreur (jamais
`{ok:true}`) ; la collision sur un e-mail existant affiche un message conditionnel (« si un
compte existe déjà... ») au lieu de basculer en silence ; quota d'inscription relevé à
15/15min/IP (audience partageant souvent une IP — NAT opérateur en Algérie). Vérifié : mêmes
motifs cherchés et absents sur `login.js`, `forgot-password.js`, `license/activate.js`.

**Bug n°2, trouvé en vérifiant le correctif n°1 EN PRODUCTION (le vrai verrou, plus grave)** :
le symptôme persistait malgré le fix. Navigateur réel piloté contre
`https://orionisacademy.com` → toujours un échec, dès la première tentative, bien avant tout
quota. Requête directe sur `rate_limit_attempts` en production : seulement 2 lignes, loin du
seuil — ce n'était donc PAS le quota. Log temporaire ajouté au `catch` (muet jusque-là, donc
aveugle) + `wrangler pages deployment tail` sur le déploiement réel ont révélé la vraie cause :
`NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not supported (requested
600000)`. L'implémentation WebCrypto des **Workers Cloudflare** — jamais celle de Node.js,
utilisée par tous les tests locaux et par `wrangler pages dev` — refuse catégoriquement tout
PBKDF2 au-delà de 100 000 itérations. `functions/_lib/passwordHash.js` en demandait 600 000
depuis l'Étape 1 de Mission 23 : **aucune inscription ni réinitialisation de mot de passe n'a
jamais pu réussir en production**, depuis le tout premier déploiement. `verifyPassword` (login)
ne plantait pas (son propre `try/catch` interne avale l'erreur et renvoie `false`) — une
connexion échouait donc « normalement », comme un mauvais mot de passe, bien plus difficile à
soupçonner que le crash franc de l'inscription.
Corrigé : `ITERATIONS` à 100 000 (plafond dur de la plateforme cible, pas un compromis
sécurité/performance) ; `docs/SECURITE.md` §1 corrigé en conséquence (l'exigence « ≥ 600 000 »
était factuellement impossible sur Workers). **Même famille de bug corrigée partout**
(`CONSTITUTION.md` §5) : les `catch` muets de `register.js`/`login.js`/`reset-password.js`/
`forgot-password.js`/`license/activate.js` loggent désormais l'erreur réelle côté serveur
(jamais renvoyée au client) — c'est précisément ce silence qui a cette fois caché le vrai bug
pendant toute une mission. Nouveau test (`functions/__tests__/passwordHash.test.js`) :
verrouille que les itérations stockées ne dépassent plus jamais 100 000 — aucun test local ne
peut reproduire le plantage Workers lui-même (Node n'a pas ce plafond), donc c'est la seule
garde possible contre une régression future (ex. copier-coller d'une recommandation OWASP
générique qui ne connaît pas cette limite de plateforme).

**Vérifié réellement après coup, pas supposé** : inscription avec une adresse jamais utilisée
depuis un navigateur neuf → `{ok:true}`, atterrit sur le catalogue (« Formations ») ; requête
D1 réelle confirmant la ligne `users` créée (`id:1`, premier compte étudiant de toute l'histoire
de la plateforme, haché `pbkdf2$100000$...`) ; connexion avec ce même compte → même succès. Deux
comptes de test (`verif-bugfix-*@example.com`) restent dans la base de production — inoffensifs,
à purger un jour si Massy le souhaite.

Rituel de clôture complet à chaque commit (lint, typecheck, 90/90 web, 82/82 functions, 35/35
e2e, 6/6 e2e admin). Processus `wrangler pages deployment tail` restés ouverts par erreur
(tentative initiale de backgrounding via `(cmd &)`, qui ne tue pas le processus à la fin de
l'appel d'outil — `run_in_background: true` est la bonne méthode) : repérés via
`Get-CimInstance Win32_Process`, arrêtés avant la fin de session.

### 11/10/2026 — Mission 23 Étape 5 (bascule production) — correctif sécurité, attestation PDF, infrastructure, déploiement

Session hors mode autonome (contrairement aux Étapes 0-4) : touche à la production réelle et à
des secrets que Massy seul manipule. Cinq phases, chacune confirmée avant la suivante, trois
points d'arrêt explicites (🛑 STOP) tenus.

**Phase 1 — correctif critique (commit `6469155`)** : `env.SESSION_SECRET || ""` et
`env.ADMIN_SECRET_HASH || ""` (bug trouvé par l'architecte le 09/10/2026) retombaient
silencieusement sur la chaîne vide comme clé HMAC si la variable était absente — jetons de
session/CSRF/téléchargement forgeables, sans aucun signal. Corrigé en famille
(`CONSTITUTION.md` §5) par un helper unique qui lève, `functions/_lib/requiredEnv.js`
(initialement nommé `secrets.js` — renommé car le `.gitignore` `*secret*`, volontairement large,
le cachait entièrement à `git status`, pas seulement à la casse). Appliqué aux quatre appels
`SESSION_SECRET` **et** à `ADMIN_SECRET_HASH` (`adminAuth.js`, `admin/login.js`, motif identique
trouvé en vérifiant au passage). 13 tests dédiés qui échouaient avant, passent après.

**Phase 2 — attestation de fin de parcours (commit `803e6e6`)** : dernier élément manquant de
Mission 23. PDF généré à la demande (jamais stocké en D1), via `pdf-lib` (pur JS, compatible
Workers, zéro dépendance native, choisi plutôt qu'une API tierce — le nom de l'étudiant ne doit
jamais sortir du Worker). `functions/_lib/certificate.js` + route
`functions/api/courses/[slug]/certificate.js` : nom (repli sur l'email si prénom/nom absents —
`AuthScreen.jsx` ne les rend pas obligatoires), titre de formation, date d'obtention (calculée
depuis `lesson_progress.completed_at`, pas la date de téléchargement), mention obligatoire de
non-valeur officielle **imprimée sur le document lui-même**. 404 neutre si la formation n'existe
pas ou si l'étudiant n'est pas inscrit (jamais distingué) ; 403 si incomplet. 7 tests d'intégration
+ 3 tests de composant (lien visible seulement à 100 %).

**Phase 3 — infrastructure production (commit `456779f`)**, les trois points d'arrêt accordés
par l'architecte après vérification directe (relecture ligne à ligne des migrations, test de
`requiredEnv.test.js`) :
- 🛑 STOP 1 : bucket R2 `gds-content` créé, binding `CONTENT` posé dans `wrangler.jsonc` (bucket
  créé AVANT l'édition du fichier, comme l'exige son propre commentaire — précédent de l'incident
  de juillet). Bloqué une première fois sur l'auth wrangler (environnement non-interactif,
  `wrangler login` fait par Massy dans un terminal séparé), une seconde fois sur R2 non activé
  sur le compte (activé par Massy dans le dashboard).
- 🛑 STOP 3 : migrations `0002_platform_users.sql` et `0003_audit_log.sql` appliquées en
  `--remote`. **`wrangler d1 execute --remote --file=...` a échoué de façon systématique sur
  cette machine** (5 tentatives identiques) : l'upload PUT réussit, le POST `"ingest"` suivant
  échoue toujours (`fetch failed`) — lecture du code source de wrangler
  (`uploadAndBeginIngestion`, `wrangler-dist/cli.js`) : POST n'est pas dans la liste des méthodes
  auto-retryables d'undici, contrairement à PUT. Contournement (pas un correctif du bug) :
  migrations appliquées via `--command` (chemin à une seule requête, vérifié fonctionnel),
  invoqué directement via `node wrangler-dist/cli.js` pour éviter toute réinterprétation shell des
  caractères spéciaux du SQL ; seules des lignes de commentaire entières retirées pour tenir sous
  la limite de ligne Windows, aucune instruction SQL modifiée. Vérifié par une requête réelle sur
  `sqlite_master` : les 11 tables attendues sont présentes. Documenté en détail dans `TASKS.md`
  comme bizarrerie d'environnement.
- 🛑 STOP 2 : `SESSION_SECRET` et `ADMIN_SECRET_HASH` posés par Massy lui-même (jamais générés,
  lus ni écrits par Claude Code) en *Secret* sur Production et Preview. **Découverte au passage
  (11/10/2026) : `ADMIN_SECRET_HASH` était absent du projet Pages depuis toujours** —
  `README.md` affirmait depuis le 27/07/2026 qu'il était configuré, à tort ; la connexion `/admin`
  n'avait donc probablement jamais fonctionné en production. Massy a régénéré une nouvelle phrase
  (l'ancienne est caduque) et reposé les deux secrets. `README.md` corrigé pour ne plus affirmer
  un état non vérifié, et documente désormais qu'une variable d'environnement Cloudflare Pages ne
  prend effet qu'au déploiement suivant.

**Phase 4 — déploiement** : 17 commits locaux poussés (`9430c9d..456779f`) — Pages étant
connecté au dépôt GitHub, le `git push` est le déploiement, il n'y en a pas d'autre. Déploiement
suivi jusqu'au bout (`wrangler pages deployment list`), confirmé en ligne par une requête réelle
sur `https://orionisacademy.com/` (200) et `/api/license/check` (200).

**Phase 5 — vérification par l'usage, partielle** : le point le plus important de la checklist —
la connexion réelle à `/admin` en production, jamais testée avant ce jour — **confirmée par
Massy lui-même** (il a tapé la phrase, l'architecte ne l'a jamais vue). Deux mécanismes vérifiés
par requête réelle sans avoir besoin de données de test : téléchargement sans jeton signé → 404
neutre ; activation avec une clé de licence inconnue → rejet propre. **Le reste de la checklist
(formation complète créée depuis `/admin`, inscription/progression étudiant, attestation à 100 %,
protection d'un vrai document payant, terminal/exercices en mode libre et en mode cours) n'a pas
pu être vérifié en production, faute de toute formation ou clé de licence de test existante** —
aucun pilote n'a jamais été lancé (Mission 07 Partie B jamais démarrée). Décision de Massy :
noter ce manque explicitement plutôt que bloquer la clôture — voir `TASKS.md` §En cours pour la
reprise exacte. Mission 23 n'est donc pas déclarée entièrement close ; un chantier correctif
« accueil » proposé par l'architecte le même jour (démo du terminal, route d'inscription directe,
pages légales, habillage `/admin`) est explicitement mis en file derrière cette clôture.

**Rituel de clôture** : suites complètes vertes à chaque commit (78/78 `functions`, 89/89
`apps/web`, 35/35 e2e, 6/6 e2e admin, 268/268 `core`, 9/9 `data`, 47/47 `exercises`), lint et
typecheck relancés en clôture (clean). Deux incidents d'environnement résolus pendant la session,
sans rapport avec le code produit : verrous git périmés (`find .git -name "*.lock" -delete`,
même technique qu'en Phase 1 de la session précédente) et le bug `wrangler --file --remote`
documenté ci-dessus.

### 09/10/2026 — Mission 23 Étape 4 (back-office formations, mode autonome) + marque Orionis Academy + domaine
Session de suite directe sur la même conversation que l'entrée Étape 3 ci-dessous — reprise par
un message explicite de l'architecte (`missions/PROMPT-SUITE-23-ETAPE4.md`) pointant un vrai
risque : une session entière de travail non commitée. Traité en quatre temps, dans l'ordre
demandé.

**A. Sécurisation du travail non commité** : rituel de non-régression complet relancé avant
toute nouvelle ligne (268 `packages/core` + 9 `packages/data` + 47 `packages/exercises` + 86
Vitest `apps/web` + lint + typecheck + build, tous verts) — confirmé que l'Étape 3 (déjà écrite,
jamais commitée) était saine. **Décision sur `AUDIT.md`** (non suivi, audit du 05/10/2026) :
**entre dans le dépôt**, tel quel — `CLAUDE.md` le cite déjà comme référence vivante (« l'audit de
reprise du 05/10/2026 ») depuis plusieurs sessions ; il était anormal qu'un document déjà cité
comme source ne soit pas lui-même versionné. Ses constats sont presque tous déjà résolus par des
sessions postérieures (code mort retiré, Mission 14 reconfirmée, etc.) — gardé comme instantané
historique, pas remis à jour. `missions/PROMPT-SUITE-23-ETAPE4.md` (le prompt de reprise
lui-même, non suivi) entre aussi dans le dépôt pour la même raison de traçabilité.

**B. État réel de l'Étape 4, vérifié et non supposé** : à la reprise, une bonne partie du
back-office existait déjà en code non commité (écrit avant que ce message n'arrive) mais
**jamais vérifié par l'usage**. Vérification faite en pilotant un vrai navigateur contre un vrai
`wrangler pages dev` + D1 + R2 locaux (`apps/web/e2e-admin/courses-admin.spec.js`, pas un
raccourci API) : connexion admin → onglet **Formations** → création d'une formation → module →
**4 leçons créées par clic/saisie réelle** (vidéo par URL collée, PDF par vrai envoi de fichier,
« fichier » à télécharger par vrai envoi, session live avec date/heure/durée/lien) → publication
→ la formation publiée apparaît dans le catalogue étudiant réel avec le bon décompte de leçons.
**Le critère d'acceptation de MISSION-23.md est satisfait, prouvé par l'usage, pas par la
lecture du code.** Réordonnancement (↑/↓, leçons et modules) et suppression testés aussi. Détail
technique :
- Nouvelle table `audit_log` (`migrations/0003_audit_log.sql`) — comble le vrai manque trouvé en
  explorant le code existant : `docs/SECURITE.md` §7 exige un journal d'audit « consultable dans
  /admin », jamais construit depuis Mission 14. `functions/_lib/auditLog.js` (best-effort, une
  panne d'écriture du journal ne doit jamais faire échouer l'action admin elle-même) ; nouvel
  onglet « Journal » en lecture seule (`AuditLogView.jsx`).
- API admin complète (`functions/api/admin/courses|modules|lessons`, même convention que
  `licenses.js` — `requireAdmin`, requêtes préparées, DTO camelCase) : cours (liste incluant les
  brouillons, création, détail avec `content` complet, mise à jour — **pas de DELETE, « dépublier
  plutôt que supprimer » comme l'exige SECURITE §7**), modules et leçons (création/mise à
  jour/suppression, la suppression d'un module cascade manuellement sur ses leçons — pas de `ON
  DELETE CASCADE` déclaré dans le schéma). `type` de leçon revalidé côté serveur (liste fermée,
  `quiz` compris dans la contrainte CHECK mais absent de cette liste et du formulaire — réservé
  Mission 24, jamais implémenté ici).
- Premier vrai endpoint d'upload du projet (`functions/api/admin/upload.js`) : écrit sur R2
  (`env.CONTENT.put`), jamais dans D1 ni le dépôt, nom de fichier assaini (bloque la traversée de
  chemin), limite 25 Mo (décision consignée dans « À valider par Massy »). Le `fileKey` renvoyé
  se pose tel quel dans le `content` d'une leçon pdf/fichier — la protection par lien signé à
  durée limitée (10 min) existe déjà depuis l'Étape 2 (`functions/_lib/fileAccess.js`) et
  s'applique automatiquement, sans rien à faire de plus : un document ainsi créé n'est jamais
  accessible par simple partage d'URL, vérifié par les suites existantes qui exercent ce chemin.
- Interface (`apps/web/src/admin/CoursesAdmin.jsx`, `apps/web/src/admin/AdminApp.jsx` passé à 3
  onglets Licences/Formations/Journal) : même langage visuel que Mission 14 (HTML brut,
  `.admin-*` dans `index.css`, pas les composants `platform/ui/*` — deux systèmes de design
  distincts, confirmé en explorant le code existant avant d'écrire une ligne). Formulaire de
  leçon unique dont les champs changent avec le type (texte/vidéo/pdf/fichier/live/simulateur/
  exercice — le select d'exercice lit `@simulateur/exercises` directement, pas de duplication de
  la liste).
- Tests : `functions/__tests__/courses-admin-api.test.js` (13, dont le critère d'acceptation
  rejoué côté API jusqu'au vrai catalogue étudiant), `apps/web/e2e-admin/courses-admin.spec.js`
  (2, dont le parcours complet ci-dessus). `functions/__tests__/testServer.js` applique maintenant
  `migrations/0003` par défaut pour **tout** test (c'est un schéma, pas une fixture — même
  traitement que 0001/0002, jamais opt-in) ; `playwright.admin.config.js` gagne `--r2 CONTENT` et
  la migration 0003 (absents jusqu'ici, l'admin ne pouvait pas téléverser en e2e).
- **1 bug réel de lint trouvé en cours de route** (pas un bug produit, mais une vraie violation de
  `react-hooks/set-state-in-effect`) : deux `useEffect` de `CoursesAdmin.jsx` appelaient une
  fonction `refresh()` asynchrone directement au lieu d'inliner l'appel avec un drapeau
  `cancelled`, seul motif déjà établi dans ce fichier (`AdminDashboard.jsx`, `CataloguePage.jsx`,
  etc.) qui satisfait cette règle. Corrigé pour suivre exactement le même motif.

**Rien de reporté explicitement pour cette étape** — les six points de MISSION-23.md §Étape 4
(créer/modifier/réordonner/publier formations-modules-leçons, upload R2 + liens signés, URL
vidéo, session live avec lien réservé aux inscrits, remplacement de `scripts/seed-dev-course.sql`
comme moyen de créer une formation) sont tous faits et vérifiés par l'usage. `scripts/seed-dev-
course.sql` lui-même n'a pas été supprimé : il reste le fixture de plusieurs suites de tests
existantes (`platform.spec.js`, `platform-api.test.js`) qui ont besoin d'une formation réelle
préexistante pour exercer des fonctionnalités étudiantes sans dépendre de l'admin — un script de
test fixture est un besoin différent de « comment Massy crée du vrai contenu », qui passe
désormais entièrement par `/admin`.
**Idée d'évolution notée, pas implémentée** (hors périmètre explicite de cette étape) : aperçu
d'un fichier téléversé directement depuis `/admin` avant publication (aujourd'hui, l'admin voit
juste le nom du fichier confirmé, pas un rendu) — pourrait être utile mais n'était pas demandé.

**C. Marque et domaine** : CLAUDE.md porte déjà (édité directement par Massy le 08-09/10/2026,
hors de cette session) la décision de renommer le produit **« Orionis Academy »** (remplace tous
les noms provisoires — « GDS Academy » compris) et confirme le domaine **`orionisacademy.com`**
comme URL canonique (Cloudflare Pages, SSL émis). Appliqué ici, strictement dans les deux
périmètres où ces décisions s'appliquent réellement :
- Nom affiché : `Brand.jsx` (« GDS Academy » → « Orionis Academy », y compris l'`aria-label`),
  titre/description SEO de `apps/web/index.html` (texte exact donné par `CLAUDE.md`), assertions
  de test mises à jour en conséquence (`platform-ui.test.jsx`, `platform.spec.js`). **Pas touché** :
  la coquille historique « Simulateur Amadeus GDS » du mode libre (`/simulateur`, `Onboarding.jsx`,
  `App.test.jsx`, `FeedbackButton.jsx`, dictionnaire) — ce nom n'a jamais été un des noms
  provisoires visés par la décision (c'était le vrai nom du produit avant la Mission 23, pas une
  piste explorée pendant la refonte), le toucher aurait été un élargissement de périmètre non
  demandé.
- URL : `README.md` (lien `/admin` + commande de dev locale, qui gagne aussi la migration 0003
  manquante). **Pas touché** : les mentions de `gds-amadeus-simulateur.pages.dev` dans des
  entrées datées de journal (`CLAUDE.md`, `PROJECT_MEMORY`, `TASKS.md`, `AUDIT.md`) décrivant un
  déploiement passé — réécrire l'historique serait factuellement faux (le domaine n'existait pas
  à ces dates). Aucun `canonical`/`og:*`/`robots.txt`/`sitemap` n'existe dans le projet — **non
  créés ici**, comme demandé explicitement ; notés ci-dessous en amélioration recommandée pour
  une passe SEO dédiée future.

**Confirmé conforme aux suites automatisées, relancées intégralement après le renommage et le
refactor de lint** : lint propre, typecheck propre, 268+9+47 `packages/*`, 86 Vitest `apps/web`,
58 `functions` (13 nouveaux), 35 e2e Playwright principal, 6 e2e admin (2 nouveaux) — tous verts.
Build : chunk partagé homepage ≈ 61 Ko gzip JS, CSS ≈ 7,7 Ko gzip (budgets 180/25 Ko, admin hors
budget par nature — DESIGN-SYSTEM §7 ne couvre que la plateforme étudiante).

**Amélioration recommandée, pas implémentée** : passe SEO dédiée (canonical, og:*, sitemap,
robots.txt) — aucun n'existe aujourd'hui, explicitement non créés dans cette session (tâche
bornée au remplacement d'URL, pas une passe SEO).

**Un seul serveur de dev, arrêté à la fin de la session** (voir note méthode) — aucun process
`wrangler`/`workerd` laissé tourner.

### 08/10/2026 — Mission 23 Étape 3 (navigation + intégration réelle du simulateur, mode autonome)
Retour Massy sur deux points après la passe « vivant » (entrée suivante) : navigation cassée
(pas de retour à l'accueil) et image de héros « floue et bizarre ». Détail exigence par exigence
dans `docs/EXIGENCES-UX.md` §N (navigation) et §O (simulateur), statuts A2/D4/G3/H3 mis à jour,
bloc de clôture dédié en bas du même document.

**A. Corrections de navigation** : `Brand`/`PlatformLayout` acceptent désormais `brandTo`
(visiteur → `/`, connecté → `/app/catalogue`) ; nouveau composant `Breadcrumb.jsx` câblé sur
`CoursePage` (3 maillons) et `LessonPlayerPage` (4 maillons, jusqu'au titre de la leçon) ; le
bouton retour explicite du lecteur de leçon existait déjà avant cette session (conservé) ; bouton
précédent du navigateur confirmé par un vrai `page.goBack()` en e2e. Image de héros : sortie du
fond (opacité 38%/22% sous un voile dégradé) vers un cadre net (`pf-hero-photo`, rayon 20px,
pleine opacité, superposition couleur en `mix-blend-mode` plutôt qu'une réduction d'opacité),
composée au-dessus du terminal (`pf-hero-visual`) au lieu d'être une texture derrière le texte.

**B. Intégration du simulateur** : le cours réel (`scripts/seed-dev-course.sql`) gagne un Module 2
« Pratique au clavier » — 10 leçons `exercice` (chacune `content.exerciseId` pointant vers un
fichier de `packages/exercises/content/`) + 1 leçon `simulateur` (terminal libre). Nouveaux
composants `LessonExercisePanel.jsx` (résout l'id vers l'objet Exercise réel via `exercisesById`,
réutilise `ExercisePanel.jsx` sans le modifier fonctionnellement) et `LessonSimulatorView.jsx`
(terminal libre + bouton de sortie flottant, `React.lazy`). `ExercisePanel.jsx` gagne un
`onPassed` (alimente `lesson_progress` dès la première réussite de `evaluate()`, jamais répété) et
trois props d'override de libellé (`abandonLabel`/`backToHomeLabel`/`showBackToPicker`) pour que
le mode leçon affiche « Retour à la leçon » au lieu de « Abandonner »/« Retour à l'accueil »
(mode libre inchangé — props optionnelles). Sur mobile (`useIsMobileViewport`, 767px), aucune
tentative de charger le terminal : message `mobileBlockedTitle`/`Body` déjà prévu en Étape 2.

**RÈGLE ABSOLUE vérifiée, pas juste affirmée** : le terminal reste strictement identique au mode
libre. `LessonSimulatorView` rend `<Terminal>`/`<ExercisePanel>` **en dehors de `.platform-root`**
(jamais dans `<PlatformLayout>`) — c'est la seule façon d'empêcher `platform.css`
(`font-family`/`color`/`background` posés sur `.platform-root`) de déteindre sur `index.css`, qui
n'a aucune classe scopée et resterait sinon « byte-for-byte identique » seulement en apparence.
Vérifié structurellement en e2e (`expect(page.locator(".platform-root .terminal")).toHaveCount(0)`).

**Chargement à la demande, pour de vrai cette fois** : `App.jsx`/`AdminApp.jsx` étaient encore
importés statiquement dans `main.jsx` depuis des missions antérieures — ils gonflaient le chunk
partagé (chargé par **tout** visiteur, y compris sur `/`) de tout le poids de `Terminal.jsx`/
`@simulateur/core`/`@simulateur/data`, rendant inutile le `React.lazy()` de `LessonSimulatorView`.
Passés en `lazy()` comme `HomePage`/`PlatformApp`/`StyleguidePage`. Effet mesuré : chunk partagé
101,7 Ko → 60,9 Ko gzip. `Terminal`/`ExercisePanel`/`@simulateur/exercises` ont maintenant leurs
propres chunks (22,4 Ko et 7,1 Ko gzip), jamais chargés tant qu'une leçon `simulateur`/`exercice`
n'est pas réellement ouverte.

**1 bug réel trouvé par la revue visuelle, invisible à toutes les suites automatisées** (aucun
test JS ne calcule un style CSS appliqué, seul un vrai navigateur le fait) : la règle responsive
qui cache le sommaire latéral du lecteur de leçon sous 1024px (`@media (max-width:1023px)
{ .pf-lesson-sidebar { display:none } }`) vivait, par erreur, **avant** la règle de base
(`.pf-lesson-sidebar { display:flex }`) dans `platform.css`. Les deux ayant la même spécificité,
c'est l'ordre dans le fichier qui tranchait une fois les deux présentes — la règle de base
(déclarée après) gagnait donc toujours, même sous le point de rupture. Le sommaire ne disparaissait
JAMAIS sur mobile, pour aucun type de leçon, depuis l'Étape 2. Repéré en capturant l'écran bloqué
simulateur à 390px (sommaire affiché en pleine largeur au-dessus du message attendu). Corrigé en
réordonnant les deux règles ; revérifié par capture après correction.

**Confirmé conforme aux suites automatisées** (toutes relancées après le fix CSS ci-dessus) :
lint propre, 86 Vitest `apps/web`, 45 `functions`, 35 e2e Playwright principal (3 nouveaux tests :
fil d'Ariane + bouton précédent, leçon exercice bout en bout avec le vrai terminal, leçon
simulateur bout en bout), 4 e2e admin, build : chunk partagé homepage 60,9 Ko gzip JS / 7,4 Ko
gzip CSS (budgets 180/25 Ko).

**Non encore satisfait, reporté explicitement** : tout ce qui était déjà reporté aux clôtures
précédentes (A4 photo formateur, A6 pages Contact/Conditions, A9 relecture orthographique, G2
tension zones cliquables, H1/K8 mesures de performance réelles, L6 contraste mesuré) reste dans le
même état — rien dans son périmètre n'était concerné par cette étape.

**Note méthode** : captures à 1280px et 390px, dark et light, prises via un script Playwright
jetable (`.tmp-audit-step3.mjs`, non committé) contre un vrai `wrangler pages dev` local, avec un
vrai passage de scroll avant chaque capture pleine page (même raison qu'à la clôture précédente :
`page.screenshot({fullPage:true})` ne scrolle jamais réellement, donc ne déclenche jamais
`useRevealGroup.js`). Rate limit d'inscription (5/15min, IP factice locale partagée par tout
process `wrangler pages dev`/test) épuisé deux fois par l'enchaînement rapide de runs manuels et
de suites e2e dans cette même session — purgé via `/api/dev/reset-rate-limits` (route de test déjà
existante, `MAIL_DEV_ECHO` gardée active), pas un vrai bug. Un seul serveur de dev, arrêté à la fin.

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

