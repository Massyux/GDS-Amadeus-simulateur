# Missions — plan d'exécution jusqu'à la fin du projet

> **Mode d'emploi (Massy)** : ouvre Claude Code dans ce dossier et colle simplement :
> `Lis missions/README.md puis exécute la mission missions/MISSION-XX.md. Applique strictement CONSTITUTION.md.`
> Une mission = une session. Ne jamais lancer deux missions en parallèle.
>
> **Rôles** : l'architecte (Claude Cowork) rédige et audite les missions ; Claude Code les exécute
> dans l'environnement Windows réel ; Massy décide. La roadmap produit de référence reste celle de
> `CLAUDE.md` — ce fichier est sa déclinaison exécutable, mission par mission.

## Règles d'exécution (toutes missions)

1. Lire la mission en entier avant de commencer. Ne PAS élargir le périmètre (CONSTITUTION §6).
2. Toute observation hors périmètre → la noter dans `TASKS.md` section "Backlog", ne pas la traiter.
3. Rituel de clôture obligatoire : toutes les suites vertes (`npm run test`, `test:data`,
   `test:web`, `test:e2e`, `lint`, typecheck core) → mise à jour `TASKS.md` + `CLAUDE.md`
   (statut) + `PROJECT_MEMORY` si une règle métier a changé → commit(s) clairs → `git push`.
4. Si un critère d'acceptation ne peut pas être atteint : s'arrêter, documenter le blocage dans
   `TASKS.md`, terminer proprement la session. Pas de contournement silencieux.

## Séquence des missions

| # | Mission | Phase (CLAUDE.md) | Statut |
|---|---------|-------------------|--------|
| 01 | Hygiène & remise à plat du dépôt | reliquats Phases 0/0.5 | fait (05/07/2026) |
| 02 | Audit métier commande par commande (grille constitution) | pré-requis Phase 5 | fait (05/07/2026) |
| 03 | Messages d'erreur fidèles Amadeus (suite de l'Étape 1 committée) | Phase 5 | fait (05/07/2026) |
| 04 | Fidélité visuelle du terminal (trade dress à la main) | Phase 5 | fait (05/07/2026) |
| 05 | Déploiement public — **avec Massy** (son compte hébergeur) | Phase 2 (fin) | fait (06/07/2026) |
| 06 | Accès v1 par clé/lien privé (offre commerciale) | Phase 3 | fait (06/07/2026) |
| 07 | Lancement pilote + traitement des retours | Phase 4 | esquisse |
| 08 | Moteur d'exercices guidés (spec → moteur → contenu) | Phase 6 | esquisse |
| 09 | Quiz, notation, progression | Phase 6 | esquisse |
| 10 | Assistant IA pédagogique intégré | Phase 7 | esquisse |
| 11 | Site de vente + licences par poste | Phase 8 | esquisse |
| 12 | Mode « données réelles » AN/SN via API Amadeus (provider + proxy serverless) | v1.x | esquisse |
| 13 | Liste d'attente réaliste (HL/UC au lieu de refus sur NO SEATS — confirmé Massy, mission 03) | v1.x | esquisse |

**Ordre imposé** : 01 → 02 → 03 → 04. La mission 05 peut s'intercaler dès que Massy est
disponible. Les missions 06+ ne démarrent pas avant que 01-04 soient closes (règle CLAUDE.md :
jamais démarrer une phase avant que la précédente soit testée et mergée).

Les missions marquées "esquisse" sont volontairement non détaillées : l'architecte les détaillera
au moment venu, sur la base de l'état réel du projet (éviter les specs spéculatives qui divergent).

## Jalon v1.0 commercialisable

La v1.0 est atteinte quand : missions 01-05 closes, zéro bug critique ou incohérence
fonctionnelle ouverte dans `TASKS.md`, CI verte, et réponse « oui » à la question finale de la
constitution (§9) sur l'ensemble du simulateur.
