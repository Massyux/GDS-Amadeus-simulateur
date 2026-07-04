# Comparaison Amadeus réel vs simulateur — niveau 1-2 (préparation Phase 5)

> À déposer à la racine du repo, à côté de `CLAUDE.md`. Document de référence pour la Phase 5
> ("fidélité ~99%"). Ne pas commencer les tâches ci-dessous avant que la Phase 1 soit stable
> (déjà le cas au 04/07/2026).

## Méthode et niveau de confiance

**Côté simulateur** : audit exact fourni par Claude Code le 04/07/2026 — `packages/core/src/index.js`,
mécanisme centralisé `error()` (ligne 1836) déclenché via `ERROR_EVENT_TEXTS` (lignes 1804-1834,
29 chaînes), dispatcher `processCommand` (ligne 1796). Fiable à 100%, source = le code lui-même.

**Côté Amadeus réel** : je n'ai pas d'accès direct au vrai logiciel (réservé aux clients Amadeus
avec identifiants). Cette comparaison s'appuie sur la documentation publique Amadeus Service Hub,
des guides de référence cryptic entries, et du matériel de formation trouvés en ligne (04/07/2026).
**Massy a une expérience professionnelle réelle du logiciel (tourisme depuis 2019, ex-directeur
technique) — tout point ci-dessous doit être vérifié/corrigé par lui en priorité si son expérience
terrain contredit la doc.** Les points less sûrs sont marqués ⚠️.

---

## 1) Messages d'erreur — simulateur vs réel

