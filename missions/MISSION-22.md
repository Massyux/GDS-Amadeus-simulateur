# MISSION 22 — Paiement et licence 100 % automatique

**Décision Massy 06/10/2026** : l'inscription se fait **après paiement** ; dès que le
paiement est confirmé, le compte et la clé sont créés et envoyés par e-mail **sans aucune
intervention manuelle**. Fini la génération de clés à la main.
**Pré-requis** : MISSION-23 (comptes étudiants) close. **Durée : 2-3 sessions.**

## ⚠️ Limite connue, à poser d'emblée

Massy n'a pas encore de nom de domaine (décision du 06/10 : contournement d'abord). Or
**aucun service d'e-mail transactionnel ne permet d'écrire à des tiers sans domaine
vérifié** — en mode test, l'envoi n'atteint que l'adresse du propriétaire du compte.

Conséquence : tout le circuit se construit et se teste maintenant, mais **le dernier maillon
(l'e-mail qui part vers un vrai étudiant) reste inactif tant qu'aucun domaine n'est acheté**.
Ne jamais présenter cette mission comme terminée sans rappeler ce point. Prévoir le
basculement « domaine vérifié » comme un simple changement de variable d'environnement, pas
comme une réécriture.

Filet de sécurité obligatoire pendant cette période : la clé doit **aussi** être affichée à
l'écran immédiatement après le paiement et consultable en permanence dans « Mon compte » —
un client qui a payé ne doit jamais se retrouver sans sa clé parce qu'un e-mail n'est pas
parti.

## Étapes

### Étape 1 — Paiement Chargily (CIB / EDAHABIA)
Compte Chargily à créer par Massy (demander ses clés API en début de session ; elles vont
en variables d'environnement Cloudflare, jamais dans le dépôt). Création d'un paiement,
redirection vers la page hébergée, page de retour succès/échec.
**Le webhook de confirmation est la seule source de vérité** — ne jamais débloquer un accès
sur la simple redirection du navigateur (contournable trivialement). Vérifier la signature
du webhook. Idempotence : un même paiement rejoué ne crée pas deux licences.

### Étape 2 — Création automatique compte + licence
À la réception du webhook confirmé : créer (ou retrouver) le compte avec l'e-mail du
payeur, générer la licence au palier acheté (individuel 1 poste / école 2-4), l'associer au
compte, l'enregistrer en D1. Tout en une transaction logique, journalisée.

### Étape 3 — Envoi de l'e-mail
Service transactionnel appelé depuis la Function (Resend ou équivalent compatible Workers).
Modèle d'e-mail FR/EN : bienvenue, clé, lien de connexion, rappel du nombre de postes,
contact. Échec d'envoi → journalisé et visible dans `/admin`, **jamais silencieux**, et
l'accès reste accordé (la clé est à l'écran).

### Étape 4 — Rendre l'ancien circuit manuel inutile
`/admin` affiche désormais les licences avec leur compte, leur paiement et le statut de
l'e-mail. La génération manuelle reste possible (cas pédagogique : offrir un accès, un
pilote, un partenaire) mais ne doit plus être le chemin normal.

## Critères d'acceptation
- [ ] Un paiement de test Chargily aboutit à : compte créé, licence créée, clé affichée à
      l'écran, e-mail envoyé (vers l'adresse de Massy tant qu'il n'y a pas de domaine)
- [ ] Zéro étape manuelle entre le paiement et l'accès
- [ ] Un webhook rejoué ne duplique rien ; une redirection falsifiée n'ouvre aucun accès
- [ ] Un échec d'e-mail est visible dans `/admin` et ne bloque pas le client
- [ ] Suites + CI vertes, production vérifiée, rituel de clôture, limite du domaine rappelée
