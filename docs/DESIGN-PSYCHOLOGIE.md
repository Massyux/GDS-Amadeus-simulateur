# Design comportemental et psychologie de la plateforme

*Établi le 06/10/2026 par l'architecte. Complète `ETUDE-PLATEFORMES-ELEARNING.md` : celle-ci
dit **quoi** construire, celle-ci dit **comment le présenter** pour qu'on y croie, qu'on y
revienne et qu'on aille au bout. Sources en fin de document.*

---

## 0. Une correction d'objectif, avant tout le reste

Massy a demandé une plateforme où l'utilisateur « reste le maximum de temps ». C'est la
mesure des réseaux sociaux, et elle est **contre-productive pour une formation**.

Un étudiant qui maîtrise Amadeus en 20 h au lieu de 40 h est un **meilleur** résultat : il
réussit, il est fier, il le raconte, il envoie des amis. Un étudiant retenu artificiellement
est un étudiant qui finit par partir sans rien avoir appris.

Les bons objectifs, dans l'ordre :

1. **Il revient** (régularité, pas durée)
2. **Il progresse** (une compétence de plus à chaque session)
3. **Il termine** (c'est le témoignage qui vend les suivants)
4. **Il en parle** (le bouche-à-oreille fait 80 % des ventes sur ce marché)

Tout ce document sert ces quatre objectifs. « Ne pas s'ennuyer » en découle naturellement :
on ne s'ennuie pas quand on progresse visiblement.

---

## 1. Les 50 premières millisecondes : la crédibilité se joue avant la lecture

C'est le point le plus important de toute cette étude, et le plus souvent négligé.

- Un visiteur décide en **~50 millisecondes** si un site paraît crédible — **avant** d'avoir
  lu un mot.
- **75 % des gens jugent la crédibilité d'une entreprise sur le design de son site**, pas sur
  son contenu ni ses témoignages.
- **46 %** citent l'impression visuelle comme la **première** preuve de sérieux.

Pour un produit vendu à distance, en Algérie, dans un marché saturé de « formations »
douteuses, c'est vital : **ton étudiant cherche d'abord une raison de ne pas te faire
confiance.** Le design doit la lui retirer avant qu'il la formule.

Les quatre leviers identifiés par la recherche, par ordre d'impact :

| Levier | Ce que ça veut dire concrètement ici |
|---|---|
| **Images réelles, pas de banque d'images** | Captures réelles du terminal, photos réelles de Massy/de sessions. Zéro photo d'inconnus souriants en costume : c'est le signal n°1 de l'arnaque |
| **Typographie et espaces blancs** | Ils signalent l'ordre et le calme. Une page aérée inspire plus confiance qu'une page « riche » |
| **Harmonie des couleurs** | Une palette restreinte (3 couleurs max + neutres), appliquée partout |
| **Finition technique** | Pas de décalage au chargement, pas de logo pixelisé, pas de police qui change sous les yeux. Un site lent est jugé incompétent |

### L'esthétique à adopter — et celle à fuir

**À fuir absolument** : le style « info-produit » qui domine les publicités de formation —
dégradé violet/orange, grands titres en majuscules (« TRANSFORME TA VIE »), emojis flamme,
compte à rebours, photos de voitures, témoignages sans visage. En Algérie, ce vocabulaire
visuel est devenu **le signal de l'escroquerie**. L'adopter ferait fuir exactement les gens
sérieux que tu veux.

**À adopter** : une esthétique **technique et sobre**, cohérente avec le produit —
fond sombre, accents monospace qui rappellent le terminal, beaucoup de blanc, un accent
coloré unique, des captures d'écran réelles comme seule imagerie. Ça ne ressemble à aucun
concurrent, ça ressemble à un **outil professionnel**, et c'est précisément ce que tu vends.

---

## 2. Les signaux de légitimité (checklist)

Chaque case cochée retire une raison de douter :

- [ ] **Un visage et un nom réels** : qui enseigne, son parcours dans le tourisme. Une
      formation sans formateur identifié est suspecte.
- [ ] **Preuve visible du produit avant achat** : le terminal en démonstration sur la page
      d'accueil, et 1-2 exercices accessibles sans payer. Montrer bat promettre.
- [ ] **Prix affiché clairement**, sans « contactez-nous pour le tarif »
- [ ] **Contact réel** : e-mail, téléphone ou WhatsApp, et une réponse rapide
- [ ] **Conditions, remboursement, mentions légales** accessibles
- [ ] **Disclaimer de non-affiliation Amadeus** — paradoxalement, dire ce qu'on **n'est pas**
      augmente la confiance dans tout le reste
- [ ] **Témoignages avec prénom, photo et contexte** (« Yacine, agence à Oran ») — et jamais
      de faux, voir §5
- [ ] **Orthographe irréprochable** en français : une faute sur la page d'accueil coûte plus
      cher que trois fonctionnalités manquantes
- [ ] **HTTPS, chargement rapide, mobile impeccable** (déjà acquis techniquement)

---

## 3. Les trois besoins psychologiques (théorie de l'autodétermination)

La recherche sur l'engagement en formation en ligne converge sur trois besoins. Les
satisfaire transforme une motivation extérieure (« il faut que je trouve un emploi ») en
motivation intérieure (« j'ai envie de continuer »). C'est exactement ce qui fait qu'on
revient sans se forcer.

### Autonomie — « c'est moi qui décide »
- Laisser **choisir l'ordre** quand c'est pédagogiquement possible, plutôt qu'un couloir unique
- Permettre de **sauter une leçon déjà maîtrisée** (avec un test de validation)
- Objectif personnel que l'étudiant fixe lui-même (« 3 leçons par semaine »), pas imposé
- Mode libre du simulateur toujours accessible : jouer sans programme, c'est de l'autonomie

### Compétence — « je progresse vraiment »
C'est le besoin le plus puissant dans ton produit, parce que le simulateur le prouve
objectivement.
- **Retour immédiat** après chaque commande : le terminal le fait déjà, c'est un atout rare
- Difficulté croissante, bien calibrée : trop facile = ennui, trop dur = abandon (la zone
  entre les deux est ce qui crée l'état de concentration)
- Montrer le **chemin parcouru**, pas seulement ce qui reste : « tu maîtrises 12 commandes »
- **Badges liés à une compétence démontrée**, jamais au temps passé

### Appartenance — « je ne suis pas seul »
Le point faible de toute formation en ligne, et la cause n°1 d'abandon à 23 h un mardi.
- **L'assistant IA (mission 25) est la réponse principale** : quelqu'un répond, toujours
- Afficher une activité réelle et honnête (« 14 étudiants ont terminé ce module cette
  semaine ») — jamais un faux compteur
- Plus tard : groupe privé, sessions live, entraide entre étudiants

---

## 4. Les boucles qui font revenir (sans manipuler)

- **Reprise en un clic** : dès l'accueil, « Continuer : module 3, leçon 2 ». La friction
  entre l'envie et l'action est ce qui tue la régularité.
- **Progression toujours visible** : barre par module et par formation. Effet d'objectif
  gradué — plus on approche, plus on pousse.
- **Micro-séances de 5 à 10 minutes** : « j'ai 10 minutes » doit suffire pour avancer.
- **Série de jours (streak), mais bienveillante** : encourager la régularité sans punir.
  Une série perdue doit pouvoir être rattrapée — sinon elle devient une source de culpabilité
  et l'étudiant abandonne pour de bon.
- **Finir une session sur une victoire** : terminer un module sur un exercice réussi plutôt
  que sur un échec, c'est ce qui donne envie de rouvrir.
- **Relances utiles, pas harcelantes** : « ton module 3 t'attend » une fois par semaine, et
  un désabonnement en un clic.
- **Prochaine action toujours évidente** : jamais un écran sans bouton principal clair.

---

## 5. Ce qu'on ne fera jamais — et pourquoi c'est stratégique

Les « dark patterns » (faux compte à rebours, faux stock, faux témoignages, désabonnement
caché, culpabilisation au refus) augmentent les conversions à court terme et **détruisent la
confiance** dès qu'ils sont repérés.

Sur **ton** marché, c'est suicidaire : une niche étroite où tout le monde se connaît, où le
bouche-à-oreille fait l'essentiel des ventes. Un étudiant qui se sent manipulé le dira à toute
sa promotion. La réputation, ici, est le seul actif qui ne se rachète pas.

Interdits, sans exception : faux témoignages, fausse rareté, faux compteurs d'inscrits,
promesse d'embauche garantie, résiliation difficile, « certification officielle » (tu n'es
pas agréé — le dire est une force, le cacher est une bombe).

**La différence est simple** : le design éthique aide à comprendre ses options ; le design
trompeur cache, brouille ou force la décision. Tu peux être très persuasif en restant du
bon côté.

---

## 6. Traduction écran par écran

**Page d'accueil (visiteur).** Au-dessus de la ligne de flottaison : une phrase qui nomme la
douleur (« Refusé en agence parce que tu ne connais pas Amadeus ? »), **le terminal en
démonstration animée** (ta preuve, visuellement unique), un bouton principal unique
(« Essayer gratuitement »), et le visage + nom du formateur. Sous la ligne : à qui ça
s'adresse, ce qu'on apprend, le prix, les témoignages, le disclaimer.

**Catalogue.** Cartes de formation lisibles : titre, niveau, durée réelle, nombre de leçons,
prix, aperçu. Pas plus de 3 informations par carte.

**Page d'une formation.** Sommaire complet et visible **avant** l'achat (la transparence
vend), ce qu'on saura faire à la fin exprimé en actions concrètes, 1-2 leçons ouvertes.

**Lecteur de leçon.** Le contenu occupe l'écran, tout le reste s'efface. Progression discrète
en haut, « suivant » toujours au même endroit, accès à l'assistant à portée de main.

**Tableau de bord étudiant.** D'abord « Continuer », juste après. Puis acquis / à revoir,
puis les badges et l'attestation en cours.

---

## 7. Checklist de design à respecter partout

- Une seule action principale par écran
- 3 couleurs maximum + neutres, appliquées partout
- Deux polices : une lisible pour le texte, une monospace pour tout ce qui touche au terminal
- Contraste suffisant, taille de texte confortable, navigation au clavier possible
- Aucun texte sur une image de banque d'images
- Rien qui clignote, rien qui saute au chargement
- Chaque état d'erreur dit **quoi faire**, pas seulement ce qui s'est mal passé
- Chaque écran vide (« aucune formation encore ») propose une action, jamais un blanc

---

## Sources

- [Website First Impression: What 50 Milliseconds Decide](https://evelan.de/en/blog/website-first-impression-50-milliseconds)
- [75 % des consommateurs jugent la crédibilité d'une entreprise sur son site](https://www.madeforweb.co.uk/blog/75-of-consumers-judge-a-companys-credibility-by-its-website)
- [Website Design That Builds Trust](https://www.adroitte.com/blog/web-design/website-design-that-builds-trust-creating-digital-first-impressions/)
- [Applying Self-Determination Theory to student engagement in online learning](https://www.tandfonline.com/doi/full/10.1080/15391523.2021.1891998)
- [Enhancing online learning engagement: psychological needs satisfaction](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12217891/)
- [Duolingo learners' engagement: autonomy and motivation](https://link.springer.com/article/10.1007/s10212-026-01157-3)
- [A Scenario Analysis of Ethical Issues in Dark Patterns](https://arxiv.org/pdf/2503.01828)
- [Dark Pattern — définition et typologie](https://app.uxcel.com/glossary/dark-pattern)
