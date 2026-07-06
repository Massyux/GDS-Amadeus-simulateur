# MISSION 06 — Accès par clé + habillage commercial v1 (Phase 3)

**Phase** : 3 · **Durée cible** : 1-2 sessions · **Pré-requis** : v1.0 en production (✅ 06/07/2026)

## Contexte

Produit vendu = bundle « Formation Amadeus + accès simulateur » (CLAUDE.md Phase 3). Il faut :
(1) que l'URL publique ne donne plus le terminal à n'importe qui, mais à ceux qui ont une clé ;
(2) une page d'accueil qui vend, en FR et EN (décision Massy 05/07). Pas de comptes/mots de
passe en v1 — des clés simples.

## Décisions à demander à Massy en début de session

- L'adresse e-mail/canal de contact à afficher pour « demander un accès » (WhatsApp/e-mail/TikTok ?)
- Le wording de la proposition de valeur s'il veut le personnaliser (sinon proposer un texte)

## Tâches

1. **Validation des clés côté serveur** via Cloudflare Pages Functions (gratuit, déjà hébergé) :
   - `functions/api/verify-key.js` : POST `{key}` → `{valid:true/false}`. Clés stockées en
     variables d'environnement Cloudflare (liste hachée SHA-256, jamais en clair dans le repo
     ni dans le bundle client). Documenter dans le README comment Massy ajoute/révoque une clé
     depuis le dashboard Cloudflare (il gère ça lui-même, sans toucher au code).
   - Anti-abus minimal : réponse identique clé absente/invalide, petit délai, pas de listing.
   - Fallback si Pages Functions bloque : validation client sur hachés SHA-256 (moins robuste,
     acceptable pilote) — documenter le choix dans CLAUDE.md.
2. **Écran d'accès** : après l'onboarding, saisie de clé (design cohérent terminal), mémorisée en
   `localStorage`, erreur sobre si invalide. Le terminal n'est jamais monté sans clé validée.
3. **Page d'accueil enrichie** (Onboarding.jsx) : proposition de valeur (pour étudiants/écoles de
   tourisme), à qui ça s'adresse, aperçu du terminal (rendu réel, pas une image), bouton
   « J'ai une clé d'accès », bouton « Demander un accès » (canal choisi par Massy), disclaimer
   conservé.
4. **FR/EN** : dictionnaire JSON léger (pas de lib i18n lourde), bascule FR/EN mémorisée,
   FR par défaut. Le terminal lui-même reste en anglais Amadeus (décision 05/07) — seule
   l'enveloppe est traduite.
5. **Outil de gestion des clés** : `scripts/generate-keys.mjs` (Node) : génère N clés lisibles
   (format `GDS-XXXX-XXXX`), sort les hachés à coller dans Cloudflare + un CSV clés en clair
   pour Massy (dans un dossier gitignored). Doc d'utilisation en 5 lignes.
6. **Tests** : unit (hachage/validation), Vitest UI (écran clé : valide, invalide, persistance,
   bascule langue), Playwright e2e (accueil → clé → terminal → séquence complète). La CI ne doit
   pas dépendre d'un secret réel (clé de test injectée).
7. Rituel de clôture (README missions §Règles) + mise à jour CLAUDE.md (Phase 3).

## Critères d'acceptation
- [ ] Sans clé : terminal inaccessible (y compris en appelant l'app directement)
- [ ] Avec clé valide : accès fluide, persistant après rechargement
- [ ] Aucune clé en clair dans le repo ni dans le bundle livré au navigateur
- [ ] Massy sait ajouter/révoquer une clé sans développeur (doc testée par lui)
- [ ] Accueil FR/EN propre, disclaimer intact, canal « demander un accès » fonctionnel
- [ ] Toutes suites + CI vertes, production vérifiée après déploiement
