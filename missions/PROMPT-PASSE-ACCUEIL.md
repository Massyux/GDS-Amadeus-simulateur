# Prompt — Passe corrective « accueil » : démo du terminal, parcours d'entrée, pages légales, habillage admin

> À coller dans Claude Code **après la clôture de la Mission 23**, pas avant.
> Rédigé par l'architecte le 11/10/2026 après retour de Massy sur le site en production,
> et inspection directe de `HomePage.jsx`, `TerminalDemo.jsx`, `PlatformApp.jsx`, `AuthScreen.jsx`.

---

Passe corrective sur la page d'accueil et les parcours d'entrée. Quatre chantiers, **dans cet
ordre**, du plus coûteux commercialement au moins visible. Mode autonome pour les chantiers 2,
3 et 4 ; le chantier 1 a une décision produit déjà tranchée ci-dessous, applique-la telle quelle.

Classification des quatre constats (`CONSTITUTION.md` §5) : les trois premiers sont des
**incohérences fonctionnelles**, le quatrième une **amélioration recommandée**.

## Chantier 1 — Démonstration du terminal depuis l'accueil

**Le constat.** `TerminalDemo.jsx` rend le terminal du héros en `role="img"` : c'est une image
décorative. Un visiteur voit ce qui ressemble à un vrai logiciel, clique, et rien ne se passe.
Et il n'existe **aucun chemin depuis l'accueil vers le simulateur** — le bouton secondaire
renvoie vers l'ancre `#formations` de la même page. C'est le défaut le plus coûteux du site :
le produit est invisible à l'essai.

**La décision produit, prise par Massy le 11/10/2026 : démonstration limitée (option A).** Pas
d'accès libre complet — le terminal *est* le produit vendu, l'ouvrir entièrement supprime la
raison d'acheter. Pas de simple animation non plus — on veut que le visiteur tape lui-même.

**Spécification :**

- Nouvelle route **`/demo`**, sans compte et sans clé de licence.
- Elle monte le **vrai terminal et le vrai moteur** (`processCommand`), pas une imitation.
  ⚠️ **Le terminal existant ne doit pas changer d'un pixel ni d'un comportement**, ni en mode
  libre, ni en mode cours, ni derrière la clé de licence. Même exigence qu'en Mission 08 :
  test de non-régression obligatoire, et c'est le critère le plus important de ce chantier.
- **Fin de la démo** au premier des deux événements : un PNR enregistré avec succès (`ER`/`ET`),
  ou **15 commandes saisies**. Le choix du PNR comme borne est délibéré — le visiteur va au
  bout d'une réservation complète et comprend la valeur, au lieu d'être coupé au milieu.
- À la fin : **une carte par-dessus, pas un effacement.** Le visiteur doit continuer à voir ce
  qu'il vient de produire. Message : il vient de créer son premier PNR, la suite demande un
  compte. Bouton principal → **`/app/inscription`** (chantier 2).
- **Trois commandes d'exemple affichées au-dessus de la saisie**, cliquables pour les insérer.
  Sans ça, un visiteur qui ne connaît pas Amadeus ne tape rien et repart. C'est l'élément qui
  décide du succès de cette page, pas le comptage.
- Le compteur vit en `localStorage`. **Ce n'est pas un dispositif anti-fraude et il ne doit pas
  être présenté comme tel** : un visiteur qui vide son navigateur recommence, c'est accepté et
  sans conséquence. Documente-le pour que personne ne le « durcisse » plus tard.
- Le terminal du héros devient un **vrai élément actionnable** vers `/demo` : bouton accessible
  au clavier, focus visible, intitulé explicite — plus de `role="img"` sur quelque chose de
  cliquable. Ajoute en plus un bouton **« Essayer le terminal »** à côté de « Commencer », pour
  ceux qui ne devineront pas que l'image est cliquable.

## Chantier 2 — « Commencer » doit mener à l'inscription

`HomePage.jsx` envoie vers `/app` (trois endroits : lignes ~48, ~92, ~200). `PlatformApp.jsx`
y affiche `AuthScreen`, dont l'état interne `mode` vaut `"login"` par défaut. Un visiteur qui
clique « Commencer » tombe donc sur un écran de **connexion**, alors qu'il n'a pas de compte.

- Ajoute une route **`/app/inscription`** qui ouvre `AuthScreen` directement en mode
  `"register"` (passe le mode initial en prop plutôt que de dupliquer l'écran).
- Les boutons « Commencer » de l'accueil pointent dessus. Le lien « Connexion » de la barre de
  navigation continue de mener à l'écran de connexion : ne confonds pas les deux.

## Chantier 3 — Les trois liens morts du pied de page

`HomePage.jsx` lignes ~212 à ~218 : **Contact**, **Conditions** et **Remboursement** pointent
tous vers `href="#"`. Ils sont en production.

- **Contact** : tu peux le traiter complètement — `contact@orionisacademy.com` est une adresse
  réelle et active depuis le 09/10/2026 (Email Routing, redirigée vers la boîte de Massy).
- **Conditions de vente** et **Politique de remboursement** : **le contenu est à écrire par
  Massy**, pas par toi. Crée les pages et leur routage, avec un état d'attente explicite et
  visible, et inscris dans `TASKS.md` que ces deux pages **bloquent la Mission 22** : on
  n'encaisse pas un paiement sans conditions de vente ni politique de remboursement publiées.
  Ne rédige pas de texte juridique à leur place, même « provisoire » — un faux texte de loi
  est pire que l'absence.

## Chantier 4 — Habillage de `/admin`

L'espace admin date de la Mission 14 (juillet), avant `docs/DESIGN-SYSTEM.md`. Il détonne.

C'est le dernier de la liste **et c'est voulu** : Massy est le seul à le voir, il ne coûte
aucun client. Passe-le aux jetons de design existants — couleurs, typographie, espacements,
composants de base. **Ne le réécris pas**, ne refais pas sa structure, ne « modernise » pas ses
écrans : c'est un habillage, pas une refonte. Les trois onglets (Licences, Formations, Journal)
et leurs comportements restent identiques.

## Ce que tu ne fais pas

- Pas de refonte de l'accueil au passage : ces quatre chantiers, rien d'autre. Toute autre idée
  va dans `TASKS.md` §Backlog.
- Pas de texte juridique rédigé à la place de Massy.
- Pas de durcissement « anti-triche » de la démo.
- Rien qui modifie le terminal, le moteur ou les exercices existants.

## Clôture

Rituel habituel : suites vertes, lint, typecheck, budgets de performance, checklist sécurité,
**entrée datée en haut de `JOURNAL.md`**, mise à jour de `TASKS.md` §En cours et de `CLAUDE.md`.

Vérification par l'usage, en une seule session de navigateur à la fin, à **1280 px et 390 px**
(`docs/EXIGENCES-UX.md`) : un visiteur arrive sur l'accueil, clique le terminal, tape trois
commandes, va au bout d'un PNR, voit la carte de fin, clique « Créer mon compte », atterrit sur
l'inscription. Ce parcours complet est le critère d'acceptation de cette passe.
