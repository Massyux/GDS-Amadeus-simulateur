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

## Gestion des clés d'accès (Mission 06 — remplacée par la Mission 14, voir ci-dessous)

**Historique, gardé pour référence.** Le terminal utilisait un système de clés à plat en variable
d'environnement (`ACCESS_KEY_HASHES`, `node scripts/generate-keys.mjs`, repli client
`VITE_FALLBACK_KEY_HASHES`). Depuis la bascule de la Mission 14 (Étape 3), `AccessGate.jsx` parle
au vrai système de licences ci-dessous — voir « Gestion des licences » plus bas pour générer et
révoquer des clés maintenant. `functions/api/verify-key.js` et la variable `ACCESS_KEY_HASHES`
restent en place, inutilisés, le temps de vérifier la bascule en production ; ils seront retirés
dans un nettoyage séparé (voir `TASKS.md`). Aucune clé pilote n'avait encore été distribuée au
moment de la bascule (Mission 07 Partie B jamais lancée) — rien à migrer.

## Administration — licences par poste (Mission 14)

### ⚠️ Deux portes, deux identifiants — ne pas confondre

Le simulateur a **deux écrans de connexion séparés**, chacun avec son propre identifiant. Se
tromper d'écran donne un message d'erreur qui ne dit pas lequel il fallait utiliser — cause de
confusion réelle vécue par Massy (28/07/2026), documentée ici pour ne pas se reproduire :

| Écran | Où | Identifiant attendu | Valeur en local/test | Valeur en production |
|---|---|---|---|---|
| **Accès terminal** (mode libre ou exercices) | `/` → bouton « J'ai une clé d'accès » | Une **clé de licence** `GDS-XXXX-XXXX` | `GDS-TEST-0001` (licence fixture, palier école/4 postes — voir `scripts/seed-e2e-test-license.sql`) | Une clé générée depuis `/admin` → **Nouvelle clé**, distribuée au client |
| **Espace admin** | `/admin` | Une **phrase secrète** (un seul admin, pas de clé `GDS-...`) | `test-admin-secret` (valeur fixe dans `.dev.vars`, jamais une vraie phrase — voir `functions/__tests__/testServer.js`) | La phrase générée une fois par Massy via `node scripts/generate-admin-secret.mjs` (lui seul la connaît) |

Une phrase secrète admin ne fonctionnera jamais sur l'écran `/`, et une clé de licence ne
fonctionnera jamais sur `/admin` — ce sont deux systèmes distincts (`ADMIN_SECRET_HASH` vs. la
table `licenses`), pas un mauvais mot de passe.

Système de licences : palier individuel (1 poste) ou école (2-4 postes), un espace `/admin` pour
Massy (générer/révoquer les clés, voir les appareils activés), sur **Cloudflare D1** (SQLite
gratuit, même compte que Pages — décision architecte du 07/07/2026, remplace le Supabase envisagé
au départ). **En production depuis l'Étape 3 (27/07/2026)** : base créée, schéma appliqué, binding
`DB` actif sur le projet Pages, `ADMIN_SECRET_HASH` configuré, `AccessGate.jsx` branché dessus.
Les 4 étapes de mise en place (créer la base, lier le binding, générer la phrase secrète admin,
appliquer le schéma) ont été faites une fois et n'ont pas à être répétées — gardées ci-dessous
pour mémoire seulement en cas de nouvelle base (changement de compte Cloudflare, etc).

`https://gds-amadeus-simulateur.pages.dev/admin` : connexion avec la phrase secrète, tableau des
licences, bouton **Nouvelle clé** (génère et affiche une clé une seule fois — à distribuer
toi-même), révoquer/prolonger, export CSV. `docs/LICENCES.md` explique le fonctionnement complet,
les limites de l'empreinte appareil, et la procédure de support (« client a changé de PC »).

**Développer/tester en local, environnement complet en une commande** (build + schéma + licence
de test `GDS-TEST-0001` + serveur Functions/D1, sans toucher à la production, sans compte
Cloudflare requis) :

```bash
npm run build:web && npx wrangler d1 execute gds-licences --local --file=migrations/0001_init.sql && npx wrangler d1 execute gds-licences --local --file=scripts/seed-e2e-test-license.sql && npx wrangler pages dev apps/web/dist --port 8788
```

Les deux `wrangler d1 execute` sont idempotents (sans risque à relancer sur une base locale déjà
initialisée). Une fois le serveur prêt (`http://localhost:8788`), utilise le tableau ci-dessus :
`GDS-TEST-0001` sur `/`, `test-admin-secret` sur `/admin`.

Suite de tests seule (sans serveur manuel, `functions/__tests__/testServer.js` gère son propre
D1 jetable) :

```bash
node --test functions/__tests__/*.test.js
```

`.dev.vars` (gitignored) contient déjà un `ADMIN_SECRET_HASH` de test pour le développement local
(phrase secrète : voir l'en-tête de `functions/__tests__/testServer.js` — jamais une vraie valeur).

<details>
<summary>Mise en place initiale (déjà faite en production — pour mémoire / nouvelle base)</summary>

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
→ **Settings** → **Environment variables** → `ADMIN_SECRET_HASH`.

**4. Redéployer, puis appliquer le schéma en production** :

```bash
npx wrangler d1 execute gds-licences --remote --file=migrations/0001_init.sql
```

(ou colle le contenu de `migrations/0001_init.sql` dans l'onglet **Console** de la base D1 sur le
dashboard).

</details>

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
