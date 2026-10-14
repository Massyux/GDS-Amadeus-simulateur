# CLAUDE.md — Simulateur Amadeus (GDS-Amadeus-simulateur)

> À déposer à la racine du repo local (`GDS-Amadeus-simulateur/CLAUDE.md`), à côté de
> `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md`. Ce fichier ne remplace pas PROJECT_MEMORY (qui reste
> la référence architecture/philosophie/règles métier) — il donne le contexte de reprise,
> la roadmap de commercialisation et la méthode de travail. Claude Code lit ce fichier
> automatiquement au démarrage d'une session dans ce dossier.

## Constitution du projet (à lire et appliquer en premier)

@CONSTITUTION.md

Gouvernance commune à tous les assistants IA du projet (Claude Code, Claude Cowork) : rôles,
philosophie qualité, règle d'or des familles de bugs, classification des observations
(bug critique / incohérence / amélioration / idée), périmètre v1.0, règles de finalisation.
Intégrée le 05/07/2026 à la demande de Massy.

## Missions exécutables (05/07/2026)

Le plan d'exécution mission par mission vit dans `missions/` (voir `missions/README.md` : mode
d'emploi, séquence 01→11, règles de clôture). Une session Claude Code = une mission. La roadmap
produit ci-dessous reste la référence ; les missions en sont la déclinaison opérationnelle,
rédigées et auditées par l'architecte (Claude Cowork).

## Décisions produit (Massy, 05/07/2026)

- **Distribution v1** : web hébergé + accès par clé/lien privé (pas d'app à télécharger en v1)
- **Référence fidélité Amadeus** : pas d'accès live — souvenirs de Massy + manuels/docs publics ;
  tout message/détail incertain est marqué « à vérifier » et arbitré par Massy, jamais inventé
- **Langues de l'enveloppe pédagogique** : français + anglais (le terminal reste en anglais
  Amadeus authentique)
- **Périmètre v1.0 vendable** : commandes niveau 1-2 actuelles (cycle réservation complet) ;
  tarification complète et billetterie = v1.x après lancement
