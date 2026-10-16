# Prompt — Élargir les données du simulateur pour qu'elles couvrent la formation

> À donner après la correction du terminal clair sur `/demo`.
> Architecte, 16/10/2026. Tâche courte, sans risque pour le moteur.

---

Le contenu de la formation « Amadeus niveau 1 » vient d'être produit : une présentation,
six fiches de référence PDF et le cours écrit, dans `D:\cowork\formation-amadeus-n1\`.

**Problème à corriger** : les fiches enseignent environ **250 aéroports** et **100 compagnies**,
alors que `apps/web/public/data/locations.json` en contient **25** et `airlines.json` **12**.
Un élève qui tape `DAN DUBAI` ou `AN15DECALGDXB` après avoir lu la fiche obtiendra une erreur
et croira s'être trompé. C'est un défaut pédagogique, pas un bug technique — mais il ruine la
confiance dans l'outil, ce qui est pire.

Décision de Massy : les fiches sont de vraies références métier, **et c'est le simulateur qui
s'élargit**.

## Ce qu'il faut faire

**Source de vérité** : les fichiers de données de la formation, qui contiennent exactement les
listes publiées aux élèves —
`D:\cowork\formation-amadeus-n1\` (données sources Python dans le dossier de travail de
l'architecte ; si tu ne les trouves pas, extrais les listes des PDF `03`, `04` et `05`).

1. **`locations.json`** : ajouter les aéroports des fiches 03 et 04 au format existant
   (`iata`, `type`, `city`, `name`, `country`, `region`). Ne modifie pas les entrées
   existantes — ajoute seulement.
2. **`airlines.json`** : ajouter les compagnies de la fiche 05 au format existant
   (`code`, `numeric`, `name`). Les préfixes numériques manquants restent vides, c'est prévu.
3. **Les codes de ville** (`PAR`, `LON`, `NYC`) doivent fonctionner comme aujourd'hui :
   vérifie que `type` est bien renseigné pour les distinguer des aéroports, et que `AN` sur un
   code de ville continue de regrouper correctement.

## Ce à quoi il faut faire attention

- **Le moteur ne change pas.** C'est de la donnée, pas du code. Si tu te retrouves à modifier
  `packages/core`, arrête-toi : tu as pris le mauvais chemin.
- **Les tests golden existants doivent rester verts à l'identique.** Ils s'appuient sur des
  scénarios ALG → PAR : si un ajout de données modifie un affichage existant, c'est une
  régression, pas un progrès.
- **Volume** : vérifie l'effet sur le poids du bundle et le temps de chargement. Ces fichiers
  sont servis au navigateur. S'ils dépassent ce qui est raisonnable, charge-les à la demande
  plutôt que de rogner sur le contenu — et dis-le dans ton compte rendu.
- **Cohérence stricte entre les fiches et les données.** À la fin, chaque code publié dans les
  PDF doit répondre dans le simulateur. Écris un test qui le vérifie automatiquement : il
  échouera le jour où quelqu'un ajoutera un code dans une fiche sans l'ajouter aux données.

## Vérification

En production, après déploiement : `DAC DXB`, `DAN DUBAI`, `AN15DECALGIST`, `AN15DECALGDXB`
doivent tous répondre correctement. Teste aussi trois codes algériens secondaires — `TMR`,
`BSK`, `GHA` — et trois compagnies — `QR`, `EK`, `TK`.

Clôture habituelle : suites vertes, lint, typecheck, entrée datée dans `JOURNAL.md`,
`TASKS.md` §En cours.
