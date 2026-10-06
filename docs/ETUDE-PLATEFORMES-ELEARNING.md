# Étude de marché — plateformes e-learning & formation tourisme

*Établie le 06/10/2026 par l'architecte, à la demande de Massy, pour cadrer la MISSION-23.
Sources en fin de document. Objectif : savoir ce qu'une plateforme doit comporter pour être
crédible, et où se situe notre différence.*

---

## 1. Le paysage

**Plateformes généralistes (le standard que les gens connaissent)**
- **Thinkific** — la plus flexible en structure de cours : chapitres, diffusion progressive,
  leçons avec prérequis, quiz à logique conditionnelle, devoirs, examens, certifications.
  Lecteur étudiant propre et personnalisable.
- **Teachable** — le lecteur jugé le plus intuitif, et le tunnel d'achat qui convertit le
  mieux dans les tests comparatifs.
- **Kajabi** — tout-en-un marketing (emails, tunnels, communauté), et **le seul à proposer
  une fonction live native** sans passer par Zoom. ~143 $/mois.
- **LearnWorlds** — orienté expérience d'apprentissage interactive.

**Plateformes du tourisme / GDS (nos vrais concurrents de contenu)**
- **IATA** — cours « GDS Fares & Ticketing Amadeus », 60 h en auto-formation, avec
  **environnement simulé** pour saisir de vraies entrées GDS, récupérer des dossiers, émettre
  des billets. Certification reconnue mondialement.
- **Amadeus Learning Universe** — cours officiels, e-learning et en présentiel.
- **TRAVEXS** — 45 h, technologie de simulation Amadeus propriétaire, scénarios réels.
- **Online Travel Training**, **Udemy** (cours Amadeus à ~20-50 €) — l'entrée de gamme.

**Lecture stratégique.** Les généralistes ont l'outil mais aucun contenu métier. Les
spécialistes ont le contenu mais sont chers, lents à obtenir, et souvent réservés aux
structures agréées. **Personne n'occupe le créneau « simulateur réel + auto-correction +
prix accessible + français/arabe »** — c'est exactement notre position.

---

## 2. Ce qui fait qu'un étudiant termine (données du marché)

C'est le vrai sujet : la plupart des formations en ligne ne sont jamais terminées.

- **Modules courts de 5 à 10 minutes** : meilleure rétention et meilleure complétion que les
  longs cours magistraux. Découper, toujours.
- **Mobile** : 67 % des apprenants utilisent leur téléphone ; les plateformes conçues
  mobile-first atteignent des taux de complétion bien supérieurs.
- **Gamification liée au résultat** : +40 à 60 % de complétion quand elle est bien faite.
  Règle citée partout : **récompenser une compétence démontrée, pas une case cochée.**
- **Progression visible en permanence** : barre d'avancement, « il te reste 3 leçons »,
  prochaine action évidente.
- **Friction minimale entre la connexion et l'apprentissage** : l'étudiant doit reprendre
  là où il s'est arrêté en un clic.
- **Réussites partageables** (attestation, badge) : statut social = motivation durable, et
  publicité gratuite quand l'étudiant la partage.

### ⚠️ La tension à trancher : mobile vs terminal

Un terminal GDS se pilote au clavier — il est **inutilisable sérieusement sur téléphone**.
Mais 67 % des gens apprennent sur mobile. Proposition d'architecture, à valider par Massy :

> **« Apprends sur mobile, entraîne-toi sur ordinateur. »**
> Théorie, vidéos, PDF, quiz, fiches mémo, progression : parfaits sur téléphone.
> Simulateur et exercices : optimisés ordinateur, avec sur mobile un message clair
> (« cette leçon demande un clavier — reprends-la sur ordinateur ») plutôt qu'une
> expérience dégradée et frustrante.

C'est plus honnête qu'un faux responsive, et ça devient même un argument : *ça se pratique
comme en agence*.

---

## 3. Ce que la plateforme doit comporter

### Indispensable (sans ça, elle n'est pas crédible)
| Besoin | Pourquoi |
|---|---|
| Catalogue de formations + page de cours (sommaire, durée, niveau, prix) | Premier contact, c'est ce qui vend |
| Lecteur de leçon avec navigation précédent/suivant et **reprise automatique** | La friction tue la complétion |
| Barre de progression par module et par formation | Le levier n°1 cité partout |
| Contenus mixtes : texte, vidéo, PDF, fichiers, live, exercices, quiz | Une plateforme mono-format ne sert qu'une formation |
| Espace étudiant : mes formations, ma progression, mes documents | C'est « chez lui » |
| Back-office sans code | Massy doit créer une formation seul, sinon il dépend d'un développeur à vie |
| Attestation nominative téléchargeable | Besoin psychologique fort, et publicité gratuite |
| Mobile impeccable sur tout sauf le terminal | 67 % des apprenants |

### Fortement recommandé (le niveau « pro »)
- **Diffusion progressive** (drip) : ouvrir le module 2 après le module 1 — évite l'abandon
  par noyade et valorise l'abonnement.
