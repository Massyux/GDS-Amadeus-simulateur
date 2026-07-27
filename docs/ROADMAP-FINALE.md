# Feuille de route jusqu'à la fin du projet

*État au 07/07/2026 — établi par l'architecte. Vue d'ensemble : ce qui reste, dans quel ordre,
et à quoi sert chaque mission. Détail exécutable dans `missions/`.*

## Déjà acquis (ne plus y revenir)

Simulateur GDS fidèle (268 tests) · 10 exercices auto-corrigés FR/EN · accès par clé ·
déployé en production sur Cloudflare Pages · coût d'exploitation : 0.

---

## RESTE À FAIRE — 5 missions jusqu'au produit complet

### 1. MISSION-14 — Espace admin + licences par poste  *(en cours)*
**But** : pouvoir vendre sans se faire pirater. Page `/admin` où Massy génère une clé en un
clic, voit qui l'utilise et sur combien d'appareils, révoque à distance. Une clé se lie aux
appareils selon son palier (individuel 1 poste / école 2-4 postes) : partagée au-delà, elle
cesse de fonctionner. Base Cloudflare D1, aucun nouveau compte.
**Durée** : 2-4 sessions. **Bloque** : toute vente large.

### 2. MISSION-09 — Quiz, notation, progression
**But** : transformer « 10 exercices » en « parcours de formation ». Score par exercice,
progression sauvegardée, quiz théoriques auto-corrigés (QCM sur les codes, séquences,
messages d'erreur), tableau de bord étudiant (ce qui est acquis / à revoir). C'est ce qui
justifie un prix de formation et non un prix de logiciel.
**Durée** : 2-3 sessions. **Dépend de** : 14 (comptes/licences pour rattacher la progression).

### 3. MISSION-07 — Lancement pilote  *(reporté à ta demande, à replacer ici)*
**But** : confronter le produit à 5-15 vrais étudiants. Analytics sans cookies, bouton
feedback, guide de démarrage. Puis recrutement, une clé par personne, retours consignés,
corrections. **C'est l'étape qui décide de tout le reste** : sans elle, les missions
suivantes se construisent sur des hypothèses.
**Durée** : 1 session technique + plusieurs semaines de terrain (toi).

### 4. MISSION-10 — Assistant IA pédagogique
**But** : l'étudiant bloqué demande de l'aide et reçoit une explication, pas la réponse.
Chat contextuel, infobulle au survol d'un code/segment/taxe, aide à la correction de syntaxe.
Différenciateur commercial fort (aucun simulateur concurrent ne l'a).
**Durée** : 2-3 sessions. **À détailler après le pilote** (les vraies questions des étudiants
définiront ce que l'assistant doit savoir faire).

### 5. MISSION-11 — Site de vente et écosystème commercial
**But** : vendre en autonomie. Vitrine (présentation, démo, tarifs), achat en ligne
(Chargily Pay pour CIB/EDAHABIA en Algérie), livraison automatique de la clé, espace client,
support, mises à jour. Domaine propre (~12 $/an) à ce moment-là.
**Durée** : 3-5 sessions. **Dernière étape** : c'est la fin du projet tel que défini.

---

## Reporté en v2 (documenté, rien n'est perdu)

**Commandes** : sièges SM/ST/SX (MISSION-18) · tarifs et billetterie avancés FQD/FQP/TST
complet/TRF (MISSION-20) · RT partiels · DO/DF/DNE/DB/DM · JI/JO (sign-in) · RH (historique)
· SP/EF (scission) · RRN/RRI/RRP (copie).
**Fonctionnalités** : mode « données réelles » via l'API Amadeus (MISSION-12) · espace
enseignant avec suivi de classe · version téléchargeable hors ligne.

Ces éléments reviendront selon ce que les utilisateurs réclameront — pas avant.

---

## Séquence recommandée

`14` → `07 (pilote)` → `09` → `10` → `11`

L'architecte recommande d'insérer le pilote juste après la 14 : dès que les licences
fonctionnent, tu peux distribuer proprement, et les retours orienteront 09, 10 et 11.
Décision de Massy : 14 puis 09 — le pilote s'intercalera quand il le jugera opportun.

**Horizon réaliste** : 10 à 15 sessions Claude Code pour le produit complet, hors temps de
terrain du pilote. Aucun coût d'infrastructure jusqu'à la mise en vente.
