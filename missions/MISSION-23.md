# MISSION 23 — Plateforme e-learning (sur mesure, même stack)

**Décision Massy 06/10/2026** : construire sur mesure sur Cloudflare Pages + D1 (zéro frais
mensuel, paiement algérien possible, le simulateur s'intègre nativement). Premier des trois
chantiers restants (ordre choisi : Plateforme → Auto-licence → Fidélité).
**Durée réaliste : 5-8 sessions.** C'est le plus gros chantier du projet.

## Vision

Une plateforme de formation où **le simulateur Amadeus n'est qu'un cours parmi d'autres**.
Massy doit pouvoir ajouter une nouvelle formation (langues, tourisme, autre GDS…) sans
qu'un développeur touche au code. L'étudiant a un compte, suit des leçons, voit sa
progression, obtient une attestation.

Contrainte structurante : **tout ce qui existe déjà reste intact** — le simulateur
(`packages/core`, `Terminal.jsx`) et le moteur d'exercices (`packages/exercises`) ne sont
pas réécrits, ils deviennent un type de leçon parmi d'autres.

## Architecture

- **Données (D1, nouvelles tables)** : `users`, `courses`, `modules`, `lessons`,
  `enrollments`, `lesson_progress`. Les tables `licenses`/`activations` existantes restent
  et se rattachent à `users` (une licence appartient désormais à un compte).
- **Auth étudiant** : email + mot de passe haché (PBKDF2 ou scrypt via Web Crypto dans la
  Function — jamais de hachage côté client), session par jeton signé (réutiliser
  `functions/_lib/token.js`). Pas de service tiers.
- **Types de leçon** (élargi à la demande de Massy, 06/10/2026 — la plateforme doit
  accueillir **toute formation**, pas seulement Amadeus) :
  - `texte` — contenu rédigé (markdown)
  - `video` — vidéo intégrée. **Ne pas héberger les fichiers vidéo** (coût de stockage et de
    bande passante disproportionné) : intégrer une URL YouTube/Vimeo en « non répertorié ».
    Documenter ce choix et son alternative payante (Cloudflare Stream) pour plus tard.
  - `pdf` — document affiché dans un lecteur intégré + bouton de téléchargement
  - `fichier` — ressources téléchargeables attachées à une leçon (support de cours, fiche
    mémo, modèle à remplir, archive) — plusieurs fichiers par leçon, avec nom et taille
    affichés
  - `live` — session en direct (Zoom, Meet, Teams) : titre, **date et heure**, lien, durée,
    état (à venir / en cours / passée), bouton « ajouter à mon agenda » (fichier .ics, pas
    d'intégration tierce). Le lien n'est visible qu'aux inscrits.
  - `simulateur` — ouvre le terminal libre
  - `exercice` — un exercice de `packages/exercises`
  - `quiz` — déclaré dès maintenant, implémenté en MISSION-24

- **Stockage des fichiers** : **Cloudflare R2** (même compte, offre gratuite généreuse,
  aucun nouveau fournisseur). Téléversement depuis `/admin`, liens d'accès signés et à durée
  limitée pour que les documents payants ne soient pas partageables publiquement. Ne jamais
  mettre de binaire dans D1 ni dans le dépôt Git. Si R2 pose problème en cours de route, le
  repli documenté est le lien externe (Drive), pas l'hébergement maison.
- **Back-office** : étendre le `/admin` existant (même authentification par phrase secrète)
  avec la gestion des formations, modules et leçons.

## Points d'extension à RÉSERVER dès l'étape 1 (décision architecte, 06/10/2026)

Les missions 24 (quiz, notation) et 25 (assistant IA) feront partie de **la même
application**, pas d'un produit séparé qu'on brancherait après. Elles ne sont pas construites
maintenant, mais le modèle de données et les interfaces doivent les accueillir **sans
migration douloureuse ni refonte** :

1. **Type de leçon ouvert** : `lessons.type` est une valeur libre contrainte par une liste
   (`texte`, `video`, `simulateur`, `exercice`, `quiz`). Déclarer `quiz` dès maintenant même
   si aucun quiz n'existe — ajouter une valeur à une contrainte CHECK en production est une
   migration évitable.
2. **Progression chiffrée** : `lesson_progress` prévoit dès le départ `score` et
   `max_score` (nullable), même si l'étape 2 ne fait que du « terminé / pas terminé ».
   La mission 24 les remplira sans toucher au schéma.
3. **Contexte exposé** : le lecteur de leçon expose proprement « quelle leçon, quel
   exercice, quelle dernière commande » — c'est exactement ce dont l'assistant de la
   mission 25 aura besoin. Ne pas enfouir cet état dans un composant.
4. **Tableau de bord = coquille** : l'étape 2 crée la page « Mon compte / progression ». La
   mission 24 y ajoute les scores. Ne pas créer une deuxième page concurrente plus tard.

Ne rien implémenter de 24/25 ici — juste ne pas se fermer la porte.

## ⚠️ MODE AUTONOME (décision Massy, 06/10/2026)

Cette mission s'exécute **sans intervention de Massy, du début à la fin**. Tout ce qui
aurait demandé un arbitrage est déjà décidé dans :
- `docs/DESIGN-SYSTEM.md` — couleurs, typographie, espacements, composants, mouvement,
  budgets de performance, accessibilité. **Valeurs figées, à appliquer telles quelles.**
- `docs/SECURITE.md` — mots de passe, sessions, CSRF, en-têtes, contenu payant, audit.
  **Exigences obligatoires dès la première ligne, pas à la fin.**
- `docs/DESIGN-PSYCHOLOGIE.md` et `docs/ETUDE-PLATEFORMES-ELEARNING.md` — le pourquoi.

**Règles du mode autonome :**
1. Ne jamais s'arrêter pour demander une couleur, un libellé, une structure ou un
   compromis : trancher selon les documents ci-dessus, et noter la décision dans le commit.
2. Si une question est vraiment sans réponse dans les documents, choisir la solution la plus
   simple et la plus réversible, la consigner dans `TASKS.md` section « À valider par
   Massy », et **continuer**.
3. **Ne rien déployer en production.** La production actuelle (simulateur + accès par clé)
   doit continuer de fonctionner à l'identique pendant tout le chantier. Le branchement et
   le déploiement se feront avec Massy quand il aura vérifié.
4. Enchaîner les étapes sans attendre de feu vert. S'arrêter uniquement en limite de
   session, en notant la reprise exacte dans `TASKS.md`.
5. Rituel de non-régression **après chaque étape** : les 6+ suites vertes, lint, typecheck,
   budgets de performance mesurés, checklist sécurité de fin d'étape.

## Étapes (une par session, protocole de non-régression habituel)

### Étape 0 — Fondations visuelles et sécurité (AVANT toute fonctionnalité)
Mettre en place les **jetons de design** de `docs/DESIGN-SYSTEM.md` en variables CSS dans
une feuille unique, les composants de base (bouton, champ, carte, badge, barre de
progression, état vide, squelette de chargement), le gabarit de page (barre supérieure,
conteneur 1200 px, menu mobile), le fichier `_headers` de `docs/SECURITE.md`, et une page
de démonstration interne `/styleguide` qui affiche tous les composants dans tous leurs
états. Mesurer les budgets de performance dès maintenant — ils ne se rattrapent pas après.
Rien de métier ici : c'est le socle sur lequel tout le reste s'appuie.

### Étape 1 — Modèle de données + authentification étudiant
Migration D1 (nouveau fichier `migrations/0002_*.sql`, ne jamais modifier le 0001 déjà
appliqué en production). Functions : inscription, connexion, déconnexion, session courante,
mot de passe oublié (le circuit mail viendra en MISSION-22 — prévoir le point d'accroche).
Tests Functions + e2e. Rien d'affiché encore.

### Étape 2 — Espace étudiant
Catalogue des formations, page d'une formation (description, sommaire des modules),
inscription à une formation, lecteur de leçon avec navigation précédent/suivant, marquage
« terminé », barre de progression, page « Mon compte ». FR/EN via le dictionnaire existant.
Design cohérent avec l'accueil actuel.

### Étape 3 — Intégration du simulateur et des exercices
Le cours « Amadeus niveau 1 » est créé comme donnée (pas en dur) : ses leçons de type
`exercice` pointent vers les 10 exercices existants, une leçon `simulateur` ouvre le
terminal libre. La progression des exercices (déjà évaluée par `packages/exercises`)
alimente `lesson_progress`. **Vérifier que le terminal reste strictement identique** —
test obligatoire, comme en MISSION-08.

### Étape 4 — Back-office formations
Dans `/admin` : créer/modifier/réordonner formations, modules et leçons, publier/dépublier,
**téléverser des PDF et des documents (R2), coller une URL vidéo, programmer une session
live avec sa date et son lien**.
Objectif vérifiable : **Massy crée une formation de test complète — une leçon vidéo, un PDF,
un document à télécharger, une session live — sans aide et sans écrire une ligne de code.**

### Étape 5 — Attestation + clôture
Attestation de fin de parcours en PDF, nominative, générée quand 100 % des leçons sont
terminées (elle n'a aucune valeur officielle — le dire explicitement dessus). Rituel de
clôture complet, vérification production.

## Critères d'acceptation
- [ ] Un étudiant crée un compte, s'inscrit à la formation Amadeus, suit les leçons, voit sa
      progression persister entre deux connexions
- [ ] Massy ajoute une 2e formation (même factice) entièrement depuis `/admin`, contenant
      **au moins une vidéo, un PDF, un fichier téléchargeable et une session live**
- [ ] Un document payant n'est pas accessible par simple partage d'URL (liens signés)
- [ ] Le terminal et les exercices sont inchangés en mode libre comme en mode cours
- [ ] Toutes les suites vertes + CI + production vérifiée + rituel de clôture