- **Prérequis entre leçons** : on ne tarifie pas avant de savoir réserver.
- **Reprise visible** : « Continuer : module 3, leçon 2 » dès la page d'accueil.
- **Quiz à correction immédiate avec explication** (mission 24).
- **Badges liés à une compétence démontrée** — pas au temps passé.
- **Notes personnelles** de l'étudiant sur une leçon.
- **Recherche** dans le contenu (indispensable passé 3 formations).

### Plus tard, sans regret
Communauté/forum, parrainage, abonnement mensuel multi-formations, espace enseignant
multi-formateurs, application mobile native, sous-titres automatiques.

---

## 4. Technique — ce qui compte vraiment

- **Vitesse d'ouverture d'une leçon.** Une plateforme lente est jugée amateur en 3 secondes.
  Notre stack (Cloudflare en périphérie) est un avantage réel, surtout depuis l'Algérie.
- **Reprise d'état fiable** : la progression doit survivre à une déconnexion, un changement
  d'appareil, un navigateur fermé brutalement.
- **Protection du contenu payant** : liens signés à durée limitée pour PDF et documents.
  Sans ça, un seul étudiant peut diffuser toute la formation sur WhatsApp.
- **Vidéo non hébergée** : intégration YouTube/Vimeo non répertorié. Héberger de la vidéo
  serait le premier poste de coût réel du projet.
- **Live via lien externe** (Zoom/Meet) + date + export agenda `.ics`. Kajabi est le seul
  à avoir du live natif, et c'est son produit à 143 $/mois — ce n'est pas notre combat.
- **Accessibilité et lisibilité** : contraste, taille de texte, navigation clavier.
- **Mesure** : savoir quelle leçon fait abandonner les étudiants vaut plus que n'importe
  quelle fonctionnalité supplémentaire.

---

## 5. Notre originalité (à ne pas diluer)

Trois choses que **personne ne combine** sur ce marché :

1. **La pratique est le cœur, pas le supplément.** Chez tous les autres, le simulateur est
   un bonus derrière des heures de vidéo. Chez nous, l'étudiant tape une vraie commande dans
   un vrai moteur dès la leçon 3. La vidéo sert la pratique, pas l'inverse.
2. **La correction automatique par le moteur réel.** Le quiz « tape la commande » est corrigé
   par le simulateur lui-même, pas par une comparaison de texte. Aucun concurrent grand
   public ne fait ça.
3. **L'assistant qui explique sans résoudre** (mission 25). Un étudiant bloqué à 23 h reçoit
   une explication, pas un silence. C'est ce qui remplace le formateur absent — et c'est
   l'argument commercial le plus fort du produit.

**Conséquence de design** : la page d'une formation ne doit pas ressembler à une liste de
vidéos. Elle doit montrer **l'écran du terminal** dès le premier coup d'œil. C'est notre
preuve, elle est visuellement unique, et aucune capture de cours concurrent ne lui ressemble.

---

## 6. Ce qui entre dans quelle mission

- **MISSION-23** : catalogue, page de cours, lecteur, reprise, progression, 7 types de
  contenu, espace étudiant, back-office, attestation, mobile (sauf terminal).
- **MISSION-24** : quiz, notation, badges liés à la compétence, tableau de bord détaillé.
- **MISSION-25** : assistant IA.
- **À ajouter en cours de 23 si le temps le permet** : diffusion progressive, prérequis,
  notes personnelles, recherche.
- **Jamais sans décision de Massy** : communauté, abonnement, app native.

---

## Sources

- [Teachable vs Thinkific vs Kajabi 2026 — comparatif](https://www.courseplatformsreview.com/blog/teachable-vs-thinkific-vs-kajabi/)
- [LearnWorlds — comparatif des 4 plateformes](https://www.learnworlds.com/compare/learnworlds-vs-teachable-vs-thinkific-vs-kajabi/)
- [Best LMS Platforms 2026](https://toolradar.com/guides/best-lms-platforms)
- [IATA — GDS Fares & Ticketing Amadeus](https://www.iata.org/en/training/courses/fares-ticketing-amadeus/ttc005eben01/en/)
- [Amadeus Learning Universe](https://www.learn.amadeus.com/Courses-eLearning/item-3927784553-Altea-Reservation-and-Ticketing.en.htm)
- [TRAVEXS — formation Amadeus 45 h](https://training.travexs.com/en/course/amadeus-gds-training-course-45-hours-/29)
- [Online Travel Training — Amadeus](https://onlinetraveltraining.com/us/gds/providers/amadeus/)
- [LMS UX — concevoir une plateforme que les gens utilisent](https://www.lazarev.agency/articles/lms-ux)
- [Gamification LMS 2026 — impact sur la complétion](https://lmspedia.org/gamification-in-lms-the-complete-2026-guide/)
- [Plateformes d'apprentissage mobile 2026](https://www.5mins.ai/resources/blog/15-best-mobile-learning-platforms-in-2026)
