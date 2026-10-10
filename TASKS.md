# TASKS — Simulateur Amadeus GDS

> Tracker vivant exigé par `CLAUDE.md` §Méthode de travail (mis à jour à chaque session/mission).
> Classification des observations selon `CONSTITUTION.md` §5 : bug critique / incohérence
> fonctionnelle / amélioration recommandée / idée d'évolution.

## En cours

**Mission 23 (plateforme e-learning) — EN COURS, mode autonome (décision Massy 06/10/2026).**
Premier des trois chantiers restants (ordre choisi par Massy : 23 Plateforme → 22 Auto-licence
→ 21 Fidélité), 5-8 sessions estimées. Référence complète : `missions/MISSION-23.md` +
`docs/DESIGN-SYSTEM.md` (valeurs figées) + `docs/SECURITE.md` (exigences figées) +
`docs/DESIGN-PSYCHOLOGIE.md`/`docs/ETUDE-PLATEFORMES-ELEARNING.md` (le pourquoi). **Rien n'est
déployé en production** pendant tout le chantier (règle explicite du mode autonome) — la
production actuelle (simulateur + accès par clé) continue de fonctionner à l'identique.

**Étape 0, Étape 1, Étape 2 (espace étudiant), Étape 3 (navigation + simulateur intégré) et
Étape 4 (back-office formations) CLOSES** — Étape 2 reprise en entier le 08/10/2026 sur une
nouvelle direction artistique (« Nuit & aube », palette rejetée par Massy après maquette), puis
complétée le même jour par une passe « vivant » (images réelles, couleur, animation, double thème
clair) après le verdict de Massy sur la version en ligne, puis l'Étape 3 (même jour, retour Massy
sur la navigation + cœur de l'intégration simulateur/exercices), puis l'Étape 4 (09/10/2026,
back-office complet : créer/modifier/réordonner/publier formations-modules-leçons, upload R2,
vidéo/PDF/fichier/live, journal d'audit) ; voir les entrées datées ci-dessous pour le détail
complet des cinq passes.
**Reprise exacte pour la suite** : Étape 5 (clôture finale, bascule production — voir le rappel
ci-dessous). Rien d'autre en attente sur cette mission.
**🔴 Découverte du 11/10/2026, pendant la Phase 3 de l'Étape 5 : `ADMIN_SECRET_HASH` est
ABSENT des variables d'environnement du projet Pages** (constaté par Massy à l'écran, section
*Variables and secrets*, environnement Production — une seule ligne, `SESSION_SECRET`, qu'il
venait d'ajouter). Or `README.md` affirme depuis le 27/07/2026 : « `ADMIN_SECRET_HASH`
configuré », et le compte rendu de cette date présente la bascule production comme faite et
vérifiée. **La documentation était fausse.**
Conséquence probable, à confirmer : **la connexion `/admin` n'a jamais fonctionné en
production.** Elle n'a jamais été testée en ligne — l'épisode « Phrase secrète invalide » du
06/10/2026 était un test en local, et la vérification du 06/10 ne portait que sur
`/api/license/check`, qui n'utilise pas cette variable. Jusqu'au correctif du 10/10/2026, le
repli `|| ""` faisait que l'absence ne produisait aucune erreur visible — elle était donc
indétectable sans aller regarder le dashboard.
**À faire avant le déploiement** : Massy recalcule l'empreinte SHA-256 de la phrase secrète
(`D:\cowork\secrets-gds\admin-passphrase-production.txt`) et pose `ADMIN_SECRET_HASH` en
*Secret* sur **Production ET Preview**. Depuis le correctif, une absence fait échouer la
connexion admin franchement au lieu de passer en silence — c'est voulu, mais ça veut dire que
sans cette variable, `/admin` sera cassé dès la mise en ligne.
**Même classe d'erreur qu'en juillet** (`TASKS.md` disait la Mission 14 Étape 3 non faite alors
qu'elle l'était ; ici `README.md` dit une configuration faite alors qu'elle ne l'est pas) :
une affirmation écrite sans vérification sur le système réel. À la clôture, ne pas écrire
« configuré » sans l'avoir constaté à l'écran ou par une requête.

**Rappel production pour la clôture finale (Étape 5)** : quatre choses à faire une fois, qui
n'existent qu'en local pour l'instant — `SESSION_SECRET` (env var Cloudflare Pages, comme
`ADMIN_SECRET_HASH`), le binding R2 réel (`wrangler.jsonc` n'a volontairement PAS été modifié,
voir l'entrée Étape 2 ci-dessous) une fois le bucket créé, `migrations/0002_platform_users.sql`
**et** `migrations/0003_audit_log.sql` appliqués en `--remote` (dans cet ordre, après 0001).

**🔴 BUG CRITIQUE à corriger AVANT l'Étape 5 (trouvé par l'architecte le 09/10/2026, audit de
la session Étape 3+4) — `SESSION_SECRET` échoue en mode ouvert, silencieusement.**
Quatre appels écrivent `env.SESSION_SECRET || ""` : `functions/_lib/session.js` (l48, l71),
`functions/_lib/csrf.js` (l30), `functions/_lib/fileAccess.js` (l24, l31). Si la variable
d'environnement est absente, mal nommée, ou oubliée sur un environnement Cloudflare (preview
comme production), le repli n'est pas une erreur : c'est **la chaîne vide comme clé HMAC**.
Conséquence : jetons de session forgeables, jetons CSRF forgeables, liens de téléchargement
signés forgeables — par n'importe qui, puisque la clé est connue. Et le site a l'air de
fonctionner parfaitement : aucun log, aucune page d'erreur, aucun test rouge.
C'est exactement le scénario que l'Étape 5 rend possible, puisqu'elle consiste précisément à
configurer cette variable à la main pour la première fois.
Correction attendue, **en famille, pas un site d'appel à la fois** (`CONSTITUTION.md` §5) :
un helper unique qui lit le secret et **lève** si la valeur est absente ou trop courte, appelé
par les trois modules ; plus un test par module qui échoue avant la correction. Ne pas se
contenter de retirer les `|| ""` — un `undefined` passé à `importKey` doit échouer bruyamment
et tôt, pas au premier visiteur.
Vérifier au passage le même motif de repli silencieux sur `ADMIN_SECRET_HASH`.

