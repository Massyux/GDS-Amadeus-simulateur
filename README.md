# Simulateur Amadeus (monorepo)

## Installation

```bash
npm install
```

## Lancer le frontend

```bash
npm run dev:web
```

## Tests

```bash
npm run test
```

## Build du frontend

```bash
npm run build:web
```

## Structure

- `apps/web` : frontend React (Vite)
- `packages/core` : moteur de commandes (core)
- `packages/data` : DataStore / provider de codes ville
- `functions/api/verify-key.js` : Cloudflare Pages Function, validation des clés d'accès (Mission 06, pilote)
- `functions/api/license/*`, `functions/api/admin/*` : Mission 14, licences par poste (Cloudflare D1)
- `migrations/*.sql` : schéma D1

## Gestion des clés d'accès (Mission 06)

Le site public ne donne accès au terminal qu'avec une clé valide (format `GDS-XXXX-XXXX`).
Les clés ne sont jamais stockées en clair : seuls leurs hachés SHA-256 vivent dans la variable
d'environnement Cloudflare Pages `ACCESS_KEY_HASHES` (liste séparée par des virgules).

**Générer de nouvelles clés** (en local, jamais commité) :

```bash
node scripts/generate-keys.mjs 5   # génère 5 clés
```

Le script écrit un CSV en clair dans `keys/` (dossier gitignored — à distribuer toi-même, ne
jamais le committer) et affiche la liste des hachés à coller dans Cloudflare.

**Ajouter une clé** (sans toucher au code) : dashboard Cloudflare → le projet Pages
`gds-amadeus-simulateur` → Settings → Environment variables → `ACCESS_KEY_HASHES` → coller la
nouvelle liste de hachés (en les **ajoutant** aux hachés existants, séparés par une virgule, pas
en remplaçant) → redéployer (ou attendre le prochain push sur `main`, un redeploy manuel suffit
aussi pour n'appliquer qu'un changement de variable d'environnement).

**Révoquer une clé** : retirer son haché de `ACCESS_KEY_HASHES` dans le même écran, puis
redéployer. Sans le haché correspondant, la clé cesse immédiatement de fonctionner.

**Repli client (fallback)** : si les Cloudflare Pages Functions sont un jour bloquées, une
variable de build `VITE_FALLBACK_KEY_HASHES` (mêmes hachés, séparés par des virgules) peut être
définie pour que la validation se fasse côté navigateur. Moins robuste (les hachés finissent dans
le bundle livré, potentiellement extractibles hors-ligne) — solution de secours pilote uniquement,
documentée dans `CLAUDE.md`. Vide par défaut, donc inactive tant qu'elle n'est pas configurée
explicitement.

## Administration — licences par poste (Mission 14)

Remplace à terme les clés en variable d'environnement (Mission 06 ci-dessus) par un vrai système
de licences : palier individuel (1 poste) ou école (2-4 postes), un espace `/admin` pour Massy
(générer/révoquer les clés, voir les appareils activés), sur **Cloudflare D1** (SQLite gratuit,
même compte que Pages — décision architecte du 07/07/2026, remplace le Supabase envisagé au
départ : aucun nouveau compte à créer, aucune clé tierce à faire transiter).

Tout le code (schéma SQL, Functions, UI admin, tests) a été développé et testé de bout en bout
contre le **D1 local de Wrangler** — rien ne touche encore la production. Les 4 étapes ci-dessous
sont ce qu'il reste à faire, une seule fois, dans ton dashboard Cloudflare (2 minutes) :

**1. Créer la base D1** : dashboard Cloudflare → **Workers & Pages** → **D1** → **Create
database** → nom `gds-licences`.

**2. Lier la base au projet Pages** : projet Pages `gds-amadeus-simulateur` → **Settings** →
**Bindings** → **Add binding** → type **D1 database** → variable `DB` → base `gds-licences`.

**3. Générer et configurer la phrase secrète admin** (en local, jamais commitée) :

```bash
node scripts/generate-admin-secret.mjs
```

Note la phrase secrète affichée (c'est ton mot de passe pour `/admin` — le script ne l'écrit
nulle part, à toi de la garder). Colle le **haché** affiché juste en dessous dans : projet Pages
→ **Settings** → **Environment variables** → `ADMIN_SECRET_HASH` (en remplaçant une éventuelle
valeur existante — un seul admin, pas de liste à cumuler comme pour `ACCESS_KEY_HASHES`).

**4. Redéployer, puis appliquer le schéma en production** :

```bash
npx wrangler d1 execute gds-licences --remote --file=migrations/0001_init.sql
```

(ou colle le contenu de `migrations/0001_init.sql` dans l'onglet **Console** de la base D1 sur le
dashboard, si tu préfères ne pas utiliser la ligne de commande).

Une fois ces 4 étapes faites, `https://gds-amadeus-simulateur.pages.dev/admin` devient
utilisable : connexion avec la phrase secrète, tableau des licences, bouton **Nouvelle clé**
(génère et affiche une clé une seule fois — à distribuer toi-même), révoquer/prolonger,
export CSV. `docs/LICENCES.md` explique le fonctionnement complet, les limites de l'empreinte
appareil, et la procédure de support (« client a changé de PC »).

**Développer/tester en local** (sans toucher à la production, sans compte Cloudflare requis) :

```bash
npx wrangler d1 execute gds-licences --local --file=migrations/0001_init.sql   # une fois
npx wrangler pages dev apps/web/dist --port 8788                              # serveur local
node --test functions/__tests__/*.test.js                                     # suite de tests
```

`.dev.vars` (gitignored) contient déjà un `ADMIN_SECRET_HASH` de test pour le développement local
(phrase secrète : voir l'en-tête de `functions/__tests__/testServer.js` — jamais une vraie valeur).

**Important — bascule non encore faite** : l'accès au terminal (`AccessGate.jsx`) utilise
toujours `functions/api/verify-key.js` / `ACCESS_KEY_HASHES` (Mission 06) pour l'instant. Le
nouveau système de licences (`functions/api/license/*`) est complet et testé, mais brancher
l'accès réel dessus — et retirer `ACCESS_KEY_HASHES` — est une étape volontairement séparée, à
faire une fois les 4 points ci-dessus confirmés en production (voir `TASKS.md`).

## Mesure d'audience (Mission 07, pilote)

Cloudflare Web Analytics (gratuit, sans cookies, aucune bannière de consentement nécessaire) est
prêt côté code mais **inactif par défaut** — activé uniquement en configurant une variable
d'environnement, sans toucher au code :

1. Dashboard Cloudflare → **Web Analytics** → ajouter le site → copier le **jeton** (token) fourni
   (pas besoin du snippet complet, juste le token).
2. Projet Pages `gds-amadeus-simulateur` → Settings → Environment variables → ajouter
   `VITE_CF_BEACON_TOKEN` avec ce jeton → redéployer.

Tant que cette variable n'est pas définie, aucun script Cloudflare n'est chargé (aucun appel
réseau externe, y compris en local/CI).

## Feedback pilote

Un bouton discret « Feedback » (coin bas-droit de l'accueil et du terminal) ouvre un mailto
pré-rempli (version + écran d'origine) vers l'adresse de contact du projet. Le guide de démarrage
rapide (bouton « ? » coin bas-gauche) est accessible aux mêmes deux endroits, imprimable, et
rappelle la séquence complète de réservation.