- **Infra v1 (05/07/2026)** : pas de base de données (app 100% client, localStorage) ;
  hébergement statique gratuit — Cloudflare Pages en premier choix (bande passante illimitée),
  Vercel/Netlify en alternative ; domaine optionnel au début (sous-domaine gratuit), .com
  (~12 $/an, Cloudflare Registrar ou Porkbun) au moment de vendre. Phase 6+ : Supabase (gratuit,
  Postgres + auth) pour comptes/clés/progression — **remplacé le 07/07/2026 par Cloudflare D1**
  (SQLite gratuit, même compte que Pages, binding natif dans les Functions, aucun compte tiers
  à créer ; auth admin par phrase secrète hachée en variable d'env). Paiement Algérie :
  Chargily Pay (CIB/EDAHABIA)
- **Marque (décision Massy, 08/10/2026) : « Orionis Academy ».** Nom déjà déposé et accepté
  par Massy pour son activité (l'agence *Orionis Voyage* est en cours d'agrément, pas encore
  ouverte). Le nom du produit affiché partout est **Orionis Academy** — remplacer tout nom
  provisoire (« Learning space », « GDS Academy », « Skillpoint », « Cockpit »).
  Signature sous le nom : *« Formation aux métiers du voyage »*.
  Titre des pages pour les moteurs de recherche : *« Orionis Academy — Formation aux métiers
  du voyage et de la réservation aérienne | Algérie »* (les mots-clés vivent dans les titres
  et les URL, pas dans le nom de domaine).
  ⚠️ **Tant que l'agrément n'est pas délivré, ne jamais présenter Orionis comme une agence de
  voyage en activité.** L'académie est une activité de formation, distincte.
  **Logo officiel intégré le 12/10/2026** (kit fourni par Massy) : `apps/web/src/platform/
  Brand.jsx` affiche désormais le vrai fichier vectoriel (deux variantes, sombre/clair) —
  **ne plus jamais le recomposer en texte/CSS**, toujours le fichier fourni
  (`apps/web/public/brand/`). Palette `--cyan`/`--coral` de `docs/DESIGN-SYSTEM.md` alignée sur
  le kit (le logo fait référence, pas l'inverse) ; détail dans `JOURNAL.md`/`TASKS.md`.
- **Domaine & e-mail (09/10/2026, acheté par Massy, configuré avec lui) :**
  `orionisacademy.com` acheté chez Cloudflare Registrar. **Domaines personnalisés Pages
  actifs et SSL émis** sur le projet `gds-amadeus-simulateur` : `orionisacademy.com` et
  `www.orionisacademy.com` (l'URL `*.pages.dev` reste valide, mais l'URL canonique à
  utiliser partout — SEO, e-mails, documents — est désormais **https://orionisacademy.com**).
  **Email Routing activé sur la zone**, 1 règle active :
  `contact@orionisacademy.com` → `orionisvoyage@gmail.com` (seule destination vérifiée).
  Catch-all = *Drop, désactivé* → tout e-mail envoyé à une autre adresse du domaine
  (`info@`, `support@`…) **n'arrive nulle part** tant qu'une règle n'est pas créée.
  ⚠️ Email Routing **reçoit uniquement**. Pour *envoyer* (clé de licence automatique,
  mission 22) il faut un service tiers — Resend ou Brevo — avec `orionisacademy.com`
  vérifié par enregistrements SPF/DKIM. Non fait à ce jour.
  Scorie à nettoyer : `contact@orionisvoyage.com` figure en *destination address* au statut
  *Pending* ; c'est une erreur de manipulation (une adresse professionnelle se crée en
  *routing rule*, pas en destination) et elle ne se vérifiera jamais. À supprimer.
- **Reprise du 06/10/2026 — le produit N'EST PAS fini** (correction explicite de Massy).
  Trois chantiers manquants, dans cet ordre : **23** plateforme e-learning sur mesure (le
  simulateur devient un cours parmi d'autres, Massy doit pouvoir ajouter des formations sans
  développeur) → **22** paiement Chargily + création/envoi automatique de la clé par e-mail
  (zéro étape manuelle ; **blocage levé le 09/10/2026** — le domaine `orionisacademy.com`
  est acheté ; reste à vérifier le domaine chez Resend ou Brevo pour pouvoir *envoyer*) → **21** fidélité des réponses écran (AN, RT, FXP/TQT, TTP — les
  affichages ne sont pas identiques au vrai Amadeus). Plateforme = sur mesure sur la stack
  actuelle (Cloudflare + D1), décision Massy.
- **Chaîne d'implémentation (06/07/2026)** : décision Massy — implémenter TOUTES les commandes
  manquantes (docs/COMMANDES-MANQUANTES.md) AVANT le pilote. Ordre : missions 15→16→17→13→18→
  19→20 en enchaînement continu avec non-régression après chaque commande (protocole dans
  missions/README.md §Chaîne). Le pilote (mission 07) attend la fin de chaîne.
- **Bug critique signalé par Massy (06/07/2026)** : IG ne sort pas complètement du PNR / ne
  l'ignore pas entièrement. Traité en ÉTAPE 0 de MISSION-15 (matrice transactionnelle complète
  IG/IR/ER/ET/XI à refondre et tester).
- **Licences & admin (06/07/2026, exécuté en avance de phase le 27/07/2026)** : espace admin +
  verrouillage par poste, paliers dès le départ — individuel (1 poste) et école (2-4 postes),
  liaison clé↔appareils via **Cloudflare D1** (remplace Supabase, décision architecte
  07/07/2026). **Mission CLOSE dans son ensemble, y compris la bascule production (Étape 3),
  faite et vérifiée le 28/07/2026** — reconfirmée vivante le 06/10/2026 après 4 mois d'arrêt
  (audit de reprise, `AUDIT.md` : l'architecte a vérifié que `/api/license/check` répond en
  production). Voir Phase 8 ci-dessous et `TASKS.md` pour le détail.
- **Mode API réel AN/SN (05/07/2026)** : validé comme évolution v1.x — provider
  `providers/availability/amadeus.js` (API Amadeus Self-Service « Flight Availabilities
  Search », Massy a déjà une clé) derrière un proxy serverless gratuit (clé jamais côté client,
  cache des réponses). Le provider sim déterministe RESTE le défaut : indispensable à la
  correction automatique des exercices (Phase 6). Mode réel = option démo/premium.

## Où en est le projet (résumé — 09/10/2026)

> Cette section remplace les 285 lignes de roadmap détaillée et d'archéologie des PR de juillet,
> déplacées sans perte dans **`docs/HISTORIQUE-ROADMAP.md`** le 09/10/2026. Motif : ce fichier
> est chargé automatiquement à chaque session ; de l'historique coché s'y repayait à chaque
> démarrage. **Les quatre fichiers et leur usage :**
>
> | Fichier | Contenu | Quand le lire |
> |---|---|---|
> | `CLAUDE.md` (ici) | décisions en vigueur, méthode, état résumé | **toujours**, il est auto-chargé |
> | `TASKS.md` | état courant, reprise exacte, backlog | **au démarrage de chaque session** |
> | `JOURNAL.md` | compte rendu daté de chaque session passée | seulement sur question précise |
> | `docs/HISTORIQUE-ROADMAP.md` | plan d'origine Phases 0→8, sort des PR #2/#6 | seulement sur question précise |

**Terminé et en production** : le moteur GDS (`packages/core`), le terminal fidèle, les messages
d'erreur Amadeus, les 10 exercices guidés auto-corrigés (`packages/exercises`), l'accès par clé
de licence avec verrouillage par poste et espace admin (D1 + Functions), le déploiement
Cloudflare Pages. Site en ligne sur **https://orionisacademy.com**. Depuis le 11/10/2026 :
la plateforme e-learning Mission 23 est déployée en production (bucket R2, migrations D1,
secrets `SESSION_SECRET`/`ADMIN_SECRET_HASH` posés, connexion `/admin` confirmée par Massy).

**En cours** : **Mission 23** — plateforme e-learning, le simulateur devient un cours parmi
d'autres. Étapes 0 à 4 closes, Étape 5 (bascule production) **en grande partie close** le
11/10/2026 — reste à vérifier en production, faute de données de test existantes aujourd'hui :
création d'une vraie formation depuis `/admin`, persistance de la progression et attestation
d'un étudiant inscrit à une vraie formation, et l'accès par clé de licence (aucune clé pilote
n'a jamais été distribuée). L'inscription et la connexion étudiant, elles, sont désormais
vérifiées en production (corrigées le 11/10/2026 — voir ci-dessous). Détail et reprise exacte
dans `TASKS.md` §En cours.
**Règle de plateforme découverte le 11/10/2026, à connaître avant toute future utilisation de
`crypto.subtle` dans `functions/`** : les Workers Cloudflare plafonnent PBKDF2 à 100 000
itérations (`NotSupportedError` au-delà) — une limite invisible en local (`wrangler pages dev`,
tests Node) qui a empêché toute inscription de réussir en production pendant toute la
Mission 23 sans qu'aucun test ne le détecte. Tout code touchant à `crypto.subtle` doit être
vérifié sur un vrai déploiement avant d'être considéré fiable.
**🟢 Régression critique résolue le 11/10/2026 : le site était un cul-de-sac depuis l'accueil**
(`main.jsx` ne réagissait jamais à un changement d'URL après le premier chargement — cliquer
« Commencer » ne menait nulle part). Corrigée, vérifiée par clic réel en production à 1280 et
390px, 13 nouveaux tests. **Leçon méthodologique à appliquer durablement sur ce projet** : une
suite e2e qui entre toujours par `goto()` direct dans la zone testée ne teste jamais la porte
d'entrée — tout parcours qu'un visiteur réel emprunte doit avoir au moins un test qui part d'où
il part, et qui clique. Détail dans `JOURNAL.md`/`TASKS.md`.

**🟢 Chantier correctif « accueil » CLOS le 15/10/2026** (prompt de l'architecte du
11/10/2026, lancé par Massy en mode autonome le 14/10, les 4 chantiers enchaînés sans feu vert).
Chantier 1 : démo du terminal, route `/demo`, vrai `Terminal.jsx` monté sans compte ni clé,
limitée à un PNR complet ou 15 commandes. Chantier 2 : route `/app/inscription` directe
(« Commencer » menait jusqu'ici à l'écran de connexion). Chantier 3 (15/10) : pied de page —
Contact traité (vraie adresse mail), Conditions/Remboursement mènent à de vraies pages avec un
état d'attente explicite, **aucun texte juridique écrit par Claude** — le texte réel reste à
écrire par Massy, et **ces deux pages bloquent toujours Mission 22** (pas de paiement sans CGV
ni politique de remboursement publiées). Chantier 4 (15/10) : habillage `/admin` aux couleurs et
à la police de `docs/DESIGN-SYSTEM.md`, structure et comportement inchangés. Tout **vérifié en
production par clic réel**, 1280/390px. Détail dans `TASKS.md`/`JOURNAL.md`.
**Logo : variante compacte intégrée le 14/10/2026** (`PROMPT-LOGO-COMPACT.md`) — corrige la
lisibilité d'ACADEMY en barre de nav. `apps/web/src/brandLogo.js` est désormais la seule source
de vérité pour le choix de fichier (taille, thème), partagée par `Brand.jsx` et `/admin`.

**Après, dans cet ordre** (décision Massy 06/10/2026) : **22** paiement Chargily + envoi
automatique de la clé par e-mail (bloqué en partie par les pages légales ci-dessus) → **21**
fidélité des réponses écran (AN, RT, FXP/TQT, TTP — **Massy pilote cette mission lui-même, ne
pas la démarrer seul**) → **24** quiz et notation → **25** assistant IA pédagogique.

**En attente côté Massy, pas côté code** : Mission 07 Partie B (recruter 5-15 pilotes, consigner
les retours dans `docs/PILOTE.md`), l'agrément de l'agence, et la vérification auprès d'un
comptable/CNRC que l'activité de formation peut être enregistrée sans l'agrément tourisme.

## Outillage recommandé pour Claude Code (réduire les bugs, pas les garantir)

Aucun outil ne garantit "zéro bug" — ce qui marche, c'est un système qui rattrape les erreurs vite,
avant qu'elles arrivent sur main. D'où cette liste :

**Déjà en place**
- ESLint (`apps/web`) — lancer `npm run lint` régulièrement
- `node --test` sur `packages/core`, `packages/data` et `packages/exercises` — tests
  golden/invariant
- Vitest + React Testing Library sur `apps/web` (`npm run test:web`)
- `// @ts-check` + JSDoc sur `packages/core` et `packages/exercises`
  (`npm --prefix <package> run typecheck`)
- Husky + lint-staged (`.husky/pre-commit`)
- CI GitHub Actions (`.github/workflows/ci.yml`)
- Playwright (`npm run test:e2e`)

Tout ce qui était listé "à ajouter (Phase 0.5)" est fait (voir détail dans la section Phase 0.5
de la roadmap ci-dessus, y compris le point de vigilance sur `package-lock.json`).

**Côté Claude Code (VS Code)**
- Un hook Claude Code qui relance `npm test` automatiquement après chaque édition de fichier, pour
  voir immédiatement si un changement casse quelque chose
- `CLAUDE.md` (ce fichier) déjà en place comme mémoire de contexte
- Pas de "skill" Claude Code spécifique nécessaire pour ce projet — les skills servent plutôt à des
  tâches comme la génération de documents. Le vrai levier ici, c'est la combinaison tests + lint +
  hooks + CI ci-dessus, appliquée strictement à chaque tâche (voir méthode de travail ci-dessous)

## Méthode de travail (à respecter strictement)

Une tâche à la fois, jamais deux en parallèle. Pour chaque tâche :

1. Spec courte (qu'est-ce qui change, pourquoi, critères d'acceptation)
2. Handler/code
3. Tests (golden en priorité — pas de tests unitaires superflus, voir PROJECT_MEMORY §8.2)
4. Intégration
5. UX en dernier
6. **Merger tout de suite** — pas de branche qui vit plus d'une session de travail
7. Mettre à jour `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md` (règles métier/état) et, pour
   l'avancement, **`TASKS.md` §En cours** (état courant et reprise exacte, rien d'autre) **plus
   une entrée datée en haut de `JOURNAL.md`** (le compte rendu détaillé de la session).
   ⚠️ Ne pas remettre de compte rendu daté dans `TASKS.md` : la séparation du 09/10/2026 existe
   précisément pour que `TASKS.md` reste court — il est relu à chaque démarrage, `JOURNAL.md` non.

Objectif explicite : ne jamais reproduire le pattern des PR #2/#6 — des branches qui dorment
6 mois faute de décision. Fermer la boucle à chaque session.

## Profil du porteur de projet (contexte utile)

Massy — introverti, exigeant sur la qualité (refuse le générique), temps limité (service national
en cours), a du mal à prioriser entre ses nombreux projets mais revient toujours sur celui-ci.
Préfère des sessions courtes et régulières avec un livrable clair plutôt que du scope flou.
