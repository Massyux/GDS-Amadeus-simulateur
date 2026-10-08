# Maquettes écrites — composition écran par écran

*Établi le 07/10/2026 par l'architecte, après inspection visuelle de l'Étape 2 avec Massy.*

> **Pourquoi ce document existe.** `docs/DESIGN-SYSTEM.md` donne les **briques** (couleurs,
> espacements, composants). Il ne dit pas **ce que chaque page montre, dans quel ordre, avec
> quelle hiérarchie**. L'Étape 2 a donc produit une structure juste mais nue : des cartes
> correctes flottant dans des pages vides, sans identité et sans le terminal.
>
> Ce document est le **plan de la maison**. Le système de design reste la référence pour
> toute valeur (couleur, taille, espacement) ; celui-ci dit où placer quoi et pourquoi.

---

## 0. Identité (à fixer avant tout écran)

- **Nom du produit affiché partout** : **« Orionis Academy »** (décision Massy, 08/10/2026,
  voir `CLAUDE.md` — tranche ce qui restait ouvert ici ; « GDS Academy » était le choix par
  défaut provisoire de l'architecte, retenu jusqu'à cette décision).
- **Logo** : pas d'image. Le nom en `--font-mono`, avec un curseur vert clignotant après
  (`Orionis Academy▌`). C'est gratuit, unique, et ça dit immédiatement « terminal ».
- **Langue** : tous les libellés d'interface passent par le dictionnaire FR/EN. **Aucun
  texte en dur** — le mélange constaté (« My account » au-dessus de contenu français) est
  le défaut qui fait le plus « amateur » de toute l'interface actuelle.

---

## 1. Accueil visiteur `/` — **l'écran le plus important, il n'existe pas encore**

C'est lui qui se joue en 50 millisecondes. Composition, de haut en bas :

1. **Barre** : nom + curseur, liens « Formations » / « Connexion », bouton accent
   « Commencer ».
2. **Bloc héros, deux colonnes** (empilées en mobile) :
   - *Gauche* : titre qui nomme la douleur — « Refusé en agence parce que tu ne connais pas
     Amadeus ? » ; une phrase de réponse ; **un seul** bouton accent « Essayer
     gratuitement » ; dessous, en petit, « sans carte bancaire ».
   - *Droite* : **le terminal, en démonstration animée** — une vraie séquence qui se tape
     toute seule en boucle (`AN15DECALGPAR` → résultats → `SS1Y1` → `RT`). C'est la preuve,
     c'est unique, c'est ce qu'aucun concurrent ne peut montrer. **Non négociable.**
3. **Bande de réassurance** : 3 chiffres sobres (ex. « 40+ commandes réelles », « 10
   exercices corrigés automatiquement », « accès à vie »).
4. **« Comment ça marche »** : 3 étapes illustrées par de vraies captures d'écran.
5. **« Pour qui »** : 3 profils (étudiant tourisme, candidat en agence, agent à former).
6. **Formateur** : photo réelle de Massy, nom, parcours en 2 phrases. Sans visage, pas de
   confiance.
7. **Tarifs** : prix affiché clairement, sans « nous contacter ».
8. **Témoignages** — section masquée tant qu'il n'y en a pas de vrais. **Jamais de faux.**
9. **Pied de page** : contact réel, mentions, **disclaimer de non-affiliation Amadeus**.

---

## 2. Connexion / inscription `/app`

Écran centré, carte de 420 px maximum, **fond = terminal en démonstration très atténué**
(opacité ~8 %) pour que l'identité soit présente dès la première seconde.
Au-dessus de la carte : le nom + curseur. Dans la carte : titre, 2 champs, bouton accent
pleine largeur, lien de bascule connexion/inscription, lien « mot de passe oublié ».
Pas de barre de navigation ici (déjà corrigé).

---

## 3. Catalogue `/app`

Problème actuel : une carte seule dans le vide.

1. **Titre + sous-titre** : « Formations » / « Choisis ton parcours. »
2. **Bloc « Reprendre »** — s'il existe une formation en cours, **tout en haut**, carte
   pleine largeur avec accent : « Continuer — Module 1, leçon 3 » + barre de progression +
   bouton. C'est le levier n°1 de régularité (`DESIGN-PSYCHOLOGIE.md` §4).
3. **Grille de formations** : 3 colonnes sur grand écran, 2 sur tablette, 1 en mobile.
   Carte = vignette (capture du terminal pour Amadeus), badge niveau, titre, 1 ligne de
   description, méta (`5 leçons · 3 h`), et soit la progression, soit le prix.
   **Hauteur de carte uniforme.**
4. **État vide** : jamais une page blanche — illustration sobre + « Aucune formation
   disponible pour le moment » + bouton.

Une seule formation ne doit pas occuper toute la largeur : garder la grille, la carte reste
à sa taille.

---

## 4. Page de formation `/app/cours/:slug`

1. **En-tête riche, deux colonnes** : à gauche fil d'Ariane, badge, titre, description, méta
   (durée, niveau, nombre de leçons), bouton principal (« S'inscrire » ou « Continuer ») ;
   à droite, **vignette ou terminal en aperçu**.
2. **« Ce que tu sauras faire »** : 4 à 6 puces en verbes d'action (« créer un dossier
   complet », « tarifer et émettre un billet »). C'est ce qui vend, avant le sommaire.
3. **Sommaire par module** : titre de module + progression du module, puis liste des leçons
   avec **icône par type** (texte, vidéo, PDF, fichier, live, terminal, quiz), durée, et
   état (fait ✓ / en cours / verrouillé). Les leçons gratuites sont marquées « Aperçu ».
4. **Encart formateur** en bas.

Le statut d'inscription n'est pas une ligne de texte perdue : c'est l'état du bouton
principal.

---

## 5. Lecteur de leçon `/app/cours/:slug/:lesson`

**Le contenu règne, le reste s'efface.**

- **Barre fine** : retour au cours, titre de la leçon, progression (« 3 / 12 »), bouton
  assistant (mission 25, inactif pour l'instant).
- **Sommaire latéral** repliable à gauche (masqué par défaut en mobile), leçon courante
  surlignée en accent.
- **Contenu centré, `max-width: 68ch`** pour le texte ; pleine largeur pour vidéo, PDF et
  terminal.
- **Barre d'action basse, fixe** : « Précédent » discret à gauche, « Marquer comme terminé
  et continuer » en accent à droite. Toujours au même endroit, sur toutes les leçons.
- **Fin de module** : écran de félicitation court (ce qui vient d'être acquis + ce qui
  suit). Finir sur une victoire, c'est ce qui fait revenir.

---

## 6. Mon compte / tableau de bord `/app/compte`

1. **« Reprendre »** en premier, toujours.
2. **Mes formations** : cartes avec progression.
3. **Ma progression** : acquis / à revoir (rempli par la mission 24 — prévoir la place).
4. **Mon profil** : e-mail, mot de passe, langue, suppression du compte.
5. **Ma licence** : clé, postes utilisés (mission 22 — prévoir la place).

---

## 7. Règles transverses

- **Aucune page vide à plus de 50 %.** Si une section n'a rien à montrer, elle propose une
  action — jamais du noir.
- **Un seul bouton accent par écran.**
- **Le terminal apparaît sur l'accueil, la connexion et les pages de formation.** C'est le
  fil conducteur visuel de toute la plateforme.
- **Jamais de texte d'interface en dur** : tout passe par le dictionnaire FR/EN.
- **Hiérarchie verticale constante** : titre → action principale → contenu → secondaire.
- Vérifier chaque écran à 1280 px **et** à 390 px avant de le considérer terminé.
