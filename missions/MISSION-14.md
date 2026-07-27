# MISSION 14 — Espace administrateur + licences par poste (anticipé de la Phase 8)

**Ordre** : après MISSION-07 (pilote), AVANT toute vente large · **Durée** : 2-4 sessions
**Décisions Massy (06/07/2026)** : paliers dès le départ — individuel (1 poste) / école (2-4
postes) ; construction post-pilote.

## Objectif

Remplacer les clés en variable d'environnement par un vrai système : Massy gère tout depuis une
page `/admin` (générer, voir, révoquer), et une clé partagée ne fonctionne PAS sur plus
d'appareils que son palier ne l'autorise.

## Architecture (tout en offre gratuite)

- **Supabase** (Postgres + Auth) : tables `licenses` (clé hachée, palier/max_devices, client,
  statut, dates) et `activations` (licence_id, empreinte appareil, jeton, created_at, last_seen).
  RLS activé ; la clé service Supabase vit UNIQUEMENT dans les variables d'env Cloudflare
  (jamais dans le bundle ni le repo).
- **Cloudflare Pages Functions** :
  - `POST /api/license/activate` : clé + empreinte → si activations < max_devices : crée
    l'activation, renvoie un jeton signé stocké en localStorage. Sinon : refus neutre
    `DEVICE LIMIT REACHED` + compteur visible côté admin.
  - `POST /api/license/check` : jeton → valide/révoqué (appelé au chargement, tolérant hors-ligne
    bref). Révocation d'une clé = tous ses jetons meurent.
  - `/api/admin/*` : CRUD licences, réservé à Massy (Supabase Auth, son e-mail seul autorisé).
- **Empreinte appareil** : hachage stable de signaux navigateur (userAgent, écran, fuseau,
  canvas léger) — documenter honnêtement ses limites (un utilisateur très motivé peut la
  contourner ; l'objectif est de rendre le partage coûteux, pas cryptographiquement impossible).
- **Page `/admin`** (React, même app) : login Massy → tableau licences (client, palier, appareils
  utilisés/max, dernière activité), bouton « Nouvelle clé » (génération serveur, affichée une
  seule fois), révoquer/prolonger, export CSV.

## Ordre décidé par Massy (07/07/2026) : MISSION-14 puis MISSION-09 (quiz/notation).

## ⚠️ CHANGEMENT D'ARCHITECTURE (architecte, 07/07/2026) : Cloudflare D1 au lieu de Supabase

**Remplacer Supabase par Cloudflare D1** (base SQLite gratuite, même compte Cloudflare que
Pages). Raisons : aucun nouveau compte à créer (Massy ne peut/veut pas en ouvrir un de plus),
aucune clé secrète tierce à faire transiter, binding natif dans les Pages Functions déjà
utilisées par `verify-key.js`, une seule plateforme à administrer. Partout où la mission dit
« Supabase », lire « D1 ».

**Auth de l'espace admin** : pas de Supabase Auth. Une phrase secrète d'administration
(`ADMIN_SECRET_HASH`, haché SHA-256 en variable d'environnement Cloudflare, même pattern que
`ACCESS_KEY_HASHES`), vérifiée côté serveur par `/api/admin/login` qui renvoie un jeton de
session signé à durée limitée. Massy est le seul admin — inutile de complexifier. Les
`/api/admin/*` refusent toute requête sans jeton valide (réponse neutre, pas de fuite).

## ÉTAPE 0 — ce que Claude Code fait, et ce que Massy fait

**Claude Code (autonome, sans attendre Massy)** : créer le schéma SQL (`migrations/*.sql`),
les Functions, l'UI admin, les tests — en développant contre le **D1 local de Wrangler**
(`wrangler d1 execute --local`), qui ne demande aucune authentification. Tout doit être
testable en local de bout en bout avant de toucher à la production.

**Massy (2 minutes, à la fin, dans son dashboard Cloudflare qu'il a déjà)** :
1. Workers & Pages → D1 → Create database (nom : `gds-licences`)
2. Projet Pages `gds-amadeus-simulateur` → Settings → Bindings → ajouter un binding D1
   (variable `DB` → base `gds-licences`)
3. Settings → Environment variables → ajouter `ADMIN_SECRET_HASH` (le haché que
   `scripts/generate-keys.mjs` — ou un nouveau script `generate-admin-secret.mjs` — produira)
4. Redéployer, puis appliquer la migration en production (`wrangler d1 execute gds-licences
   --remote --file=...` ou via la console D1 du dashboard)

Claude Code rédige ces 4 étapes dans `README.md` §Administration avec les commandes exactes
avant de les demander à Massy.

## Étapes

1. Schéma Supabase + RLS + doc de création du projet (Massy crée le compte, 10 min, gratuit).
2. Functions activate/check + tests (limite de postes, révocation, clé inconnue → réponse neutre).
3. Migration : les clés pilote existantes sont importées dans `licenses` (palier individuel),
   l'ancien `ACCESS_KEY_HASHES` est retiré proprement après bascule vérifiée en production.
4. UI `/admin` + Auth (e-mail Massy uniquement) + tests Playwright dédiés.
5. Parcours client : messages clairs à l'activation (« appareil 2/4 enregistré »), erreur palier
   atteint avec contact pour upgrade. FR/EN.
6. Doc `docs/LICENCES.md` : fonctionnement, limites de l'empreinte, procédure de support
   (« client a changé de PC » → révoquer l'activation orpheline depuis /admin).

## Critères d'acceptation
- [ ] Une clé individuelle testée sur 2 appareils : le 2ᵉ est refusé avec message propre
- [ ] Une clé école (4 postes) : 4 activations OK, la 5ᵉ refusée
- [ ] Révocation depuis /admin → accès coupé en production en < 1 min
- [ ] Massy génère et révoque une clé sans aide, uniquement via /admin
- [ ] Aucun secret dans le repo/bundle ; RLS vérifié ; suites + CI vertes ; rituel de clôture
