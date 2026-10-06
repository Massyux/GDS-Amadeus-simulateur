# MISSION 21 — Correction des schémas de réponse (session dirigée par Massy)

> ⚠️ **CADRAGE CORRIGÉ PAR MASSY (06/10/2026) — à lire avant tout.**
> Ce n'est pas une mission que Claude Code exécute seul à partir des manuels. Massy a
> constaté qu'un **schéma de réponse est faux** dans le simulateur. Il reprendra ces écrans
> **lui-même, un par un, en direct avec l'architecte**, une fois les missions 23 et 22
> terminées.
>
> Donc : **ne pas démarrer cette mission de sa propre initiative, ne rien corriger par
> déduction.** Le contenu ci-dessous n'est qu'un cadre de travail (méthode des trois
> colonnes, ordre de priorité) à utiliser quand Massy ouvrira la session. C'est lui qui
> apporte la vérité de référence, écran par écran.


**Signalé par Massy 06/10/2026** : « les réponses d'Amadeus ne sont pas à l'identique ».
C'est le cœur de la valeur pédagogique — un étudiant qui apprend sur un écran faux
développe de faux réflexes. **Durée : 3-5 sessions.** Troisième des trois chantiers.

## Pourquoi c'est différent des missions précédentes

La MISSION-03 a traité les **messages d'erreur**. Celle-ci traite les **écrans de réponse
complets** : en-têtes, colonnes, alignements, codes de statut, ordre des informations,
lignes de séparation. Un format approximatif se voit immédiatement par un professionnel.

**Règle absolue (CONSTITUTION §2)** : ne jamais inventer un format. Toute ligne non
confirmée est marquée « à vérifier » et arbitrée par Massy ou par les manuels de
`D:\cowork\references-amadeus\` (les télécharger si ce n'est pas fait, voir
`docs/REFERENCES-AMADEUS.md`).

## Méthode

Créer `docs/FIDELITE-REPONSES.md` : une section par écran, avec trois blocs côte à côte —
**(1) ce que le simulateur affiche aujourd'hui** (copié depuis une exécution réelle),
**(2) ce que le vrai Amadeus affiche** (fourni par Massy ou extrait d'un manuel, avec sa
source), **(3) les écarts constatés**, ligne par ligne.

Massy fournit le bloc (2). Sans lui, la mission ne peut pas avancer sur l'écran concerné —
le dire plutôt que d'improviser.

## Ordre de priorité (du plus vu au moins vu par un étudiant)

1. **`AN` — disponibilité** : ligne d'en-tête (date, ville-paire, jour), numérotation,
   codes compagnie/vol, classes et nombre de sièges, horaires, type d'appareil, durée,
   escales. C'est l'écran le plus regardé de toute la formation.
2. **`RT` — affichage du PNR** : en-tête avec record locator, numérotation des éléments,
   format des lignes passager, segment, contact, TK, remarques, alignement des colonnes.
3. **`FXP` / `TQT` — tarification et TST** : structure du TST, ventilation taxes, totaux.
4. **`TTP` / `TWD` — billetterie** : confirmation d'émission, affichage du billet.
5. **`SN` / `TN`** : horaires et timetable.
6. Le reste au fil de l'eau.

Pour chaque écran : corriger le format, mettre à jour les tests golden correspondants (ils
doivent casser puis être mis à jour — un golden qui ne casse pas signale un cas non testé),
faire valider le rendu final par Massy avant de passer au suivant.

## Points de vigilance

- Les tests golden du core encodent le format **actuel** : les modifier massivement est
  attendu ici, mais chaque modification doit être intentionnelle et relue, jamais un
  « mise à jour en masse » aveugle.
- La largeur d'affichage (80 colonnes) et l'alignement comptent autant que le contenu.
- Vérifier le rendu dans le vrai terminal web, pas seulement dans les tests.

## Critères d'acceptation
- [ ] `docs/FIDELITE-REPONSES.md` couvre les écrans 1 à 5, chacun avec sa source
- [ ] Massy a validé visuellement chaque écran corrigé
- [ ] Zéro format inventé : tout ce qui n'est pas confirmé est marqué et listé pour arbitrage
- [ ] Suites + CI vertes, production vérifiée, rituel de clôture