**Mission 14 (espace admin + licences par poste) — CLOSE dans son ensemble, y compris l'Étape 3
(bascule production).** Architecture changée en cours de route par l'architecte (07/07/2026) :
Cloudflare D1 au lieu de Supabase — voir `missions/MISSION-14.md` §CHANGEMENT D'ARCHITECTURE.
L'Étape 3 (bascule production) a en réalité été faite et vérifiée le 28/07/2026 (commits
`ff6a652`, `40e8ed9`, `3b3398d`, `9430c9d` : `AccessGate.jsx` branché sur
`/api/license/activate`/`/api/license/check`, 2 bugs de déploiement corrigés, bug de trim sur la
phrase admin corrigé) — **cette section ne l'avait jamais enregistré**, ce qui a fait croire
pendant plus de 2 mois (jusqu'à l'audit de reprise du 05/10/2026) que l'Étape 3 restait à faire.
Reconfirmé vivant le 06/10/2026 après les 4 mois d'arrêt : l'architecte a vérifié que
`/api/license/check` répond bien en production. **Leçon tirée** : le rituel de clôture
(`missions/README.md` §Règles d'exécution point 3 : mettre à jour `TASKS.md`/`CLAUDE.md`/
`PROJECT_MEMORY` avant de considérer une étape terminée) n'avait pas été appliqué à la fin de la
session du 28/07/2026 — probablement parce que les commits de cette session-là corrigeaient des
bugs découverts après coup plutôt que de clore une étape planifiée à l'avance. À refaire
systématiquement même quand la session se termine sur des correctifs imprévus plutôt que sur le
plan initial.

**Mission 14 n'a plus aucun reliquat** : le seul qui restait (code mort
`verify-key.js`/`ACCESS_KEY_HASHES`/`VITE_FALLBACK_KEY_HASHES`, trouvé par l'audit du
05/10/2026) a été retiré le 06/10/2026 dans la même session — voir l'entrée datée ci-dessous pour
le détail complet (retrait du code mort, fix de la suite e2e admin, durcissement de
`admin/login.js`, `npm audit fix`).

**Reprise exacte** : Mission 08 (moteur d'exercices) est entièrement terminée (les 10 exercices
jouables de bout en bout, vérifiés en local ET en production). Aucune reprise en attente sur
cette mission. Prochaine mission après Mission 14 : **tranchée depuis — Mission 23 (ci-dessus),
puis 22, puis 21** (décision Massy 06/10/2026, voir `CLAUDE.md`) ; Mission 09
(quiz/notation/progression) devient Mission 24 dans cette nouvelle numérotation, Mission 10
(assistant IA) devient Mission 25 — les deux après Mission 23.

**Reprise exacte** : Partie A de Mission 07 est terminée côté code. La suite (Partie B) est une
checklist **opérationnelle pour Massy** (générer les clés, les configurer sur Cloudflare,
recruter 5-15 pilotes, consigner les retours dans `docs/PILOTE.md`) — pas une tâche Claude Code.
Prochaine session Claude Code : soit une correction de bug remontée par un pilote (boucle
corrective décrite dans `MISSION-07.md`, traiter immédiatement, protocole habituel), soit la
prochaine mission une fois le pilote conclu.

## À valider par Massy

> Section exigée par le mode autonome de Mission 23 (`missions/MISSION-23.md` §MODE AUTONOME,
> règle 2) : une question vraiment sans réponse dans `docs/DESIGN-SYSTEM.md`/`docs/SECURITE.md`
> est tranchée ici par la solution la plus simple et la plus réversible, consignée, et la session
> continue sans attendre. Rien ci-dessous ne bloque la suite — à revoir quand Massy a un moment.

- **Seuil de bascule menu mobile (Étape 0, 06/10/2026)** : DESIGN-SYSTEM §5 dit « navigation...
  en mobile, menu latéral coulissant » sans préciser à partir de quelle largeur. Choisi 768px
  (le point de rupture nommé « tablette ») plutôt que 640px : au-dessus de 768px, la nav
  horizontale a la place ; en dessous, le menu ☰. Un seul nombre à changer dans
  `apps/web/src/platform/styles/platform.css` (`@media (max-width: 767px)`) si Massy préfère
  640px.
