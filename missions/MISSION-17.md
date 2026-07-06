# MISSION 17 — Utilitaires de l'agent

**Chaîne d'implémentation, maillon 3/7** · Détail : `docs/COMMANDES-MANQUANTES.md` §Priorité 2

## Question à Massy en début de session

Parcours sign-in pédagogique `JI`/`JO` : oui ou non ? (Si oui : l'étudiant doit se connecter
avant toute commande, comme en vrai — fort pédagogiquement, mais ajoute une friction. Décision
de Massy, puis implémentation ou report documenté.)

## Commandes (une par une, protocole de non-régression de MISSION-15 §Protocole)

1. `DD` — calculs de dates/jours/heures (`DD19JUL`, `DD15MAR/-35`, `DDPAR`) — pur calcul
2. `DF` — calculatrice (`DF20*30`, `DF50;40`) — pur calcul
3. `DC` — pays/nationalités (`DC FRANCE`, `DC GB`) — nouvelle table dans packages/data
4. `DNA` — compagnies (`DNA DELTA`, `DNA AF`, `DNA 057`) — table compagnies (2 lettres + n°)
5. `DNE` — appareils (`DNE AIRBUS`, `DNE 343`) — table appareils
6. `DB` — points d'embarquement d'une ville (`DB LON`) — depuis locations existantes
7. `DO` — détails de vol (`DO2` depuis le dernier AN, `DOAF2418/28NOV`) — étendre le provider
   dispo sim (escales, appareil, durée) de façon déterministe
8. `DM` — temps de connexion minimum (`DMFRA`) — petite table MCT
9. (si validé) `JI` / `JO` / états de session + comportement hors connexion

Données : toutes les tables vont dans `packages/data` (jamais en dur dans core), alimentées
de données réalistes cohérentes avec `locations.json` existant.

Clôture : 6 suites vertes + rituel + enchaîner sur MISSION-13 (statuts & liste d'attente).
