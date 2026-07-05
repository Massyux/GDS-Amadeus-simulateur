# MISSION 04 — Fidélité visuelle du terminal (Phase 5, trade dress)

**Phase** : 5 · **Durée cible** : 1 session · **Pré-requis** : MISSION-03 close

## Contexte

Rapprocher l'apparence du terminal du vrai Amadeus Selling Platform Command Page : police,
couleurs, espacement, zone de saisie, comportement du curseur et du scroll. ⚠️ Contrainte IP
(CLAUDE.md Phase 5) : tout recréer À LA MAIN — aucune capture d'écran, aucun asset, aucune CSS
copiée du vrai logiciel. Conserver le disclaimer de non-affiliation.

## Tâches

1. Établir avec Massy (début de session) la liste des écarts visuels actuels vs le vrai Amadeus
   (il connaît le logiciel réel). Les consigner dans `docs/FIDELITE-VISUELLE.md` avec priorité.
2. Corriger écart par écart dans `apps/web` (App.css / Terminal.jsx), un commit par écart.
   Points attendus : palette exacte (fond/texte/curseur), police monospace et taille, largeur
   80 colonnes, marges, rendu de la ligne de commande active, clignotement du curseur,
   comportement de la zone scrollback.
3. Chaque changement de comportement (pas purement cosmétique) → test Vitest ou Playwright.
4. Vérification finale côte à côte avec Massy (il compare de mémoire ou sur son accès réel).

## Critères d'acceptation
- [ ] `docs/FIDELITE-VISUELLE.md` : tous les écarts listés traités ou reportés avec accord Massy
- [ ] Zéro asset/copie du vrai logiciel ; disclaimer intact
- [ ] Suites vertes + CI verte, rituel de clôture exécuté
