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
- `functions/api/verify-key.js` : Cloudflare Pages Function, validation des clés d'accès

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
