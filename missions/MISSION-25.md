# MISSION 25 — Assistant IA pédagogique

*(anciennement « mission 10 » de la roadmap initiale — renumérotée à la demande de Massy le
06/10/2026)*

**Pré-requis** : MISSION-24 close. **Durée : 2-3 sessions.**
C'est le différenciateur commercial : aucun simulateur concurrent ne l'a.

## Règle fondatrice, non négociable

**L'assistant explique, il ne résout jamais.** Un étudiant bloqué sur l'exercice 6 doit
ressortir en comprenant *pourquoi* `SB` refuse son segment, pas avec la commande à recopier.
Cette règle est à écrire dans le prompt système ET à vérifier par des tests : poser à
l'assistant une question du type « donne-moi la réponse de l'exercice 4 » doit produire un
refus utile (une piste, une question en retour), pas la solution.

Corollaire : quand l'étudiant est en mode exercice, l'assistant connaît l'énoncé et son état,
mais **pas la solution attendue** — ne pas lui envoyer les objectifs de correction.

## Fonctionnalités

1. **Chat contextuel** dans le terminal et dans les leçons. Il reçoit : la dernière commande
   tapée, le message d'erreur reçu, la leçon ou l'exercice en cours. Il répond en FR ou EN
   selon la langue de l'interface.
2. **Explication au survol** d'un code à l'écran (code ville, compagnie, classe, statut de
   segment, taxe, code d'erreur) — une infobulle après ~2 s. Beaucoup de ces explications
   existent déjà en données (`packages/data`, `docs/ERREURS-AMADEUS.md`) : **servir d'abord
   la donnée locale, n'appeler l'IA que pour ce qui n'est pas déjà connu.** C'est plus
   rapide, gratuit et plus fiable.
3. **Aide à la correction de syntaxe** : « tu as écrit `NM1DUPONT JEAN`, Amadeus attend un
   `/` entre le nom et le prénom » — sans donner la ligne complète.

## Technique et coût

Première fonctionnalité du projet à avoir un **coût marginal réel**. À traiter comme telle :

- Appel IA **uniquement côté serveur** (Pages Function), clé en variable d'environnement,
  jamais dans le navigateur.
- **Limitation par compte** (nombre de messages par jour), configurable depuis `/admin`,
  avec un message clair quand la limite est atteinte.
- Choisir le fournisseur avec Massy en début de session (Workers AI de Cloudflare, déjà dans
  son compte, ou une API externe) — comparer coût réel par étudiant et qualité en français.
- Journaliser le volume d'usage pour que Massy voie ce que ça lui coûte par étudiant.
- Dégradation propre : si l'IA est indisponible ou le quota épuisé, l'infobulle locale et le
  simulateur continuent de fonctionner normalement.

## Critères d'acceptation
- [ ] L'assistant refuse de donner une solution d'exercice, testé explicitement
- [ ] Les infobulles connues sont servies sans appel IA
- [ ] Quota par compte appliqué et visible ; coût mesurable dans `/admin`
- [ ] Panne IA = produit toujours utilisable
- [ ] Suites + CI vertes, production vérifiée, rituel de clôture
