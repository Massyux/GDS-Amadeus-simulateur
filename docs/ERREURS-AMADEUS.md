# ERREURS-AMADEUS — Inventaire des messages d'erreur (Mission 03)

> Inventaire exhaustif de tous les messages d'erreur émis par `packages/core/src/index.js`
> (ensemble `ERROR_EVENT_TEXTS`, 30 chaînes). Pour chaque message : commande(s), situation,
> message actuel, message Amadeus authentique proposé, statut.

## Méthode et niveau de confiance

Je n'ai pas d'accès direct au vrai logiciel Amadeus Selling Platform (réservé aux clients avec
identifiants). Comme documenté dans `FIDELITE_AMADEUS_COMPARAISON.md`, 4 messages avaient déjà été
recherchés et confirmés lors de la Phase 5 Étape 1 (04/07/2026) contre la documentation publique
Amadeus Service Hub / guides cryptic entries : `CHECK FORMAT`, `CHECK DATE`,
`CHECK CLASS OF SERVICE`, `NOT IN TABLE`. Je les garde **conformes**.

Pour tous les autres messages, je n'ai pas de source vérifiée équivalente au départ. Ce sont des
chaînes en anglais plausible inventées au fil des sessions précédentes (simulateur), jamais
confrontées à une vraie documentation Amadeus. Conformément à la règle stricte du projet
(« ne jamais inventer un message plausible sans le marquer »), je les ai toutes marquées
« à vérifier », proposant une alternative quand j'en avais une (hypothèse, pas une certitude), et
je les ai soumises à Massy (lui seul a une vraie expérience terrain du logiciel). Décisions prises
le 05/07/2026 : voir « Récapitulatif des décisions » en fin de document. Au final : 7 messages
conformes/confirmés, 1 hors périmètre (technique interne), 1 point business confirmé mais
volontairement non traité dans cette mission (NO SEATS/NOT ENOUGH SEATS), 21 encore « à vérifier »
sans urgence particulière.

**Statuts utilisés** : ✅ conforme (recherché et confirmé) · 🟡 à vérifier (proposition donnée,
non appliquée) · ⬜ hors périmètre fidélité (message technique interne, pas un message Amadeus)

---

## Table complète

