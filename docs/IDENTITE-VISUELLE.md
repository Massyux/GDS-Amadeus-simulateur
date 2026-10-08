# Identité visuelle — direction validée

*Réécrit le 07/10/2026 après deux objections décisives de Massy. Maquette de référence
validée : `docs/maquettes/accueil.html` — **en cas de doute, c'est elle qui tranche.***

---

## Ce qui a été rejeté, et pourquoi (à ne pas reproduire)

Une première version proposait que **toute l'interface emprunte la grammaire d'un terminal
GDS** (états vides en réponses de terminal, statuts en codes `HK`/`UC`, sommaire formaté
comme un PNR). Massy l'a rejetée pour deux raisons, toutes deux justes :

1. **Risque juridique.** Reprendre les codes propres à Amadeus comme vocabulaire de
   l'interface générale s'approche de l'imitation d'identité commerciale. Ces codes restent
   **à l'intérieur du simulateur**, où ils sont fonctionnels et pédagogiques — jamais dans
   l'habillage du site.
2. **La plateforme n'est pas mono-formation.** Elle accueillera « Hôte d'accueil »,
   « Management d'agence », « Anglais professionnel »… Une coquille thématisée GDS les
   rendrait absurdes.

**Règle qui en découle :** la coquille est neutre, l'identité est portée par chaque formation.

---

## La direction retenue : « nuit & aube »

> Le vol de nuit vu du cockpit. Bleu nuit profond, cyan des instruments de bord, corail du
> lever de soleil. Moderne, chaleureux, technique — et reconnaissable sans emprunter à
> personne.

Ce qui crée l'identité, par ordre d'importance :

1. **L'atmosphère.** Halos lumineux flous en fond, grille fine estompée, barre de navigation
   en verre dépoli. C'est ce qui donne la profondeur et fait la différence avec un gabarit
   plat — pour zéro image et zéro requête réseau.
2. **Le terminal, héros de SA formation.** Il flotte doucement, entouré d'une lueur cyan,
   sur l'accueil et sur les pages de la formation « Réservation aérienne ». Il illustre une
   formation, **pas le site entier**.
3. **La typographie à deux voix.** Monospace pour ce qui est « système » (nom du produit,
   métadonnées, durées, chiffres, badges), sans-serif pour ce qui est « humain » (titres,
   contenu). La dualité machine/humain se lit en une seconde.
4. **Les chiffres tabulaires et les colonnes qui tombent droit.** C'est ce qui dit « outil
   professionnel » plutôt que « page de vente ».
5. **Les illustrations vectorielles par formation** — radar et trajectoire pour l'aérien,
   lever de soleil pour l'accueil, courbes de performance pour le management. Dessinées en
   SVG, aux couleurs de chaque formation. Elles remplacent les photos tant qu'il n'y en a
   pas de vraies.

---

## Les photos (à intégrer quand Massy les aura choisies)

Les vignettes SVG actuelles sont un **remplacement temporaire assumé**, pas une solution
définitive. À terme, de vraies photos (Unsplash ou Pexels, licence commerciale gratuite),
stockées dans R2, aux formats modernes et dimensionnées :

| Emplacement | Thème à chercher |
|---|---|
| Accueil | cockpit de nuit, instruments allumés · aile au-dessus des nuages au lever du soleil |
| Réservation aérienne | tableau des départs · mains sur un clavier de comptoir |
| Agent de voyage | conseiller face à un client, lumière chaude |
| Hôte & hôtesse d'accueil | accueil d'aéroport, uniforme, sourire naturel |
| Management d'agence | réunion d'équipe en petit comité |
| Formateur | **photo réelle de Massy** — obligatoire, aucune alternative |

Mots-clés utiles : `cockpit night`, `airport departure board`, `travel agency counter`,
`aviation sunrise wing`.

**Critère de choix, non négociable** : des photos qui ont l'air vraies. Un comptoir réel,
même imparfait, bat une mise en scène de studio — c'est le signal d'illégitimité n°1
identifié dans `DESIGN-PSYCHOLOGIE.md`.

---

## Interdits permanents

Photos de banque d'images posées · illustrations vectorielles « start-up » · dégradés
violet-orange de page de vente · ombres portées marquées · emojis dans l'interface · icônes
rondes colorées pour chaque type de contenu · majuscules sur plus de trois mots · tout code
propriétaire Amadeus utilisé comme élément d'interface.

---

## Test final

Montre une capture sans le nom. La personne doit pouvoir dire : **« c'est sérieux, c'est
moderne, et ça parle de voyage ou d'aviation »**. Si elle dit « c'est un site de formation
comme un autre », c'est raté.
