# PROJECT_MEMORY_SIMULATEUR_AMADEUS
Simulateur Amadeus GDS – Mémoire officielle (court + long terme)

> Objectif de ce document : permettre à n’importe quel assistant IA / développeur de reprendre le projet
> sans reposer de questions de base, et sans perdre les contraintes, la philosophie, ni l’architecture.

---

## 0) Identité du projet
- Projet : simulateur Amadeus (GDS) en JavaScript
- Forme : terminal (UI web) reproduisant le comportement “Command Page” Amadeus
- Mode : offline, déterministe, pédagogique et métier
- Priorité : fidélité GDS (séquences, erreurs, formats) > UX web moderne

---

## 1) Philosophie et vision
### 1.1 Objectif fondamental
Créer un simulateur Amadeus :
- pédagogique
- métier
- réaliste (95–100%)
- offline mais déterministe
- fidèle au comportement Amadeus, pas à une API moderne

Ce projet n’est PAS :
- un CRUD
- une démo UI
- un moteur de réservation web
- une abstraction “simplifiée”

### 1.2 Fidélité (règle d’or)
Le comportement doit respecter :
- séquence des commandes
- erreurs métier
- contraintes d’état
- formats d’affichage
- effets différés (ex: FXP crée TST mais pas billet)

Interdit :
- “on fait comme si”
- raccourcis logiques
- validations implicites
- auto-création de PNR
- UX web moderne (boutons/formulaires)

---

## 2) Mémoire long terme métier (règles établies)
### 2.1 Hypothèses utilisateur implicites
- utilisateur “GDS-aware”
- saisie texte
- accepte erreurs “cryptiques”
- sait qu’une commande peut échouer selon l’état

### 2.2 PNR (règles)
- Un PNR n’existe PAS tant que ER n’est pas fait
- Le PNR est “en mémoire” tant qu’il n’est pas validé
- ER exige obligatoirement :
  - ≥ 1 NM
  - ≥ 1 AP
  - ≥ 1 RF
- Record Locator généré uniquement à ER

### 2.3 TST / Pricing (règles)
- TST créé uniquement par :
  - FXP
  - FXB
- FXR / FXL / FXX ne créent PAS de TST
- Le TST :
  - est multi-pax
  - est numéroté / structuré par segments
  - est affiché dans RT
- Pricing offline déterministe :
  - prix stables
  - pas d’aléatoire non contrôlé
  - règles tarifaires internes
  - taxes simulées mais réalistes
- FXP ≠ FXB ≠ FXR ≠ FXL ≠ FXX (effets différents)

### 2.4 Conventions de commandes
- case-insensitive
- parsing strict
- format Amadeus exact
- aucune sortie JSON côté utilisateur

Exemples :
- AN15DECALGPAR
- AN15DECALGPAR/AF
- NM1DUPONT/JEAN MR
- RFMM (sans +)
- FXP / FXB / FXR / FXL / FXX
- RT

---

## 3) Architecture (invariants)
### 3.1 Fonction centrale
- `processCommand(input, state, options) -> { events, state }`

### 3.2 Events = seule source d’affichage
- `events` contient uniquement :
  - `{ type: "print", text: "..." }`
  - `{ type: "error", text: "..." }`
Interdit :
- console.log métier
- DOM direct pour la logique métier
- mutation UI en dehors de l’events flow

### 3.3 Découplage strict
- `packages/core` : logique métier pure
- `apps/web` : UI React / rendu terminal
- pas de dépendance inverse (UI -> core uniquement)

---

## 4) State (structure officielle)
### 4.1 State global (modèle attendu)
state = {
  activePNR: PNR | null,
  lastAN: Availability | null,
  tst/tsts: TST[] | null
}

### 4.2 activePNR (structure attendue)
activePNR = {
  passengers: [],
  itinerary: [],
  contacts: [],
  rf: string | null,
  recordLocator: string | null,
  status: "ACTIVE" | "RECORDED"
}

### 4.3 États possibles
- Pas de PNR
- PNR actif non validé
- PNR enregistré (après ER)

---

## 5) Commandes implémentées / support
- HELP / HE
- JD
- AN (offline déterministe)
- NM (MR/MRS + ADT/CHD/INF)
- AP
- RF (format RFMM sans +)
- ER
- RT

Pricing / TST :
- FXP : garde RBD, crée TST
- FXB : rebook + TST
- FXR : reprice low fare sans TST
- FXL : low fare info only (erreur si indisponible)
- FXX : devis sans TST

---

## 6) Scénarios métier de référence (tests / régression)
### Happy Path
AN → SS → NM → AP → RF → FXP → ER → RT

### Séquences invalides (exemples)
- ER sans RF → erreur
- FXP sans itinéraire → erreur
- FXB après ER → erreur
- RT sans PNR → erreur

---

## 7) Contraintes non négociables
- style Amadeus strict
- terminal textuel
- core sans UI
- events only
- tests obligatoires
- aucune magie cachée
- aucune mutation silencieuse

---

## 8) Décisions récentes “structure de travail”
### 8.1 Architecture future recommandée (handlers)
- registry de commandes
- 1 handler = 1 commande
- chaque handler :
  - parse
  - validate
  - retourne `{ nextState, events }`
- tests “scénarios / golden” privilégiés (pas de unit tests inutiles)

### 8.2 Méthode officielle
Spec → Handler → Tests → Intégration → UX ensuite  
Interdit :
- coder sans spec
- UX avant métier
- corriger sans test

---

## 9) Mémoire court terme (session récente)
- Problème VS Code : crash après upgrade (résolu via réinstallation propre + stabilisation)
- Expérimentations cursor/scroll : plusieurs essais (Patch 1/2/3 évoqués)
- Décision : ne pas perdre le travail, tout a été sauvegardé via Git (commit/branche WIP).
- Objectif UX visé : Selling Platform-like (ligne active stable) mais pas finalisé.
- Si besoin : revert complet des expérimentations cursor/scroll et reprise incrémentale.

---

## 10) Objectif immédiat (prochaine étape recommandée)
1) Stabiliser une base UI terminal simple (sans anomalies)
2) Définir clairement l’UX “Selling Platform-like” visée (ligne active stable, historique consultable)
3) Implémenter 1 amélioration à la fois (et valider visuellement) :
   - caret fidèle
   - scroll stable
   - mode live/history
4) Ajouter/renforcer les tests scénarios pour éviter les régressions

---

## 11) Prompt de reprise (à coller dans une nouvelle conversation)
COLLER CECI DANS LA NOUVELLE CONVERSATION :

Je reprends un projet “Simulateur Amadeus GDS” (terminal Selling Platform-like).
Le projet est offline et déterministe, orienté formation métier, et doit être fidèle aux règles Amadeus (séquences, erreurs, formats).
Architecture:
- Core pur : processCommand -> { events, state }
- UI React : affichage uniquement via events (print/error)
Contraintes non négociables:
- Pas de logique métier dans l’UI
- Pas de raccourcis “web”
- Parsing strict, Amadeus-like
- Tests scénarios (golden) obligatoires
Objectif actuel:
- Stabiliser l’UI (cursor/scroll) puis reprendre incrémentalement.
Réponds en respectant strictement ce document.