| Message actuel | Commande(s) | Situation | Message Amadeus proposé | Statut |
|---|---|---|---|---|
| `CHECK FORMAT` | AN, TN, SN, DAC, DAN, IR, QP-QS, SS, NM, SSR, OSI, RF, OP, RM, TKTL, FP, APE, VOID, ITR-EML, TQT, FQN, XI (variante non supportée), fallback générique | Erreur de syntaxe générale sur l'entrée | *(déjà conforme)* | ✅ |
| `CHECK DATE` | AN, TN, SN, OP, TKTL | Date syntaxiquement plausible mais invalide (ex. 30FEB) | *(déjà conforme)* | ✅ |
| `CHECK CLASS OF SERVICE` | SS | Classe demandée non proposée sur le vol | *(déjà conforme)* | ✅ |
| `NOT IN TABLE` | SS (ligne AN inexistante), AN/TN/SN (code ville inconnu, depuis Mission 03 DATA-1) | Référence numérique/code absente de la table consultée | *(déjà conforme)* | ✅ |
| `NO ACTIVE PNR` | ER (direct), RT/XI (indirect via l'affichage PNR vide) | Commande PNR sans PNR en cours | à vérifier — possible `NO PNR` (plus court, plus proche du style cryptique habituel) | 🟡 |
| `NO ITINERARY` | FXP, FXX, FXR, FXB, ET/TTP | Tarification/billetterie sans segment actif | à vérifier — possible `ITINERARY/SEGMENT MISSING` ou variante | 🟡 |
| `NO AVAILABILITY` | SS sans AN préalable | Vente tentée sans affichage de disponibilité en mémoire | à vérifier | 🟡 |
| `NO SEATS` | SS (classe à 0 siège) | Vente refusée, classe pleine | **Confirmé par Massy (05/07) : le vrai Amadeus met en liste d'attente (HL/UC) au lieu de refuser.** Le message lui-même n'est pas le problème — c'est le comportement business (refus pur au lieu de vente en liste d'attente) qui doit changer. Voir section dédiée ci-dessous, mission séparée | 🟡 (business, pas wording) |
| `NOT ENOUGH SEATS` | SS (pax demandés > sièges dispo) | Vente partielle impossible | Même remarque que NO SEATS — confirmé, business à revoir (liste d'attente), pas seulement le libellé | 🟡 (business, pas wording) |
| `PNR NOT FOUND` | IR (avec localisateur fourni), QN | Localisateur donné ne correspond à rien | à vérifier — possible `RECORD LOCATOR NOT FOUND` | 🟡 |
| `END PNR FIRST` | ER (NM/AP/RF manquant) | ER tenté avant les éléments obligatoires | **Décision de Massy (05/07) : garder un message générique unique pour l'instant.** Ne pas distinguer nom/contact/RF manquant dans cette session — revisiter seulement si Massy le redemande explicitement | ✅ (décision prise, statu quo assumé) |
| `ELEMENT NOT FOUND` | XE (index hors bornes) | Numéro d'élément RT inexistant | à vérifier | 🟡 |
| `NOT ALLOWED` | XE (élément non annulable / dernier élément protégé) | Annulation refusée, cas générique | à vérifier | 🟡 |
| `NOT ALLOWED - TST PRESENT` | XE (annulation PAX lié à un TST) | Annulation refusée, nom lié à une tarification | à vérifier | 🟡 |
| `NOT ALLOWED - TST SEGMENT` | XE (annulation segment lié à un TST) | Annulation refusée, segment lié à une tarification | à vérifier | 🟡 |
| `NOT ALLOWED - LAST SEGMENT` | XE (dernier segment actif) | Annulation refusée, dernier segment du PNR | à vérifier | 🟡 |
| `NOT ALLOWED - LAST ADT` | XE (dernier passager adulte) | Annulation refusée, dernier ADT | à vérifier | 🟡 |
| `NOT ALLOWED - INF ASSOCIATED` | XE (ADT associé à un INF) | Annulation refusée, ADT porteur d'un INF | à vérifier | 🟡 |
| `NOTHING TO CANCEL` | XE, VOID (billet déjà void, Mission 02) | Rien à annuler dans la sélection | **Confirmé par Massy (05/07) : garder tel quel.** | ✅ (confirmé) |
| `FUNCTION NOT APPLICABLE` | FXL (avec `/`) | Variante de commande non supportée | à vérifier, confiance modérée que ce soit authentique (formulation Amadeus-like courante) | 🟡 |
| `NO TST` | FXX, FXL, TQT, FQN, ET/TTP | Commande TST sans TST existant | à vérifier | 🟡 |
| `NO NAME` | FXP, FXB uniquement (FXR et FXL n'exigent pas de NM) | Tarification tentée sans NM dans le PNR | **Confirmé par Massy (05/07) : FXP et FXB exigent bien un nom ; FXR ne l'exige pas.** Corrigé dans cette mission — le contrôle a été retiré de FXR (il ne l'a jamais été sur FXL) | ✅ (confirmé + corrigé) |
| `NO TICKET` | VOID, ITR-EML | Commande billet sans billet émis | à vérifier | 🟡 |
| `NO EMAIL ADDRESS` | ITR-EML | Envoi de reçu sans email en PNR | à vérifier — possible `EMAIL ADDRESS REQUIRED` | 🟡 |
| `TICKET ALREADY ISSUED` | ET/TTP (re-émission sur même TST) | Émission refusée, billet déjà existant | à vérifier | 🟡 |
| `NO SEGMENTS` | XE (XEALL sans segment) | Annulation globale sans segment à annuler | à vérifier | 🟡 |
| `QUEUE NOT FOUND` | QD, QE, QR | Queue référencée inexistante | à vérifier | 🟡 |
| `NO ACTIVE QUEUE` | QN, QR | Commande queue sans queue ouverte (QE) | à vérifier | 🟡 |
| `NO CURRENT QUEUE ITEM` | QR | Retrait de queue sans PNR courant chargé | à vérifier | 🟡 |
| `NO RECORDED PNR` | IG, IR, QP | Commande nécessitant un PNR déjà enregistré (ER fait) | à vérifier | 🟡 |
| `NO FORM OF PAYMENT` | ET/TTP | Émission sans FP renseigné | à vérifier — possible `FORM OF PAYMENT REQUIRED` | 🟡 |
| `LOCATION PROVIDER NOT CONFIGURED` | DAC, DAN | `deps.locations` non câblé | ⬜ **hors périmètre** : message technique interne (erreur de configuration du simulateur), ne devrait jamais apparaître en usage réel (le provider est toujours câblé dans `apps/web`) — ne pas essayer de le faire ressembler à un message Amadeus |
| `HELP NOT FOUND` | HE `<sujet inconnu>` | Sous-commande HE sans page d'aide | à vérifier, priorité basse (fonctionnalité pédagogique HE, pas une erreur transactionnelle) | 🟡 |

---

## Cohérence transverse (tâche 4)

Vérifié : chaque situation métier partage bien un seul libellé dans toutes les commandes
concernées — pas d'incohérence trouvée entre commandes pour une même situation :
- « pas de PNR actif » → `NO ACTIVE PNR` partout (ER direct ; RT/XI via le rendu vide)
- « pas de PNR enregistré » → `NO RECORDED PNR` partout (IG, IR, QP)
- « queue introuvable » → `QUEUE NOT FOUND` partout (QD, QE, QR)
- « pas de TST » → `NO TST` partout (FXX, FXL, TQT, FQN, ET/TTP)
- « rien à annuler » → `NOTHING TO CANCEL` partout (XE, VOID)

Aucune correction nécessaire sur ce point.

## Point business plus profond que le wording (NO SEATS / NOT ENOUGH SEATS)

**Confirmé par Massy (05/07/2026)** : le simulateur refuse purement et simplement la vente si la
classe est à 0 siège ou si le nombre de pax dépasse le disponible. Le vrai Amadeus, dans ce cas,
met en liste d'attente (statut de segment `HL`/`UC`) plutôt que de refuser. Le simulateur ne crée
aujourd'hui que des segments statut `HK` (jamais HL/KK/UC/NO). Corriger uniquement le *texte* de
l'erreur sans revoir ce comportement business laisserait un écart de fidélité plus important que
le libellé lui-même.

**Décision (05/07)** : chantier confirmé comme réel et nécessaire, mais explicitement **non traité
dans cette mission** — implique de revoir toute la logique SS/statuts de segment (gestion de la
liste d'attente, affichage RT des statuts HL/UC, probablement une nouvelle commande pour confirmer
un HL en HK). Proposé comme mission dédiée future (voir `TASKS.md` Backlog).

## Récapitulatif des décisions prises le 05/07/2026 (Mission 03)

| Point | Décision de Massy | Statut final |
|---|---|---|
| `NO NAME` (FXP/FXR/FXB) | FXP/FXB l'exigent, FXR non | ✅ Corrigé (contrôle retiré de FXR) |
| `NOTHING TO CANCEL` (VOID) | Garder tel quel | ✅ Confirmé |
| `END PNR FIRST` | Garder un message générique unique | ✅ Confirmé (statu quo assumé) |
| `NO SEATS` / `NOT ENOUGH SEATS` | Le vrai Amadeus met en liste d'attente (HL/UC) | 🟡 Business confirmé à revoir — mission dédiée future, non traité ici |

Les 22 autres lignes 🟡 restantes (formulation uniquement, pas de question business) n'ont pas
d'impact fonctionnel connu au-delà du texte affiché — pas d'urgence, à confirmer avec Massy au fil
de l'eau plutôt qu'en bloc.
