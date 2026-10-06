# LICENCES — fonctionnement, limites, support (Mission 14)

> Espace admin + licences par poste. Remplace à terme les clés en variable d'environnement de la
> Mission 06. Développé sur Cloudflare D1 (SQLite), pas Supabase (décision architecte du
> 07/07/2026 — voir `missions/MISSION-14.md` §CHANGEMENT D'ARCHITECTURE). Mise en place
> production : voir `README.md` §Administration.

## 1) Modèle

Deux tables (`migrations/0001_init.sql`) :

- **`licenses`** : une ligne par clé vendue. `key_hash` (jamais la clé en clair), `tier`
  (`individual` = 1 poste, `school` = 2 à 4 postes), `max_devices`, `client_name`, `status`
  (`active` / `revoked`).
- **`activations`** : une ligne par appareil ayant activé une licence. La contrainte
  `(license_id, device_fingerprint)` unique fait tout le travail : réactiver depuis le même
  appareil réutilise sa ligne (pas un nouveau poste consommé), et compter les postes utilisés,
  c'est juste compter les lignes.

Pas de RLS (Row-Level Security) : c'est une notion Postgres/Supabase qui n'a pas d'équivalent
direct sur D1 (SQLite pur). Son intention protectrice est préservée autrement : D1 n'est
accessible que depuis l'intérieur des Cloudflare Pages Functions (le binding `DB`), jamais
exposé à un SDK côté client — il n'y a donc pas de surface d'accès direct à restreindre.

## 2) Parcours client

- `POST /api/license/activate` — clé + empreinte appareil → crée l'activation si
  `devicesUsed < max_devices`, renvoie un jeton opaque stocké côté client. Réactiver depuis le
  même appareil est sans effet sur le compteur (idempotent). Palier atteint → message clair
  (« poste 2/2 déjà utilisés », pas un refus sec) avec l'incitation à contacter pour upgrade.
- `POST /api/license/check` — jeton → valide/invalide. Appelé au chargement ; tolère une brève
  coupure réseau (pas de blocage sur un timeout, l'appli continue avec le dernier état connu).
- Révoquer une licence depuis `/admin` invalide **tous** ses jetons dès le prochain `check` —
  pas de délai, pas de logique de signature/expiration séparée à raisonner : le statut en base
  est la seule source de vérité (voir le commentaire dans `migrations/0001_init.sql`).

## 3) Empreinte appareil — limites honnêtes

`apps/web/src/lib/deviceFingerprint.js` hache un ensemble de signaux navigateur (user agent,
résolution d'écran, fuseau horaire, langue, un canevas `<canvas>` léger). **Ce n'est pas une
barrière de sécurité** : un utilisateur motivé peut la contourner (navigation privée, un autre
navigateur, un profil neuf, un outil de "spoofing"). L'objectif est de rendre le partage d'une
clé entre plusieurs postes **gênant**, pas cryptographiquement impossible — cohérent avec le
public visé (étudiants, écoles), pas avec un système de paiement à protéger à tout prix.

## 4) Limite connue — condition de course sur l'activation

`POST /api/license/activate` lit le nombre d'activations existantes puis décide d'insérer — deux
requêtes strictement simultanées pour deux appareils différents pourraient, dans de très rares
cas, faire passer une licence à `devicesUsed = max_devices + 1` pendant un bref instant. À
l'échelle réelle du produit (quelques dizaines de clients, pas un service à fort trafic), le
risque est jugé négligeable et le pire cas est corrigeable en un clic depuis `/admin` (libérer un
poste). Documenté ici plutôt que masqué — pas d'over-engineering (verrous transactionnels D1)
pour un scénario à la fois improbable et sans conséquence grave.

## 5) Procédure de support — cas typiques

- **« Mon client a changé d'ordinateur »** : `/admin` → développer la licence concernée → repérer
  l'activation dont la date de dernière activité est ancienne → **Libérer ce poste**. Le slot est
  immédiatement disponible ; le client active son nouvel appareil normalement.
- **« Le client a atteint sa limite mais veut un poste de plus »** : pour une licence école,
  **Prolonger** (jusqu'à 4). Pour une licence individuelle, pas d'extension — vendre une seconde
  clé ou upgrader vers le palier école.
- **« Le client dit que ça ne marche plus »** : vérifier le statut dans `/admin` (`active` vs
  `révoquée`) avant toute autre piste — une révocation antérieure explique tout, immédiatement.
- **« Je me suis trompé, je veux annuler une révocation »** : **Réactiver** depuis `/admin` — les
  jetons déjà émis redeviennent valides sans que les appareils aient besoin de se réactiver.

## 6) État de la bascule (Étape 3, 27/07/2026)

- **Bascule production faite** : `AccessGate.jsx` appelle désormais `/api/license/activate` +
  `/api/license/check` (plus `functions/api/verify-key.js` / `ACCESS_KEY_HASHES`). 18 tests
  d'intégration (`functions/__tests__/license-api.test.js`), suite e2e principale et e2e admin
  toutes vertes contre un vrai `wrangler pages dev` + D1.
- **Migration des clés pilote** : rien à migrer — `scripts/migrate-keys-to-d1.mjs` existe et
  reste utilisable pour une future vague de clés, mais aucune clé pilote n'avait encore été
  générée/distribuée au moment de la bascule (Mission 07 Partie B jamais lancée, `keys/` ne
  contenait qu'un CSV vide).
- **Nettoyage final fait (06/10/2026)** : `functions/api/verify-key.js`, la variable
  `ACCESS_KEY_HASHES` et `scripts/generate-keys.mjs` ont été retirés une fois la bascule
  reconfirmée vivante en production (l'audit de reprise du 05/10/2026 avait confirmé qu'ils
  n'étaient plus appelés par aucun code — voir `AUDIT.md` et `TASKS.md`).
