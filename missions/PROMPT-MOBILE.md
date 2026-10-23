# Prompt — Rendre adaptatif ce qui ne l'est pas : le terminal et l'administration

> Constat et mesures faits en production par l'architecte le 22/10/2026, puis confirmés par
> Massy sur son téléphone. Priorité haute : la page concernée est celle qui convertit.

---

## Le constat, avec les mesures

J'ai analysé le CSS réellement servi en production, feuille par feuille.

**Ce qui va bien — ne pas y toucher.** Les pages publiques (accueil, catalogue, fiche de
formation) sont correctement adaptatives : balise `viewport` présente, trois points de rupture
(`1023px`, `767px`, `639px`), et les trois halos décoratifs à largeur fixe sont bien découpés
par un conteneur — aucun débordement horizontal.

**🔴 Le terminal n'a aucune règle mobile.** La feuille servie sur la page de démonstration ne
contient qu'une seule requête média : `print`. Aucune pour les petits écrans.

Mesuré sur la page réelle : **une ligne de 80 colonnes occupe 768 px** dans la police du
terminal (16 px). Un téléphone en fait 390. Le conteneur est en `overflow-x: visible` : il n'y
a même pas de défilement horizontal. Les lignes de résultat d'un `AN` sont donc coupées ou
repliées n'importe comment.

C'est le pire endroit possible pour ce défaut : la démonstration est le premier écran d'un
visiteur qui clique « Essayer le terminal », et l'essentiel du public algérien arrivera depuis
un téléphone, par les réseaux sociaux.

**🟠 L'administration non plus.** Même absence de requête média, et le tableau des licences
mesure **1287 px**. Massy ne peut pas gérer une licence depuis son téléphone. Moins grave — un
seul utilisateur — mais à traiter.

## Décision d'architecture sur le terminal — à appliquer telle quelle

Quatre approches étaient possibles. Trois sont mauvaises, et il faut savoir pourquoi :

- **Réduire la police jusqu'à faire tenir 80 colonnes** : il faudrait descendre sous 8 px.
  Illisible.
- **Mettre les lignes à la ligne (`wrap`)** : **interdit.** Dans un affichage Amadeus,
  l'alignement des colonnes *est* l'information — c'est lui qui dit quelle valeur est une
  classe, un horaire, un aéroport. Replier une ligne détruit le contenu, et apprend à l'élève
  à lire un écran qui n'existe pas.
- **Réduire à l'échelle avec `transform: scale`** : revient au premier cas, en plus flou.

**Retenu : défilement horizontal dans le terminal, plus une police réduite sur petit écran.**

1. Le conteneur du terminal passe en **`overflow-x: auto`** sur petit écran, avec
   `white-space: pre` conservé. L'élève fait glisser horizontalement, comme dans n'importe quel
   terminal sur téléphone. **L'alignement des colonnes reste exact** — c'est la contrainte
   non négociable.
2. **Police réduite sur petit écran** — à calibrer, autour de 12-13 px : 80 colonnes passent
   alors d'environ 768 px à près de 600 px, donc beaucoup moins de défilement. Descends jusqu'à
   la limite de lisibilité réelle, pas plus bas.
3. Le défilement doit être **perceptible** : sans indice visuel, l'utilisateur ne devine pas
   qu'il peut faire glisser. Une ombre ou un dégradé sur le bord droit tant qu'il reste du
   contenu — discret, pas une flèche clignotante.
4. **Une suggestion de passage en mode paysage** est acceptable si elle est discrète et
   affichée une seule fois. Jamais un blocage, jamais une modale.

⚠️ **Le fond clair du terminal ne change pas** (`#dde5f4`) : c'est la fidélité au vrai Amadeus
Selling Platform, vérifiée avec Massy — voir `docs/FIDELITE-VISUELLE.md` et la règle corrigée
dans `docs/DESIGN-SYSTEM.md` §2 bis. Ne « corrige » pas cette couleur.

## La famille complète, pas seulement la page de démonstration

Le terminal apparaît à **quatre endroits**, et ils doivent tous être traités dans la même
passe, sinon le défaut réapparaîtra par la porte qu'on n'a pas fermée :

- la page de démonstration publique ;
- le mode libre (`/simulateur`) ;
- la leçon de type `simulateur` dans le lecteur de leçon ;
- la leçon de type `exercice`, avec son panneau de consigne — qui doit lui aussi tenir sur un
  écran étroit, sans écraser le terminal.

Les boutons de commandes d'exemple et le champ de saisie doivent rester utilisables au doigt :
hauteur de cible suffisante, et le champ ne doit pas passer sous le clavier virtuel.

## L'administration

Moins critique, à faire après le terminal.

- Les tableaux (licences, journal) : **conteneur à défilement horizontal**, en-têtes figés si
  c'est simple. Ne réduis pas le nombre de colonnes : Massy en a besoin.
- Les barres d'actions et les formulaires d'édition de leçon s'empilent verticalement sur
  petit écran.
- L'éditeur de formation doit rester utilisable : c'est là que le contenu se saisit, et Massy
  le fera parfois depuis son téléphone.

## Ce que tu ne fais pas

- Pas de refonte des pages publiques : elles sont correctes, mesures à l'appui.
- Pas de `wrap` ni de troncature sur une sortie de terminal.
- Pas de changement de la couleur de fond du terminal.
- Pas de bibliothèque supplémentaire : ce sont des règles CSS.

## Vérification — lis ceci avant de conclure

**La vérification par redimensionnement de fenêtre ne suffit pas, et elle a failli me faire
passer à côté.** Chrome refuse de redimensionner une fenêtre maximisée : j'ai dû diagnostiquer
par analyse du CSS. Utilise un vrai mode d'émulation d'appareil, ou demande à Massy de regarder
sur son téléphone.

À prouver, à **390 px** et à **360 px** (beaucoup de téléphones courants en Algérie) :

- [ ] une sortie `AN15DECALGPAR` reste **alignée en colonnes**, et se parcourt
      horizontalement sans que la page entière défile ;
- [ ] aucune des quatre portes du terminal n'a été oubliée ;
- [ ] le champ de saisie reste visible clavier ouvert ;
- [ ] les boutons de commandes d'exemple sont cliquables au doigt ;
- [ ] le tableau des licences se parcourt sans perdre de colonne ;
- [ ] **aucun débordement horizontal de la page** sur l'ensemble du site —
      `document.documentElement.scrollWidth` ne dépasse pas `clientWidth`.

Ajoute un test de non-régression qui vérifie ce dernier point sur les pages principales à
390 px : c'est la seule garantie que la prochaine fonctionnalité ne réintroduira pas le défaut.

Clôture habituelle : suites vertes, lint, typecheck, budgets de performance, entrée datée en
haut de `JOURNAL.md`, `TASKS.md` §En cours.
