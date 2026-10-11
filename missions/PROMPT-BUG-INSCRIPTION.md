# Prompt — 🔴 BUG CRITIQUE : l'inscription échoue en silence et annonce un succès

> Priorité absolue, avant la passe « accueil » et avant toute autre chose.
> Diagnostic posé par l'architecte le 11/10/2026 à partir du symptôme remonté par Massy en
> production, puis par lecture de `functions/api/auth/register.js`, `functions/_lib/rateLimit.js`,
> `functions/_lib/validators.js`, `functions/api/auth/login.js` et
> `apps/web/src/platform/AuthScreen.jsx`.

---

**Symptôme en production** (Massy, 11/10/2026) : une personne crée un compte, « il ne se passe
rien », puis l'écran annonce *« Adresse e-mail ou mot de passe incorrect »*. Aucune inscription
n'aboutit.

## Le diagnostic — ne pas corriger le symptôme

`functions/api/auth/register.js` renvoie `{ok:true}` dans **trois situations incompatibles** :

| Situation | Session créée | Compte créé | Réponse |
|---|---|---|---|
| 1. inscription réussie | oui | oui | `{ok:true}` |
| 2. e-mail déjà pris (anti-énumération, voulu) | non | non (existant intact) | `{ok:true}` |
| 3. **limite de débit atteinte** | non | **non** | `{ok:true}` |

`AuthScreen.jsx` (`handleRegister`, l.43-62) traite 2 et 3 de façon identique : `me()` ne
renvoie pas d'utilisateur, donc `setMode("login")` + `setError(null)` — **bascule silencieuse
vers la connexion, sans aucun message**. C'est le « il ne se passe rien ».

La personne retape alors son mot de passe sur ce qu'elle croit être encore l'inscription et
reçoit `INVALID_CREDENTIALS` (`login.js` l.13) — **parce que dans le cas 3 le compte n'a jamais
été créé**.

**Le cas 3 est le vrai coupable** : `checkRateLimit` est à 5 tentatives / 15 min par IP
(`rateLimit.js`, `DEFAULT_MAX_ATTEMPTS`), et `clientIp()` lit `CF-Connecting-IP`. Massy qui
teste plusieurs fois épuise le quota à lui seul ; et en Algérie plusieurs personnes derrière le
même NAT opérateur partagent une IP — au 6ᵉ essai, tout le monde est bloqué, en silence, avec
un faux message de succès.

**Contradiction interne à relever** : `rateLimit.js` l.61-65 énonce que la réponse en cas de
dépassement doit être « la même réponse d'**échec** que pour un mot de passe erroné ou une clé
inconnue ». `register.js` renvoie un **succès**. L'implémentation contredit la règle écrite dans
son propre fichier voisin. `docs/SECURITE.md` §3 dit « neutre » au sens de *indiscernable d'un
échec*, jamais *déguisé en succès*.

## Correction attendue — la famille entière, pas la ligne

`CONSTITUTION.md` §5 : traite les trois cas ensemble, et vérifie le même motif partout ailleurs.

**1. Le dépassement de quota ne doit plus être un succès.** À l'inscription, renvoie la même
réponse d'échec générique que les autres erreurs (`{ok:false, error: "Une erreur est survenue,
réessaie."}`), même forme, même délai minimal, sans jamais nommer la limite. Ça respecte §3
(rien n'est révélé) **et** ça cesse de mentir à l'utilisateur.

**2. Le cas « e-mail déjà pris » doit avoir un message, pas une bascule muette.**
L'anti-énumération reste — ne la supprime pas, elle est légitime et documentée. Mais formule-la
de façon conditionnelle, ce qui ne révèle rien : « Si un compte existe déjà avec cette adresse,
connecte-toi ou utilise *mot de passe oublié*. » Affiche-la **à la place** du basculement
silencieux, ou avec lui, mais jamais un changement d'écran sans explication.

**3. Revois le quota d'inscription.** 5 / 15 min / IP est trop serré pour une audience
largement derrière des NAT opérateur. Propose une valeur adaptée à l'inscription (plus permissive
que la connexion, qui peut rester stricte), justifie-la en commentaire, et rends-la lisible au
même endroit que les autres constantes. Ne supprime pas la limite.

**4. Cherche le même motif ailleurs** : toute route qui renvoie un succès alors qu'elle n'a rien
fait — `forgot-password.js`, `license/activate`, et toute autre où `checkRateLimit` est consulté.
Traite ce que tu trouves dans le même mouvement.

## Tests

Non négociable (`CONSTITUTION.md` : pas de correction sans test) — un test par cas, qui échoue
avant la correction :

- inscription normale → compte créé **et** session ouverte ;
- e-mail déjà pris → aucun compte touché, aucune session, **et un message affiché** ;
- quota dépassé → réponse d'**échec** générique, aucun compte créé, et l'écran ne prétend pas
  le contraire ;
- côté interface : vérifier qu'aucun chemin ne laisse l'utilisateur devant un écran changé sans
  message.

## Après la correction

Déploiement en production, puis **vérification par l'usage avec une vraie adresse e-mail
jamais utilisée**, depuis un navigateur neuf. Le symptôme a été constaté en production : la
correction doit y être prouvée, pas seulement en local.

Puis clôture habituelle : entrée datée en haut de `JOURNAL.md`, `TASKS.md` §En cours,
`CLAUDE.md` si une règle change.

## Note de fond, à consigner

Ce bug vient d'une protection de sécurité correcte à laquelle personne n'a écrit son histoire
côté utilisateur. La règle à retenir, et à appliquer aux prochaines : **une réponse neutre doit
rester compréhensible pour la personne honnête.** Neutre vis-à-vis d'un attaquant ne veut pas
dire muet vis-à-vis d'un client. Chaque fois qu'une route renvoie une réponse volontairement
indifférenciée, l'écran qui la reçoit doit savoir quoi dire.
