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
| ~~`ET` est traité comme « émission de billet »~~ **corrigé Mission 16 Étape 0 (06/07/2026)** | **`ET` = End Transaction** (valide le PNR sans le réafficher, jumeau de `ER`). L'émission, c'est `TTP` seul | ✅ Fait : `ET` partage désormais la logique d'enregistrement de `ER` (helper commun `recordPnr`) mais n'affiche que la confirmation/record locator, sans réafficher le PNR ; `ET` n'émet plus de billet — seul `TTP` le fait |
| ~~`VOID` comme commande d'annulation de billet~~ **corrigé Mission 15 (06/07/2026)** | L'annulation d'un e-ticket passe par **`TWD`** (afficher le billet) puis **`TWX`** (l'annuler). « VOID » n'est pas une entrée cryptique | ✅ Fait : `VOID` retiré du dispatcher, `TWD`/`TWX` ajoutés (même logique de résolution/annulation qu'avant, format d'affichage TWD minimal — repose sur les lignes FA/FB déjà utilisées ailleurs — marqué « à vérifier » : la richesse réelle de l'écran TWD (base tarifaire, taxes, endossements) n'est pas modélisée) |

À vérifier aussi : notre `OSI` (le vrai code d'entrée est `OS`), notre `SSR` (vrai code `SR`),
notre `FQN` (dans le vrai système, FQN affiche les notes tarifaires d'une ligne de FQD).

## Priorité 1 — le cœur du métier qui manque (impact pédagogique maximal)

| Commande | Rôle | Logique / état requis |
|---|---|---|
| ~~`SS` vente directe (long sell)~~ **fait Mission 15 (06/07/2026)** | Vendre SANS affichage AN préalable : `SSAF950C12DECCDGBRU1` | ✅ Fait : `handleSSLongSell` — parse vol/classe/date/villes, réutilise la même recherche de disponibilité qu'AN (et alimente `state.lastAN`, comme un AN implicite — sièges partagés avec un SS numérique ultérieur, restitution IG/IR/XI déjà couverte), crée un segment HK. Erreurs : `NOT IN TABLE` (vol/ville inconnu), `CHECK CLASS OF SERVICE`, `CHECK DATE`, `CHECK FORMAT` |
| ~~`SB`~~ **fait Mission 15 (06/07/2026)** | Rebooker : classe (`SBY6`), date (`SB12APR7`), vol (`SBBA194*3`) | ✅ Fait : `handleSB` — le nombre final réfère au numéro d'élément RT du segment (même convention que XE). Ancien segment passe `HX`, nouveau segment `HK`, inventaire libéré/re-décrémenté (réutilise le contexte `state.lastAN` déjà chargé s'il correspond à la même route/date, sinon le re-fetch — évite de « réinitialiser » silencieusement les sièges d'un autre segment déjà vendu sur le même vol/date). Bloqué si le segment est lié à un TST (`NOT ALLOWED - TST SEGMENT`, même règle que XE). **Syntaxe exacte non confirmée par expérience terrain** (déduite des 3 exemples ci-contre) — à vérifier avec Massy |
| ~~Modification par n° d'élément~~ **fait Mission 15 (06/07/2026), périmètre réduit** | `5/NOUVEAU TEXTE`, `8/12JUL`, `4/2` (sièges), `2/HK` | ✅ Fait pour les éléments texte/date libres : `RM`, `OSI`, `SSR`, `OP` (texte OU date selon que la valeur ressemble à un `ddMMM`), `TKTL`. `NOT ALLOWED` pour tout autre type d'élément (PAX, segment, AP, FP, RF, billet...). **Volontairement pas fait** : `4/2` (nombre de sièges d'un segment) et `2/HK` (code de statut d'un segment) — ambigus et redondants avec `SB` (déjà plus explicite sur quelle dimension change) ; `NU` (nom) est une commande dédiée à part (item suivant de la liste). `ELEMENT NOT FOUND` si le numéro ne correspond à rien |
| ~~`NU`~~ **fait Mission 15 (06/07/2026)** | Corriger un nom (`NU1/1SMITH/JOHN MR`) | ✅ Fait : `handleNU` — la position (référencée deux fois, avant et après le `/`, comme dans l'exemple) doit correspondre, sinon `CHECK FORMAT` (pas de choix arbitraire silencieux). Bloqué dès qu'un billet est émis sur le PNR (`NOT ALLOWED`) — conforme à « interdit après émission ». `ELEMENT NOT FOUND` si la position ne correspond à aucun passager |
| ~~`DL`~~ **fait Mission 15 (06/07/2026), périmètre réduit** | Supprimer un élément (`DL4`) — vs XE qui annule | ✅ Fait, **scope segments uniquement** : en relisant `cancelElements` (logique XE existante), tous les autres types d'éléments (RM/OSI/SSR/OP/AP/APE/TKTL/FP/RF) sont déjà **réellement supprimés** par XE (`splice`/mise à `null`, pas un simple marqueur historisé) — il n'y a donc pas de vraie distinction « vs XE » à faire pour eux, `DLn` sur l'un d'eux renvoie `NOT ALLOWED` (rediriger vers XE). Le seul cas où XE laisse un residu visible (statut `HX`) est le segment — c'est là que `DL` a un sens réel : il retire le segment du tout (sans `HX`), réutilise les mêmes garde-fous que XE (`NOT ALLOWED - TST SEGMENT`, `NOT ALLOWED - LAST SEGMENT`) et restitue l'inventaire (même famille que IG/SB/XI) |
| `ETK` / `ERK` | Fin de transaction en traitant les codes-conseil : KK/KL→HK, UC/UN/NO→historique | Nécessite les statuts de segment au-delà de HK — même chantier que mission 13 (HL/UC) |
| ~~`SI ARNK`~~ **fait Mission 15 (06/07/2026)** | Segment de continuité « arrivée inconnue » (trou dans l'itinéraire) | ✅ Fait : `handleSIArnk` ajoute un élément d'itinéraire neutre (`type: "ARNK"`, ni vol ni date), affiché en RT comme une ligne `ARNK` simple. Le simulateur n'a jamais eu de détection automatique de trou de continuité (aucun avertissement à « supprimer ») — l'élément existe pour construire un itinéraire fidèle, pas pour réagir à une alerte. Compatible avec XE (annulation, statut `HX`) et `DL` (suppression réelle), comme un vrai segment |
| ~~`MD` `MU` `MT` `MB`~~ **fait Mission 16 Étape 1 (06/07/2026)** | Défilement de l'affichage courant (page suivante/précédente/haut/bas) | ✅ Fait : nouvel état CORE `state.lastDisplay` ({type, header, itemLines, pageSize, page}), pas de l'UI. `TN`/`SN` n'affichent plus que la page courante (avant : toutes les pages d'un coup) ; `MD`/`MU`/`MT`/`MB` font défiler. Bornes : clamp silencieux (pas d'erreur inventée pour "après la dernière page", comportement réel non confirmé). **`AN`/`RT` non branchés** (jamais assez de résultats pour paginer dans ce simulateur aujourd'hui — pas de régression, juste hors périmètre immédiat) ; `NO ACTIVE DISPLAY` si rien n'a encore été paginé |
| ~~`MN` / `MY`~~ **fait Mission 16 Étape 2 (06/07/2026)** | Même dispo au jour suivant / précédent | ✅ Fait : relance `state.lastAN.query` (from/to/date) décalé de ±1 jour comme un vrai `AN`, même si le dernier affichage était un `TN`/`SN` (tous alimentent le même `state.lastAN`). `NO ACTIVE DISPLAY` si aucune recherche préalable |
| ~~`AC` / `SC` / `ACR`~~ **fait Mission 16 Étape 3 (06/07/2026)** | Modifier le dernier affichage dispo : `AC18MAY`, `AC/CF`, `ACR` (retour) | ✅ Fait selon la spec de l'architecte (§Spec AC/SC/ACR de `MISSION-16.md`, 8 règles de désambiguïsation déterministes) : `AC`/`SC` rejouent la dernière recherche en ne changeant QUE le delta indiqué (date, delta jours, villes, compagnie, classe, sièges min, heure), tous les autres critères conservés (chaînable : `AC/CF` puis `AC3` puis `MD`). `AC` réaffiche toujours en style `AN`, `SC` toujours en style `SN`, quel que soit le type du dernier affichage. `ACR` inverse les villes (défaut : départs après 18h00 le même jour, ou heure/date fournie). `NOT IN TABLE`/`CHECK DATE`/`CHECK CLASS OF SERVICE` réutilisés ; filtre compagnie/sièges/heure sans correspondance → liste vide affichée (pas d'erreur inventée) |
| `RT` partiels | `RTN` (noms), `RTI`/`RTA` (itinéraire), `RTK` (billetterie), `RTG` (services), `RTR` (remarques) | Filtres d'affichage du PNR actif |
| ~~`TKOK` / `TKXL`~~ **fait Mission 15 (06/07/2026)** | Compléter TKTL : billeter maintenant / date limite d'annulation | ✅ Fait : refactor de `pnr.tktl` (simple date) vers `pnr.tk = { kind: "TL"\|"XL"\|"OK", date }` — un seul élément TK par PNR (poser `TKOK` après `TKTL` remplace l'élément, n'en ajoute pas un second). `TKOK` sans date ; `TKXL/ddMMM` même format que `TKTL/ddMMM`. Compatible XE/DL/modification par n° (bloqué `NOT ALLOWED` pour tenter de modifier la date d'un `TKOK`, qui n'en a pas) |

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
