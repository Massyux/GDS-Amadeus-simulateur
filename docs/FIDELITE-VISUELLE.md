# FIDELITE-VISUELLE — Fidélité visuelle du terminal (Mission 04)

> Comparaison du terminal (`apps/web`) avec le vrai Amadeus Selling Platform Command Page,
> établie avec Massy (expérience terrain réelle du logiciel) le 05/07/2026.

## Constat

Massy a comparé le terminal (police, couleurs, largeur de colonnes, curseur, espacement,
comportement du scroll) avec le vrai Amadeus de mémoire/sur son accès réel : **aucun écart visuel
signalé**. Le rendu actuel (`apps/web/src/index.css`, `Terminal.jsx`) est jugé fidèle en l'état.

Aucune modification cosmétique n'a donc été nécessaire dans cette session.

## Bug critique trouvé pendant la vérification (hors périmètre visuel, corrigé immédiatement)

En testant le terminal pendant cette session, Massy a signalé que `NM1...` échouait
systématiquement avec `CHECK FORMAT` alors que le nom saisi était correct.

Diagnostic : `splitANFilter()` (le filtre compagnie du AN, syntaxe `AN.../XX`) était appliqué à
**toutes** les commandes soumises dans `onEnter`, pas seulement à AN. Dès qu'une commande contenait
un `/` et que les 2 derniers caractères après le `/` formaient un motif de 2 lettres, le texte
après le `/` était traité comme un filtre compagnie et tronqué de la commande réelle. Confirmé
cassé sur :
- `NM1MEHDANI/MASSU` → tronqué en `NM1MEHDANI` (signalé par Massy)
- `OP26DEC/CALL PAX...` → tronqué en `OP26DEC`
- `TKTL/26DEC` → tronqué en `TKTL`

**Corrigé** : `splitANFilter` n'est appelé que si la commande commence réellement par `AN`. Un test
Playwright existant ("full happy path") passait par accident depuis le début (il ne vérifiait que
la ligne échouée affichée à l'écran, jamais le contenu réel du PNR) — corrigé pour vérifier le
Record Locator, qui n'apparaît que si `ER` réussit vraiment. Tests de non-régression ajoutés
(Vitest + Playwright) pour NM/OP/TKTL avec un `/`. Détail dans `TASKS.md`.

## Critères d'acceptation (mission)

- [x] Écarts visuels listés avec Massy → aucun trouvé, rien à traiter
- [x] Zéro asset/copie du vrai logiciel ; disclaimer intact (non touché)
- [x] Suites vertes + CI verte, rituel de clôture exécuté
