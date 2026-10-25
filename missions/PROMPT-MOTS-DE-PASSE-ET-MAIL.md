# Prompt — Durcir le stockage des mots de passe et brancher l'envoi d'e-mails réel

> Demande de Massy, 25/10/2026. Deux chantiers liés : la sécurité du stockage, et le
> « mot de passe oublié » qui doit enfin envoyer un vrai message.
> **Le chantier 1 doit être fait AVANT que des élèves créent leurs comptes** — la base n'en
> contient qu'un seul aujourd'hui, donc aucune migration. Cette fenêtre se referme au pilote.

---

## Chantier 1 — Le poivre sur les mots de passe

**Le contexte, déjà établi.** Le hachage est PBKDF2-HMAC-SHA256 avec sel aléatoire de 16 octets
par utilisateur, **plafonné à 100 000 itérations** — non par choix mais par limite dure de
l'implémentation WebCrypto des Workers Cloudflare (`docs/SECURITE.md` §1, constaté en production
le 11/10/2026). C'est six fois moins que la recommandation OWASP pour cet algorithme, et on ne
peut pas monter.

**Documenter une faiblesse n'est pas la compenser.** La compensation qui existe quand on ne peut
pas augmenter les itérations, c'est le poivre.

- Passer le mot de passe par un **HMAC-SHA256 avec un secret d'environnement** *avant* PBKDF2.
- Conséquence : une base volée ne suffit plus à casser les mots de passe hors ligne — il
  faudrait aussi ce secret, qui ne vit pas dans la base.
- Nouvelle variable d'environnement, par exemple `PASSWORD_PEPPER`, lue par `requireSecret()`
  comme les autres : **jamais de repli silencieux** (c'est exactement le motif corrigé le
  10/10/2026, ne le réintroduis pas).
- Le format stocké `algo$itérations$sel$hash` doit évoluer pour **indiquer qu'un poivre a été
  appliqué**, afin qu'une future rotation reste possible sans casser l'existant. Choisis la
  forme la plus simple et documente-la.
- **Migration** : il n'y a qu'un seul compte en base aujourd'hui. Vérifie-le avant de commencer.
  S'il y en a plusieurs, arrête-toi et dis-le — la stratégie changerait.

**Tant qu'on y est, le minimum de longueur.** Il est à 8 caractères (`validators.js`). Avec un
hachage bridé, c'est la longueur qui compense. Monte-le — 10 ou 12 — et justifie la valeur en
commentaire. Garde la liste des mots de passe courants.

Tests : un par chemin (inscription, connexion, réinitialisation), plus un qui vérifie qu'un
`PASSWORD_PEPPER` absent fait échouer bruyamment.

## Chantier 2 — L'envoi d'e-mails réel

**Ce qui existe déjà et ne doit pas changer** : tout le circuit « mot de passe oublié » est en
place et testé — génération du jeton, hachage, expiration, table `password_resets`, page de
réinitialisation, réponse neutre anti-énumération. `functions/_lib/mailer.js` est un point
d'accroche délibéré : **`sendMail` est un no-op, et c'est le seul fichier à remplir.** Aucun
appelant ne doit changer.

**Fournisseur retenu : Brevo** (décision de l'architecte, 25/10/2026). 300 e-mails par jour en
offre gratuite, sans plafond mensuel, et il couvre aussi le marketing automatique dont Massy
aura besoin plus tard — un seul compte au lieu de deux. Resend était l'alternative, écartée pour
son plafond de 100 par jour.

À faire :

- Implémenter `sendMail({ to, subject, text })` via l'API transactionnelle de Brevo. Garde la
  signature actuelle — élargis-la seulement si un corps HTML est nécessaire, et dans ce cas
  conserve une version texte.
- **Clé d'API** en variable d'environnement (`BREVO_API_KEY`), lue par `requireSecret()`.
  Massy la posera lui-même sur Cloudflare Pages, Production **et** Preview. **Tu ne la vois
  jamais, tu ne l'écris jamais dans un fichier.**
- **Expéditeur** : `contact@orionisacademy.com`. L'adresse existe et est déjà routée.
- **Échec d'envoi** : il ne doit jamais faire fuiter l'existence d'un compte ni casser la
  réponse neutre. Mais il ne doit pas non plus disparaître en silence — c'est exactement le
  motif qui a caché le plafond PBKDF2 pendant des semaines. Journalise proprement, réponds
  normalement.
- `MAIL_DEV_ECHO` reste tel quel pour les tests : ne le supprime pas, et **vérifie qu'il ne
  peut jamais être actif en production**.

**Le message lui-même.** Rédige-le simplement, en français, sans jargon : qui écrit, pourquoi,
le lien, sa durée de validité, et quoi faire si l'on n'a rien demandé. Signature
« Orionis Academy — Formation aux métiers du voyage ». Prévois l'anglais si le compte est en
anglais, le dictionnaire existe.

## Ce que tu ne fais pas

- Pas de Mission 22 : ni paiement, ni envoi automatique de clé de licence. L'infrastructure
  d'envoi que tu poses ici servira, mais ne commence pas le reste.
- Pas de refonte du circuit de réinitialisation : il fonctionne.
- Pas de bibliothèque d'e-mail lourde : un appel HTTP suffit depuis un Worker.

## Avant de pouvoir finir — ce qui dépend de Massy

Le chantier 1 est entièrement de ton ressort. Le chantier 2 a besoin de trois choses que lui
seul peut faire : créer le compte Brevo, **vérifier le domaine** `orionisacademy.com` par des
enregistrements DNS, et poser `BREVO_API_KEY` et `PASSWORD_PEPPER` sur Cloudflare.

Donc : **fais le chantier 1 en entier, puis écris le chantier 2 au complet**, et arrête-toi
avant la vérification en production. Dis clairement ce qui te manque. On terminera quand Massy
aura fait sa part.

## Vérification et clôture

Chantier 1 : suites vertes, et un vrai cycle inscription → déconnexion → connexion sur un
compte neuf.
Chantier 2 : testable seulement avec `MAIL_DEV_ECHO` tant que la clé n'existe pas. La preuve
réelle sera un courriel reçu dans la boîte de Massy, à faire avec lui.

Rituel habituel : lint, typecheck, entrée datée en haut de `JOURNAL.md`, `TASKS.md` §En cours,
et mise à jour de `docs/SECURITE.md` §1 — le poivre y a sa place, à côté de la note sur le
plafond d'itérations.
