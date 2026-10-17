# Prompt — Fiche de formation, vitrine d'accueil, et accès sans taper d'URL

> Demande de Massy, 17/10/2026. Référence de mise en page fournie par lui :
> https://novasavo.com/courses (catalogue) et https://novasavo.com/course/gestion-des-stocks
> (fiche de cours), parcourues par l'architecte.
> À faire après la correction du terminal clair sur la page de démonstration.

---

## Le contexte

Le contenu de la formation « Amadeus — Niveau 1 » existe désormais :
`D:\cowork\formation-amadeus-n1\` — 16 leçons rédigées, 6 fiches de référence PDF, une
présentation. Massy va créer la formation depuis l'espace d'administration.

Mais trois choses manquent côté interface pour que ce contenu soit présentable.

## Chantier 1 — On ne tape plus jamais d'adresse à la main

Massy doit aujourd'hui écrire l'adresse de l'espace d'administration dans la barre du
navigateur. C'est pénible et ça ne passera pas à l'échelle.

- **Lien « Administration » discret dans le pied de page**, sur toutes les pages publiques.
  Discret, pas un bouton d'appel à l'action : un lien de pied de page, au même niveau que
  « Contact ».
- **Une fois la session d'administration ouverte**, un accès visible depuis la barre de
  navigation permet d'y revenir sans retaper quoi que ce soit.
- **Depuis l'espace d'administration**, un retour clair vers le site public.

Sécurité : exposer ce lien n'affaiblit rien — l'accès reste protégé par la phrase secrète,
avec limitation de débit et réponse neutre (`docs/SECURITE.md` §3). Ne l'indexe pas pour
autant : `noindex` sur ces pages.

**Règle d'écriture, valable partout dans l'interface** : on n'affiche jamais un chemin
technique comme libellé. Pas de « /admin » ni de « /demo » à l'écran. On écrit
**« Administration »**, **« Essayer le terminal »**, **« Mon compte »**. Les adresses
existent dans la barre du navigateur, pas dans les boutons. Vérifie l'ensemble de
l'interface et corrige partout où un chemin sert de texte visible.

## Chantier 2 — La fiche de formation

C'est le cœur de la demande. Aujourd'hui la page d'une formation est minimale ; elle doit
devenir une vraie page de présentation.

**Structure attendue**, inspirée de la référence, adaptée à la direction artistique
« nuit & aube » du projet — on s'inspire de l'agencement, on ne copie ni les couleurs ni
les formulations :

1. **Fil d'Ariane** — Accueil · Formations · nom de la formation.
2. **Bandeau de tête sombre** : catégorie, titre, description courte, et une ligne de
   repères — nombre de leçons, durée estimée, niveau, langue.
3. **Encadré d'inscription**, à droite, qui reste visible au défilement : visuel de la
   formation, prix ou mention « gratuit », bouton principal
   **« Commencer la formation »** (ou **« Reprendre »** si l'élève a déjà progressé), et un
   lien **« Voir tout le contenu »** qui déroule le sommaire.
4. **Ce que tu vas apprendre** — les objectifs, en liste à puces cochées.
5. **Le programme** — modules et leçons, avec pour chaque leçon son **type bien visible**
   (texte, PDF, fichier, vidéo, session en direct, simulateur, exercice) et sa durée. Les
   leçons gratuites portent une mention « aperçu gratuit » et sont ouvrables sans compte.
6. **Les documents de la formation** — section dédiée, **c'est une demande explicite de
   Massy** : chaque PDF présenté comme une vraie carte, avec son titre, une ligne de
   description, son poids, et un bouton de téléchargement. Pas une liste de liens bruts.
7. **Le simulateur** — un bloc à part, visuellement fort, qui donne accès au terminal.
   **Massy doit le trouver immédiatement sur la page, sans chercher.** Avec un mot sur ce
   qu'il est : un terminal d'entraînement fidèle, où rien n'est réel.
8. **Panneau « Caractéristiques »** à icônes : à ton rythme, nombre de leçons, dernière mise
   à jour, accès, compatible mobile, attestation en fin de parcours.
9. **Le formateur** — emplacement prévu, photo et présentation. Reste en attente tant que
   Massy n'a pas fourni la sienne : ne mets pas de photo générique.

Contraintes : `docs/DESIGN-SYSTEM.md` pour les jetons, `docs/EXIGENCES-UX.md` pour le reste,
rendu vérifié à 1280 px **et** 390 px. La mention de non-affiliation à Amadeus et l'absence
de valeur officielle de l'attestation restent présentes.

## Chantier 3 — Les formations en vitrine sur l'accueil

La page d'accueil affiche aujourd'hui des vignettes de formations **de démonstration,
écrites en dur**. Dès qu'une vraie formation est publiée, c'est elle qui doit apparaître.

- La section « Formations » de l'accueil se remplit depuis le **catalogue réel**
  (`/api/courses`), plus depuis des données écrites en dur.
- Chaque carte reprend la facture de la référence : visuel, catégorie, titre, deux ou trois
  objectifs, nombre de leçons. Un clic ouvre la fiche du chantier 2.
- **État vide honnête** : tant qu'aucune formation n'est publiée, la section ne montre pas
  de fausses vignettes. Elle affiche une invitation sobre — la démonstration du terminal
  reste accessible. Vérifié à l'instant en production : `/api/courses` renvoie
  `{"courses":[]}`, donc cet état vide **sera visible** et doit être soigné.
- Le catalogue complet garde la même facture de cartes que l'accueil.

## Ce que tu ne fais pas

- Pas de système de notation ni d'avis : il n'y a pas d'élèves, afficher des étoiles vides
  ou inventées serait malhonnête et se verrait.
- Pas de compteur d'étudiants tant qu'il n'y en a pas.
- Pas de copie des textes, couleurs ou visuels de la référence : c'est un repère
  d'agencement, rien d'autre.
- Pas de photo de formateur générique.
- Ne touche ni au moteur, ni aux exercices, ni au terminal.

## Vérification et clôture

En production, à 1280 px et 390 px, dans les deux thèmes : depuis l'accueil, atteindre la
fiche d'une formation, télécharger un PDF, ouvrir le simulateur depuis la fiche, et
rejoindre l'espace d'administration **sans jamais toucher à la barre d'adresse**.

Comme aucune formation n'est encore publiée, vérifie d'abord l'état vide, puis crée une
formation jetable depuis l'administration pour vérifier l'état rempli, et **supprime-la
ensuite** — Massy créera la vraie.

Rituel habituel : suites vertes, lint, typecheck, budgets de performance, entrée datée en
haut de `JOURNAL.md`, `TASKS.md` §En cours.
