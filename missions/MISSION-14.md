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
