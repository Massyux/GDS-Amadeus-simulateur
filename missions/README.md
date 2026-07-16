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
| 07 | Lancement pilote + traitement des retours | Phase 4 | **détaillée, PROCHAINE ÉTAPE** (chaîne d'implémentation close le 07/07/2026) |
| 14 | **Espace admin + licences par poste** (paliers 1 / 2-4 postes, Supabase) — après le pilote, avant la vente large | Phase 8 anticipée | détaillée |
| 08 | Moteur d'exercices guidés (spec → moteur → contenu) | Phase 6 | esquisse |
| 09 | Quiz, notation, progression | Phase 6 | esquisse |
| 10 | Assistant IA pédagogique intégré | Phase 7 | esquisse |
| 11 | Site de vente + licences par poste | Phase 8 | esquisse |
| 12 | Mode « données réelles » AN/SN via API Amadeus (provider + proxy serverless) | v1.x | esquisse |
| 13 | Liste d'attente réaliste HL/UC/KK/KL + ETK/ERK (confirmé Massy, mission 03) | v1.x | esquisse |
| 15 | Servicing du PNR actif : SS long sell, SB, modif par n°, NU, DL, SI ARNK, TKOK/TKXL + corrections fidélité ET & VOID→TWD/TWX | v1.x | fait (06/07/2026) |
| 16 | Navigation & affichages : MD/MU/MT/MB, MN/MY, AC/ACR, RT partiels, RE | v1.x | voir docs/COMMANDES-MANQUANTES.md |
| 17 | Utilitaires agent : DC/DNA/DNE/DB, DD/DF, DO, DM (+ JI/JO à valider) | v1.x | voir docs/COMMANDES-MANQUANTES.md |
| 18 | Sièges : SM / ST / SX | v1.x | voir docs/COMMANDES-MANQUANTES.md |
| 19 | PNR enregistrés & multi-PNR : RT locator/nom, SP/EF/RTAXR, RRN/RRI/RRP, RH | v1.x | voir docs/COMMANDES-MANQUANTES.md |
| 20 | Tarifs & billetterie complets : FQD/FQP, famille TST, TTP options, TWD/TWX, TRF | v2 | voir docs/COMMANDES-MANQUANTES.md |

**Ordre imposé** : 01 → 02 → 03 → 04. La mission 05 peut s'intercaler dès que Massy est
disponible. Les missions 06+ ne démarrent pas avant que 01-04 soient closes (règle CLAUDE.md :
jamais démarrer une phase avant que la précédente soit testée et mergée).

## CHAÎNE D'IMPLÉMENTATION (décision Massy 06/07/2026 — EN COURS)

Implémenter TOUTES les commandes manquantes AVANT le pilote. Ordre strict :

**15 → 16 → 17 → 13 → 18 → 19 → 20** — puis retour à 07 (pilote).

**ALLÈGEMENT (triage Massy + architecte, 07/07/2026)** — chaîne réduite à l'essentiel :
16 se termine par `RE` seul (RT partiels reportés) ; 17 = **DC + DNA + DD uniquement**
(DO/DF/DNE/DB/DM et JI/JO reportés) ; 13 inchangée ; **18 (sièges SM/ST/SX) entièrement
reportée en v2 (décision Massy 07/07)** ; 19 = **magasin PNR + RT locator/nom uniquement**
(RH, SP/EF/RTAXR, RRN/RRI/RRP reportés) ; **20 entièrement reportée en v2**.
Chaîne finale : fin 16 (RE) → 17 réduite → 13 → 19 réduite → mission 07 (pilote).
Tout ce qui est reporté reste documenté dans docs/COMMANDES-MANQUANTES.md et les fichiers
missions.

Règles de la chaîne (s'ajoutent aux règles générales ci-dessus) :

1. **Enchaînement sans arrêt** : quand une mission est close (rituel exécuté, tout vert),
   ouvrir IMMÉDIATEMENT la suivante dans la même session. Ne s'arrêter que si la limite de
   session approche : alors clore proprement et écrire dans `TASKS.md` la ligne de reprise
   exacte (« Chaîne : reprendre MISSION-XX, étape N »). La session suivante lit `TASKS.md`
   et repart de là sans requestion.
2. **Non-régression après CHAQUE commande** (pas après chaque mission) : suite core +
   typecheck + lint verts avant de passer à la commande suivante ; grille CONSTITUTION §2
   ajoutée à `AUDIT-COMMANDES.md` ; un commit par commande, push (CI = 2e filet).
3. **Fin de chaque mission** : les 6 suites + e2e + vérification production, rituel de clôture.
4. Toute découverte hors périmètre → `TASKS.md` Backlog, on ne dévie pas de la chaîne.
5. Les questions à Massy listées en tête de mission (17 : JI/JO ; 13 : règle waitlist ;
   19 : persistance) se posent en début de mission concernée, pas avant.

Les missions marquées "esquisse" sont volontairement non détaillées : l'architecte les détaillera
au moment venu, sur la base de l'état réel du projet (éviter les specs spéculatives qui divergent).

## Jalon v1.0 commercialisable

La v1.0 est atteinte quand : missions 01-05 closes, zéro bug critique ou incohérence
fonctionnelle ouverte dans `TASKS.md`, CI verte, et réponse « oui » à la question finale de la
constitution (§9) sur l'ensemble du simulateur.