| Message simulateur | Commande(s) | Équivalent réel Amadeus (doc publique) | Écart |
|---|---|---|---|
| `INVALID FORMAT` (générique) | fallback + AN, TN, SN, DAC, DAN, IR, QP-QS, SS, NM, SSR, OSI, RF, OP, RM, TKTL, FP, APE, VOID, ITR-EML, TQT, FQN, XI | Le vrai Amadeus distingue plusieurs messages selon le cas : `CHECK FORMAT` (erreur de syntaxe générique la plus courante), `NOT IN TABLE` (code inconnu, ex. ville/compagnie), `CHECK DATE`, `CHECK CITY CODE`, `CHECK FLIGHT NUMBER`, `CHECK ACTION CODE`, `CHECK CLASS OF SERVICE`, `NO ENTRY` | ⚠️ Écart réel : un seul message générique côté simulateur remplace ~7 messages spécifiques côté réel. C'est la différence la plus visible et la plus simple à corrigify en premier (impact fidélité élevé, effort modéré) |
| `NO ACTIVE PNR` | ER, RT, XI | Le vrai Amadeus répond souvent `NO PNR` ou redirige simplement vers un écran vide selon le contexte | Proche, formulation à vérifier avec l'expérience terrain de Massy |
| `END PNR FIRST` | ER sans NM/AP/RF | Cas réel documenté : le système exige les éléments obligatoires avant `ER`/`ET`, message habituel plus proche de `FORMAT INVALID/NOT ENTERED` ou un rappel d'élément manquant explicite (ex. absence de RF) | ⚠️ à affiner : le vrai Amadeus a tendance à dire précisément QUEL élément manque plutôt qu'un message générique |
| — (n'existe pas côté simulateur) | — | `SIMULTANEOUS CHANGES TO PNR - USE WRA/RT TO PRINT OR IGNORE`, `RESTRICTED ENTRY - PNR RETRIEVED IN READ MODE`, `NEED PASSENGER/SEGMENT ASSOCIATION`, `NEED TICKETING ARRANGEMENT` | Messages réels absents du simulateur — hors scope niveau 1-2 pour la plupart (concurrence multi-agent, associations avancées), **à ne pas ajouter maintenant** |
| `NO TST`, `NO ITINERARY`, `NO TICKET`, `TICKET ALREADY ISSUED` | FXP/FXX/FXR/FXB/ET/TTP/VOID/ITR-EML | Formulation généralement proche du réel (`NEED TICKETING ARRANGEMENT` pour le cas FP manquant, `UNABLE TO PROCESS` en cas général) | Correct dans l'esprit, formulation exacte à confirmer |

**Recommandation prioritaire** : remplacer le fourre-tout `INVALID FORMAT` par les messages spécifiques
`CHECK FORMAT`, `NOT IN TABLE`, `CHECK DATE`, `CHECK CITY CODE`, `CHECK FLIGHT NUMBER`,
`CHECK CLASS OF SERVICE` selon le contexte exact de l'erreur. C'est le changement qui rapproche le
plus l'expérience du vrai logiciel, pour un effort limité (la logique de détection existe déjà,
il s'agit de différencier le texte retourné selon la cause).

---

## 2) Format d'affichage — AN (disponibilité)

**Réel (doc publique)** : en-tête système type `** AMADEUS - AN **`, puis ville/aéroport destination
avec code pays, jour/date, et des lignes avec : numéro de ligne, compagnie, numéro de vol, classes
de service (jusqu'à 26 lettres) chacune suivie d'un statut : `1`-`8` (nombre de sièges exact),
`9` (9 sièges ou plus), `0` (liste d'attente ouverte, leg), `L` (liste d'attente, segment),
`R` (sur demande uniquement).

**Simulateur** : le code (`Terminal.jsx`) détecte l'en-tête AN via `outputLines[0]?.startsWith("AN")`
et `outputLines[1]?.includes("AVAILABILITY")` — à vérifier si le texte exact de l'en-tête et les
codes de statut de sièges (1-8/9/0/L/R) sont bien reproduits dans `packages/core` (je n'ai pas pu
confirmer le texte exact de `packages/core/src/index.js` à cause d'un souci de cache GitHub de mon
côté — à vérifier directement dans le fichier).

**Action recommandée** : comparer précisément le texte d'en-tête et les codes de statut de sièges
générés par `providers/availability/sim.js` avec le format réel ci-dessus.

---

## 3) Logique de travail — nuances à vérifier

- **RF après ER** : dans le vrai Amadeus, l'élément "Received From" disparaît de l'affichage PNR
  actif une fois la transaction terminée (`ER`/`ET`) et bascule dans l'historique (visible via `RH`).
  ⚠️ À vérifier : le simulateur affiche-t-il encore `RF` en permanence dans `RT` après `ER`, ou
  reproduit-il ce comportement de bascule vers l'historique ?
- **Historique PNR (`RH`)** : commande réelle documentée, absente de la liste niveau 1-2 actuelle
  du simulateur. Pertinente pour la fidélité mais peut rester hors scope niveau 1-2 selon le
  périmètre que Massy veut figer.
- **PNR en lecture seule / changements simultanés** : concept multi-agent réel (`RESTRICTED ENTRY -
  PNR RETRIEVED IN READ MODE`) — hors scope niveau 1-2 (suppose plusieurs postes), à ignorer pour
  l'instant.

---

## 4) Fonctionnalités présentes côté réel mais absentes du simulateur (dans la limite niveau 1-2)

- `RH` — historique du PNR (mentionné ci-dessus)
- Distinction plus fine entre `SN` (schedule) et `TN` (timetable) déjà partiellement couverte —
  à vérifier que les deux affichages ont des formats bien distincts comme dans le réel
- Messages d'erreur différenciés (section 1) — le plus gros écart identifié

## 5) Ce qui est déjà fidèle (à ne pas toucher)

- Séquence PNR (pas de PNR avant `ER`, `ER` exige NM+AP+RF) — conforme à la philosophie réelle
- `TST` créé uniquement par `FXP`/`FXB`, jamais par `FXR`/`FXL`/`FXX` — conforme
- Architecture events-only (`print`/`error`), aucune UX web moderne — déjà la bonne approche pour
  la fidélité, à préserver strictement pendant les corrections ci-dessous

---

## Roadmap pour Claude Code — combler les écarts (Phase 5, sous-étapes)

Règles impératives pour chaque tâche ci-dessous (reprises de `CLAUDE.md`, à respecter strictement) :
- Une tâche à la fois
- Ne modifier QUE les fichiers listés pour cette tâche précise — aucun fichier hors périmètre
- Ne pas toucher à l'architecture (`processCommand -> {events, state}`, séparation core/UI,
  mécanisme `error()`/`ERROR_EVENT_TEXTS` existant) — on modifie le contenu des messages, pas le
  mécanisme qui les déclenche
- Chaque changement doit avoir un test golden qui le couvre AVANT d'être considéré fini
- Merger immédiatement après validation, ne pas laisser de branche ouverte

**Étape 1 — Différencier les messages de format génériques** ✅ fait le 04/07/2026
- Fichier modifié : `packages/core/src/index.js` uniquement, comme prévu.
- `ERROR_EVENT_TEXTS` : `INVALID FORMAT` retiré (plus aucun call site ne l'émet), remplacé par
  `CHECK FORMAT`, `CHECK DATE`, `CHECK CLASS OF SERVICE`, `NOT IN TABLE`.
- Mapping appliqué (cause déjà présente dans le code, aucune nouvelle logique de détection) :
  - `CHECK FORMAT` : tout mismatch de regex/forme pur (générique, remplace ~90% des anciens sites,
    y compris le fallback final de commande inconnue) — le plus gros volume, comme prévu par le doc.
  - `CHECK DATE` : partout où la forme date matchait syntaxiquement mais `parseDDMMM` retourne
    `null` (date calendaire invalide, ex. 31FEB) — AN, TN, SN (split du check combiné
    `!dateObj||!from||!to` en deux checks distincts `!m`/`!dateObj`, comportement identique, juste
    le texte différencié), OP, TKTL.
  - `CHECK CLASS OF SERVICE` : SS quand la classe demandée n'existe pas sur le vol (`!cls`).
  - `NOT IN TABLE` : SS quand le numéro de ligne ne correspond à aucun résultat du dernier AN
    (`!item`) — lecture délibérée du terme au sens large ("pas dans la table de résultats
    affichée"), à faire valider par Massy si son expérience terrain dit autre chose.
  - `CHECK CITY CODE` et `CHECK FLIGHT NUMBER` : **non utilisés**. Aucun site dans
    `packages/core/src/index.js` seul ne permet de distinguer ces causes sans ajouter une nouvelle
    logique de détection (AN/TN/SN valident date+ville dans une seule regex combinée ; les vols
    viennent du provider, pas d'une saisie utilisateur validée séparément). Pas fabriqué de
    justification artificielle — à revisiter si `packages/core/src/providers/availability/sim.js`
    évolue en Étape 2.
- **Découverte annexe (hors scope de cette étape, non traitée)** : `packages/data`'s `cmdDAC`/
  `cmdDAN` retournent toujours un tableau, y compris `["NO MATCH"]` en cas de code/ville non
  trouvé — ce texte "NO MATCH" n'est pas dans `ERROR_EVENT_TEXTS` donc s'affiche comme un `print`
  normal, pas un `error`. C'est probablement le vrai équivalent de `NOT IN TABLE` pour DAC/DAN,
  mais corriger ça toucherait `packages/data` (hors périmètre "index.js uniquement" de cette
  étape) — signalé pour une tâche future, pas corrigé ici.
- Tests : 18 assertions existantes mises à jour (`processCommand.test.js` + `e2e.golden.test.js`)
  pour matcher le nouveau texte exact ; 2 tests golden ajoutés pour les deux branches SS qui
  n'avaient jamais été testées auparavant (`NOT IN TABLE`, `CHECK CLASS OF SERVICE`). Suite
  complète au vert : 122 `packages/core` + 2 `packages/data` + 8 `apps/web` Vitest + 8 Playwright
  e2e, lint et `typecheck` propres.

**Étape 2 — Vérifier et corriger le format d'en-tête et les codes de statut AN**
- Fichier(s) concerné(s) : `packages/core/src/providers/availability/sim.js` (et le point de
  détection d'en-tête dans `apps/web/src/Terminal.jsx` si le texte d'en-tête change)
- Confirmer le texte exact de l'en-tête et les codes de statut de sièges (1-8/9/0/L/R) contre la
  référence Amadeus ci-dessus, corriger si besoin
- Tests golden sur le format d'affichage AN à mettre à jour en conséquence

**Étape 3 — RF et bascule vers l'historique après ER**
- Fichier(s) concerné(s) : `packages/core/src/index.js` (logique ER + affichage RT)
- Décider si on reproduit la bascule RF → historique (nécessite une notion d'historique, potentiellement
  hors scope niveau 1-2) — **décision à prendre avec Massy avant de coder**, pas une tâche à lancer
  sans validation explicite

**Étape 4 (optionnelle, à valider avec Massy avant de lancer)** — Ajouter `RH` (historique PNR)
si le périmètre niveau 1-2 est étendu pour l'inclure. Sinon, laisser hors scope.

Ordre recommandé : Étape 1 (impact le plus visible, effort le plus faible) → Étape 2 → discussion
Étape 3/4 avant de coder quoi que ce soit dessus.
