# Analyse d'écart — commandes Amadeus manquantes dans le simulateur

> Établi le 06/07/2026 par l'architecte, à partir du **Amadeus Cryptic Entries Reference Guide**
> (éd. 9.2, sections Info/Sign-in/Encode-décode/Air/PNR lues intégralement ; sections
> Tarifs/Billetterie/Queues complétées par expertise métier — à recouper avec les PDF de
> `D:\cowork\references-amadeus\` quand téléchargés) et de l'inventaire du moteur
> (PROJECT_MEMORY §5, ~35 commandes). Descriptions reformulées (pas de copie du manuel).
> Périmètre : formation agent de voyage. Exclus volontairement : AIR/IMR, Negotiated Space,
> profils clients, Timatic complet, impression WRA, sécurité ES/RP (hors sujet pédagogique v1).

## ⚠️ D'abord : 2 écarts de fidélité DANS l'existant (à corriger avant d'ajouter)

| Constat | Vrai Amadeus | À faire |
|---|---|---|
| `ET` est traité comme « émission de billet » | **`ET` = End Transaction** (valide le PNR sans le réafficher, jumeau de `ER`). L'émission, c'est `TTP` seul | Reclasser ET en fin de transaction ; l'émission reste TTP |
| `VOID` comme commande d'annulation de billet | L'annulation d'un e-ticket passe par **`TWD`** (afficher le billet) puis **`TWX`** (l'annuler). « VOID » n'est pas une entrée cryptique | Renommer le flux : TWD/TWX ; garder la logique déjà écrite |

À vérifier aussi : notre `OSI` (le vrai code d'entrée est `OS`), notre `SSR` (vrai code `SR`),
notre `FQN` (dans le vrai système, FQN affiche les notes tarifaires d'une ligne de FQD).

## Priorité 1 — le cœur du métier qui manque (impact pédagogique maximal)

| Commande | Rôle | Logique / état requis |
|---|---|---|
| `SS` vente directe (long sell) | Vendre SANS affichage AN préalable : `SSAF950C12DECCDGBRU1` | Parse vol/classe/date/villes → interroge provider dispo → segment HK. Erreurs : vol inconnu, classe fermée |
| `SB` | Rebooker : classe (`SBY6`), date (`SB12APR7`), vol (`SBBA194*3`) | PNR actif avec segments ; remplace le segment (l'ancien passe annulé), re-décrémente l'inventaire |
| Modification par n° d'élément | `5/NOUVEAU TEXTE`, `8/12JUL`, `4/2` (sièges), `2/HK` | Syntaxe transverse : n° de ligne PNR + `/` + nouvelle valeur ; dépend du type d'élément |
| `NU` | Corriger un nom (`NU1/1SMITH/JOHN MR`) | PNR actif ; interdit/contrôlé après émission |
| `DL` | Supprimer un élément (`DL4`) — vs XE qui annule | Distinction annulation (historisée) / suppression |
| `ETK` / `ERK` | Fin de transaction en traitant les codes-conseil : KK/KL→HK, UC/UN/NO→historique | Nécessite les statuts de segment au-delà de HK — même chantier que mission 13 (HL/UC) |
| `SI ARNK` | Segment de continuité « arrivée inconnue » (trou dans l'itinéraire) | Élément d'itinéraire neutre ; supprime l'avertissement de continuité |
| `MD` `MU` `MT` `MB` | Défilement de l'affichage courant (page suivante/précédente/haut/bas) | État « dernier affichage paginé » (AN, RT long, HE…) |
| `MN` / `MY` | Même dispo au jour suivant / précédent | Relance le dernier AN décalé d'un jour |
| `AC` / `ACR` | Modifier le dernier affichage dispo : `AC18MAY`, `AC/CF`, `ACR` (retour) | Garde les critères du dernier AN, applique le delta, réaffiche |
| `RT` partiels | `RTN` (noms), `RTI`/`RTA` (itinéraire), `RTK` (billetterie), `RTG` (services), `RTR` (remarques) | Filtres d'affichage du PNR actif |
| `TKOK` / `TKXL` | Compléter TKTL : billeter maintenant / date limite d'annulation | Élément TK, un seul par PNR, formats datés |

## Priorité 2 — environnement & utilitaires de l'agent (rapides à faire, très « vrai Amadeus »)

| Commande | Rôle | Logique |
|---|---|---|
| `JI` / `JO` | Se connecter / déconnecter d'une zone de travail (1er geste appris en formation) | État session ; JD existe déjà ; bloquer les commandes hors sign-in est un choix pédagogique fort |
| `DC` | Encoder/décoder pays et nationalités (`DC FRANCE`, `DC GB`) | Table de données pays |
| `DNA` | Encoder/décoder une compagnie (`DNA DELTA`, `DNA 057`) | Table compagnies (code 2 lettres + n° billetterie) |
| `DNE` | Encoder/décoder un type d'appareil (`DNE AIRBUS`, `DNE 343`) | Table appareils |
| `DB` | Points d'embarquement d'une ville multi-aéroports (`DB LON`) | Depuis packages/data |
| `DD` | Calculs de dates/heures (`DD19JUL`, `DD15MAR/-35`, `DDPAR`) | Pur calcul, aucune donnée externe |
| `DF` | Calculatrice (`DF 20*30`) | Pur calcul |
| `DO` | Détails d'un vol (`DO2` depuis AN, `DOAF2418/28NOV`) | Provider dispo étendu (escales, appareil, durées) |
| `DM` | Temps de connexion minimum d'un aéroport (`DMFRA`) | Table MCT simple |
| `RE` | Rappeler la dernière entrée (`RE`, `RE2`) | Historique de saisie (peut déjà exister côté UI — l'exposer en commande) |

## Priorité 3 — servicing avancé (v1.x, après pilote)

| Commande | Rôle | Logique |
|---|---|---|
| `RT <locator>` / `RT/<nom>` | Récupérer un PNR enregistré (par record locator, nom, vol+date) | Nécessite un magasin de PNR enregistrés (packages/data) — aujourd'hui seul le PNR actif existe |
| `SP` + `EF` + `RTAXR` | Scinder un PNR (un passager annule…), fichier associé, lien AXR | Duplication contrôlée du PNR, liens croisés |
| `RRN` / `RRI` / `RRP` | Copier un PNR (complet / itinéraire seul / passagers seuls), options date+jours, classe | Copie transformée du PNR actif |
| `RH` | Historique du PNR (qui a fait quoi) | Journal d'événements par PNR — s'appuyer sur l'events flow existant |
| `SM` / `ST` / `SX` | Plan de cabine, demande de siège (`ST/12C/P2/S5`), annulation sièges | Modèle de carte des sièges par vol + éléments SEAT dans le PNR |
| `SO` | Segment ouvert (date non fixée) | Segment sans vol/date, statut spécifique |
| `FFN` / `FFA` / `FFD` | Numéros de fidélité (SSR FQTV) | Table programmes + validation format |
| Waitlist `SS…PE` + statuts HL/UC/KK/KL | Vente en liste d'attente (mission 13 déjà actée) | Statuts de segment multiples + ETK/ERK |
| Groupes `NG` / `SS…SG` / `SP 0.x` | PNR de groupe (offre école !) | Modèle passagers non nommés + noms progressifs |

## Priorité 4 — tarifs & billetterie complets (v2, à recouper avec le manuel Fares/Ticketing)

`FQD` (affichage des tarifs par O&D), `FQP` (cotation d'itinéraire sans PNR), `FXA`
(alternatives), famille TST complète (`TTE` suppression, `TTI`, `TTK`…), `TTP` avec options
(`/RT`, `/T1`, `/INV`), `TWD`/`TWX` (affichage/void e-ticket — cf. écart n°2), `TRF`
(remboursement), échange/réémission. Gros chantier cohérent avec le moteur de pricing existant.

## Découpage en missions proposées (à valider par Massy)

- **M15 — Servicing du PNR actif** : SS long sell, SB, modification par n°, NU, DL, SI ARNK,
  TKOK/TKXL (+ correction des 2 écarts ET / VOID→TWD-TWX) — priorité 1
- **M16 — Navigation & affichages** : MD/MU/MT/MB, MN/MY, AC/ACR, RT partiels, RE
- **M17 — Utilitaires agent** : DC/DNA/DNE/DB, DD/DF, DO, DM (+ JI/JO si Massy valide le
  parcours sign-in pédagogique)
- **M18 — Sièges** : SM/ST/SX
- **M19 — PNR enregistrés & multi-PNR** : magasin de PNR, RT par locator/nom, SP/EF/RTAXR,
  RRN/RRI/RRP, RH
- **M13 (déjà actée) — Liste d'attente & statuts** : HL/UC/KK/KL + ETK/ERK (fusion naturelle)
- **M20 — Tarifs & billetterie v2** : priorité 4 ci-dessus

Ordre suggéré après le pilote : M15 → M16 → M17 (petites victoires rapides) → M13 → M18 →
M19 → M20. Chaque mission suit la constitution (grille par commande, tests golden, familles).
