# Prompt final — Mission 23, Étape 5 : feu vert, déploiement, vérification, clôture

> À coller tel quel dans Claude Code. Regroupe le feu vert du 🛑 STOP 4, les corrections de
> documentation, la vérification en production et le rituel de clôture.
> Architecte, 11/10/2026.

---

**Feu vert. Les deux secrets manquants sont posés.**

- `SESSION_SECRET` : en Secret sur **Production et Preview**.
- `ADMIN_SECRET_HASH` : il était **absent** du projet Pages. Massy a régénéré une phrase avec
  `scripts/generate-admin-secret.mjs` et posé la nouvelle empreinte en Secret sur les deux
  environnements. L'ancienne phrase est caduque.

Ton 🛑 STOP 4 est bien construit : les trois scénarios de panne sont justes, et tu as raison de
noter qu'un `SESSION_SECRET` manquant donnerait désormais une panne franche plutôt qu'une
faille muette — c'est exactement l'effet voulu par le correctif de la Phase 1.

## 1. Déployer

**`git push`.**

Puis surveille le déploiement Cloudflare **jusqu'à son terme** et montre-moi le résultat. S'il
échoue, **lis le log de build réel** avant de proposer quoi que ce soit — ne devine pas. C'est
ce qui avait débloqué les deux échecs de juillet.

## 2. Documenter, avant la vérification

**2.1 — Le bug `--file --remote`.** Ta trouvaille vaut largement la note : tu n'as pas
contourné en silence, tu as lu la source de wrangler et identifié que le POST `ingest` n'est
pas dans les méthodes auto-retryables d'undici. Consigne-le dans `TASKS.md` comme bizarrerie
d'environnement, avec le contournement `--command`, et précise qu'aucune instruction SQL n'a
été modifiée — seulement des commentaires de lignes entières retirés pour tenir sous la limite
de longueur de ligne Windows.

**2.2 — `README.md` est faux sur `ADMIN_SECRET_HASH`.** Il affirme depuis le 27/07/2026
« `ADMIN_SECRET_HASH` configuré » et présente les 4 étapes de mise en place comme « faites une
fois et à ne pas répéter ». C'était inexact, et personne ne l'a vu pendant trois mois parce que
le repli `|| ""` rendait l'absence silencieuse. Corrige : dis ce qui est **réellement**
configuré aujourd'hui, et à quelle date ça a été **constaté**, pas supposé.

**2.3 — Au même endroit**, documente que sur Cloudflare Pages une variable d'environnement ne
prend effet **qu'au déploiement suivant**.

## 3. Vérifier par l'usage, en production

Une seule session de pilotage de navigateur, à la fin, pour les critères d'acceptation. Pas
pour déboguer en cours de route : c'est ce poste de dépense qui a épuisé la limite hebdomadaire
la dernière fois, et un test écrit coûte mille fois moins cher.

- [ ] un élève crée un compte, suit des leçons, et sa progression persiste entre deux connexions
- [ ] une formation complète se crée depuis `/admin` : vidéo, PDF, fichier téléchargeable,
      session live
- [ ] un document payant n'est **pas** accessible par simple partage d'URL
- [ ] le terminal et les exercices sont **strictement inchangés**, en mode libre comme en mode
      cours — test obligatoire, comme en Mission 08
- [ ] l'accès par clé de licence existant fonctionne toujours (ne pas casser ce qui était déjà
      vendable)
- [ ] l'attestation se génère à 100 % de progression et porte bien sa mention de non-valeur
      officielle, **sur le document lui-même**
- [ ] **connexion réelle à `/admin` en production.** Jamais testée en ligne — c'est le point le
      plus important de cette liste. Massy tape la phrase, tu ne la vois pas.

## 4. Clôture

Rituel complet (`missions/README.md` §Règles d'exécution point 3) : suites vertes, lint,
typecheck, budgets de performance, checklist sécurité.

Puis : **entrée datée en haut de `JOURNAL.md`** (le compte rendu détaillé), mise à jour de
`TASKS.md` §En cours (état courant et reprise exacte **seulement**, jamais de compte rendu
daté) et de `CLAUDE.md`.

**Reprise exacte pour la suite : Mission 22** — paiement Chargily + création et envoi
automatique de la clé de licence par e-mail. Note-y le point bloquant connu : Cloudflare Email
Routing **reçoit** seulement ; l'envoi réel demandera Resend ou Brevo avec vérification
SPF/DKIM de `orionisacademy.com`. **Ne commence rien là-dessus dans cette session.**

## Rappel final

N'écris « configuré », « fait » ou « vérifié » que sur ce que tu as **constaté** — à l'écran,
par une requête, ou par un test qui tourne. C'est la deuxième fois sur ce projet qu'un document
affirme un état qui n'avait jamais été vérifié sur le système réel : `TASKS.md` en juillet,
`README.md` aujourd'hui. Dans les deux cas, personne n'a menti — quelqu'un a écrit « fait »
parce que ça allait de soi.
