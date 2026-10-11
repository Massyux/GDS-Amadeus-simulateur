# Prompt — 🔴 RÉGRESSION CRITIQUE : remettre d'aplomb TOUTE la navigation du site

> Priorité absolue. Avant `PROMPT-PASSE-ACCUEIL.md`, avant tout le reste.
> Constaté en production le 11/10/2026 par l'architecte, et par Massy avant lui.
> Ce n'est pas une correction ponctuelle : c'est une passe complète sur la navigation.

---

## Le symptôme

Sur `https://orionisacademy.com`, cliquer « Commencer » change l'URL en `/app` **mais l'écran
reste sur l'accueil**. Aucune erreur console. En tapant `/app` directement dans la barre
d'adresse, tout fonctionne. **Le site est un cul-de-sac depuis sa page d'entrée.**

## La cause, déjà identifiée — ne la cherche pas

`apps/web/src/main.jsx` lit `window.location.pathname` **une seule fois**, au chargement du
module, pour choisir `RootComponent` (HomePage / PlatformApp / AdminApp / App / StyleguidePage).
`platform/useRoute.js` → `navigate()` fait un `history.pushState` puis émet un `popstate`, mais
`main.jsx` n'écoute rien et ne réévalue jamais. L'URL change, le composant monté ne change pas.

## Ce qui est demandé — lis-le en entier avant de commencer

**Pas « corriger le bouton Commencer ». Toute la navigation du site doit fonctionner, partout,
dans les deux sens, et le rester.** Tu ne t'arrêtes pas à la première chose qui remarche.

### Étape 1 — Inventaire, avant toute correction

Dresse la liste **exhaustive** de tout ce qui navigue dans l'application, et écris-la dans ton
compte rendu. Rien ne doit manquer : accueil (barre de navigation, héros, cartes de formation,
pied de page, menu mobile), plateforme (connexion/inscription/mot de passe oublié, catalogue,
page formation, lecteur de leçon avec précédent/suivant, fil d'Ariane, « Mon compte »,
déconnexion), admin (trois onglets, déconnexion), simulateur (entrée, sortie d'une leçon,
retour), plus le sélecteur de langue et le bouton de thème s'ils touchent à l'URL.

Pour chacun : d'où il part, où il doit mener, et son état réel aujourd'hui.

### Étape 2 — Corriger la racine

Rends le choix de racine **réactif à la route** : `main.jsx` monte un composant qui s'abonne à
`popstate` et choisit la branche à chaque rendu, au lieu d'une constante calculée à l'import.

Contraintes à ne pas casser en chemin :

- **Chaque branche reste montée au premier niveau.** `Terminal.jsx` ne doit jamais se retrouver
  nesté dans `.platform-root` — la fuite de style est documentée dans `LessonSimulatorView.jsx`
  et c'est une règle absolue de Massy.
- **Le chargement à la demande par route reste en place** (chaque zone son chunk,
  `DESIGN-SYSTEM.md` §7). Ne réintroduis aucun import statique.
- `/admin`, `/styleguide`, `/simulateur` continuent de fonctionner à l'identique.

### Étape 3 — Les quatre cas que personne ne teste jamais

Ce sont eux qui font qu'un site paraît cassé même quand les liens marchent :

1. **Retour et suivant du navigateur.** Depuis n'importe où, vers n'importe où. Le retour doit
   ramener à l'écran précédent, pas à une page blanche ni à l'accueil.
2. **Rafraîchir (F5) sur une URL profonde** — `/app/cours/xxx`, `/app/compte`, une leçon. Vérifie
   que la redirection SPA de Cloudflare Pages est correctement configurée (`_redirects` /
   `_routes.json`). Rappel : une règle mal écrite a déjà produit « Parsed 0 valid redirect
   rules » et une boucle infinie sur ce projet. Vérifie le fichier réellement servi, pas le
   fichier source.
3. **Une URL qui n'existe pas** — `/app/nimportequoi`, `/xyz`. Il doit y avoir une page
   « introuvable » propre avec un retour vers l'accueil, pas un écran vide.
4. **Un lien partagé ou mis en favori** : coller une URL profonde dans un onglet neuf doit
   ouvrir la bonne page.

### Étape 4 — Tests

**C'est le vrai sujet, pas le correctif.** La suite e2e entre toujours par URL directe (`goto`),
jamais en cliquant depuis l'accueil. C'est pour ça qu'un site injouable est passé en production
avec toutes les suites vertes.

- **Un test par élément de l'inventaire de l'étape 1**, qui y arrive **en cliquant** depuis le
  parcours réel d'un visiteur, jamais par `goto`.
- Un test du retour navigateur, un du suivant, un du rafraîchissement sur URL profonde, un de
  l'URL inconnue.
- Ces tests restent dans la suite : ils sont le garde-fou qui empêche la rechute.

### Étape 5 — Vérification en production

Déploie, puis vérifie **en cliquant réellement** en production, à 1280 px et 390 px
(`docs/EXIGENCES-UX.md`). Taper une URL n'est pas une vérification : c'est précisément ce qui a
masqué le problème.

Parcours complet à prouver, sans jamais toucher la barre d'adresse : accueil → Commencer →
inscription → compte créé → catalogue → une formation → une leçon → retour navigateur → fil
d'Ariane → Mon compte → déconnexion → retour à l'accueil.

## Règles de session

- **Tu ne t'arrêtes pas au premier bouton qui remarche.** L'inventaire de l'étape 1 est la
  définition de « terminé » : chaque ligne doit être vérifiée.
- Tu ne laisses rien à moitié fait. Si la session se termine avant la fin, tu commites ce qui
  est vert et tu écris dans `TASKS.md` exactement quelles lignes de l'inventaire restent.
- Tu ne démarres pas `PROMPT-PASSE-ACCUEIL.md` tant que cette passe n'est pas close. Elle
  deviendra alors beaucoup plus simple, puisque ses chantiers 1 et 2 reposent dessus.
- Aucun processus `wrangler`/`workerd` laissé en vie en fin de session.

## Clôture

Rituel habituel : suites vertes, lint, typecheck, budgets de performance, **entrée datée en haut
de `JOURNAL.md`**, mise à jour de `TASKS.md` §En cours et de `CLAUDE.md`.

Consigne aussi la leçon, elle vaut pour la suite du projet : **une suite de tests qui entre
toujours par URL directe ne teste jamais la porte d'entrée.** Tout parcours que vit un visiteur
réel doit avoir au moins un test qui commence là où il commence, et qui clique.