- **Mécanique de confirmation du bouton danger (Étape 0, 06/10/2026)** : DESIGN-SYSTEM §5 exige
  une confirmation obligatoire sans dire comment. Choisi le plus simple et réversible : un
  deuxième clic sur le même bouton, qui change de libellé (« Supprimer » → « Confirmer la
  suppression ? »), pas une modale. Revenir à une modale plus tard ne changerait que l'intérieur
  de `apps/web/src/platform/ui/Button.jsx` (`variant="danger"` + `confirmLabel`), pas l'API vue
  par les futurs appelants (Étape 4, back-office).
- **Taille max d'un fichier téléversé depuis `/admin` (Étape 4, 09/10/2026)** :
  `docs/SECURITE.md` ne fixe aucune limite. Choisi 25 Mo (bon sens pour des PDF/fiches de cours —
  pas de vidéo, volontairement en URL externe, voir MISSION-23.md) ; un seul nombre à changer
  (`MAX_UPLOAD_BYTES`, `functions/api/admin/upload.js`) si Massy veut une autre valeur.

## Backlog

> Amélioration recommandée / idée d'évolution → ne pas implémenter sans validation explicite de
> Massy (CONSTITUTION §5). Bug critique / incohérence → à traiter en priorité dès qu'une mission
> les couvre.

- **Amélioration recommandée** : espacement fixe de 12ch après le `>` du prompt (`.prompt-gap`),
  vu dans la branche supprimée `ux/an-filter-and-class-selection`. Cosmétique, non implémenté —
  à valider avec Massy si jugé utile (pas indispensable à la fidélité Amadeus).
- **Amélioration recommandée** (trouvée en corrigeant le bug e2e admin du 06/10/2026) :
  `apps/web/playwright.config.js` (suite e2e principale) lance aussi `wrangler pages dev` sans
  `--persist-to`, donc sur le même D1 local persistant du dépôt entre deux runs — mais c'est
  volontaire et déjà documenté (`scripts/seed-e2e-test-license.sql` : licence fixture
  `GDS-TEST-0001` insérée de façon idempotente, palier école/4 postes choisi explicitement pour
  absorber la variance d'empreinte appareil entre runs/workers). Pas un bug : contrairement à la
  suite e2e admin, aucune collision de locator n'a jamais été observée ici. Isoler aussi cette
  suite avec un répertoire temporaire (même motif que l'admin et `functions/__tests__`) la
  rendrait plus cohérente avec le reste du projet, mais ce n'est qu'un confort de robustesse, pas
  une correction — à valider avec Massy avant de la traiter.
- **Observation mineure, non traitée** (vue en re-testant après le fix e2e admin du 06/10/2026) :
  `functions/__tests__/testServer.js` a occasionnellement échoué sur un `EPERM` Windows en
  nettoyant son répertoire D1 temporaire (`rmSync` dans `stop()`) alors que les 19 tests
  eux-mêmes passaient tous — probablement le process `wrangler` qui n'a pas encore relâché son
  verrou sur le fichier SQLite au moment du `rmSync`. Flaky, pas reproductible à volonté (repassé
  vert au 2ᵉ essai), aucun changement de code pour cette session. À creuser seulement si ça
  revient souvent en pratique (CI Linux non concerné — ce comportement de verrouillage de fichier
  est spécifique à Windows).
- **Bug critique confirmé, mission dédiée future (SS liste d'attente HL/UC)** : SS refuse
  purement la vente si la classe est à 0 siège ou si le nombre de pax dépasse le disponible.
  **Confirmé par Massy (05/07/2026, Mission 03)** : le vrai Amadeus met en liste d'attente
  (statut de segment `HL`/`UC`) au lieu de refuser. Le simulateur ne crée aujourd'hui que des
  segments statut `HK`. Chantier plus large qu'un wording : revoir la logique SS/statuts de
  segment, l'affichage RT des statuts HL/UC, probablement une commande de confirmation HL→HK.
  Détail dans `docs/ERREURS-AMADEUS.md`. Non traité dans Mission 03 (hors périmètre message).
- **Formulations encore à vérifier** (21 messages, sans urgence, aucun impact fonctionnel connu
  au-delà du texte affiché) : voir la table complète dans `docs/ERREURS-AMADEUS.md`.

---

## Historique

Les comptes rendus datés de toutes les sessions passées (ce qui était la section « Fait ») ont
été déplacés dans **`JOURNAL.md`** le 09/10/2026, sans rien perdre. Ce fichier-ci ne contient
plus que l'état courant — c'est voulu, et c'est ce qui le rend lisible au démarrage sans
repayer quinze sessions d'historique.

À consulter dans `JOURNAL.md` **seulement** pour une question précise sur le passé. À la
clôture d'une session, la nouvelle entrée datée s'écrit dans `JOURNAL.md`, et seule la section
« En cours » ci-dessus est mise à jour ici.
