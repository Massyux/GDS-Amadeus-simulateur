
# Exigences de sécurité — plateforme de formation

*Figé le 06/10/2026 par l'architecte. Ce sont des **décisions**, pas des recommandations.
À appliquer dès la première ligne de la MISSION-23 : rajouter la sécurité après coup coûte
dix fois plus cher et laisse toujours des trous.*

Contexte : la plateforme hébergera des mots de passe, des données d'étudiants, des paiements
(mission 22) et du contenu payant. Une fuite tuerait la réputation du produit sur un marché
où tout le monde se connaît.

---

## 1. Mots de passe et comptes

- **Hachage PBKDF2-HMAC-SHA256**, **100 000 itérations** (plafond dur de l'implémentation
  WebCrypto des Workers Cloudflare -- `NotSupportedError` au-delà, constaté en production le
  11/10/2026 ; ce n'est pas un choix de compromis, c'est la limite de la plateforme cible), sel
  aléatoire de 16 octets par utilisateur, via Web Crypto (seul algorithme fort disponible
  nativement dans les Workers). Stocker `algo$iterations$sel$hash` pour pouvoir durcir plus tard
  sans casser l'existant -- mais jamais au-delà de ce plafond tant que Cloudflare ne le change
  pas, et jamais sans vérifier sur un vrai déploiement Workers (`wrangler pages dev` en local ne
  reproduit pas cette limite -- c'est précisément ce qui l'a caché 5 jours).
- **Jamais** de hachage côté navigateur, jamais de mot de passe en clair dans un journal,
  une URL ou un message d'erreur.
- Minimum 8 caractères, refus des mots de passe les plus courants (petite liste locale).
  Pas d'exigences absurdes (majuscule + chiffre + symbole) : la longueur prime.
- **Anti-énumération** : l'inscription, la connexion et le mot de passe oublié renvoient la
  **même réponse** que le compte existe ou non. Un attaquant ne doit pas pouvoir découvrir
  qui est inscrit.
- Réinitialisation : jeton aléatoire de 32 octets, **stocké haché**, usage unique, expiration
  30 minutes, invalidé après usage ou changement de mot de passe.

## 2. Sessions

- Jeton de session signé (HMAC, clé en variable d'environnement) transporté par un
  **cookie `HttpOnly` + `Secure` + `SameSite=Strict`**, jamais dans `localStorage`
  (un `localStorage` est lisible par n'importe quel script injecté).
- Durée 7 jours, prolongée à l'usage ; déconnexion = invalidation côté serveur.
- Changement de mot de passe = **toutes les autres sessions tombent**.
- Les rôles (`student`, `admin`) sont vérifiés **côté serveur à chaque requête**, jamais
  déduits d'un champ envoyé par le client.

## 3. Protection des requêtes

- **Limitation de débit** obligatoire sur : connexion (5 essais / 15 min / IP + compte),
  inscription, mot de passe oublié, activation de licence, API de l'assistant IA.
  Réponse neutre, avec un délai minimal constant pour ne pas trahir la cause.
- **Protection CSRF** sur toute requête qui modifie l'état (jeton par session, vérifié
  côté serveur) — nécessaire puisqu'on utilise des cookies.
- **Validation côté serveur systématique** : types, longueurs, valeurs autorisées. Le
  navigateur ne valide que pour le confort, jamais pour la sécurité.
- **Requêtes préparées uniquement** (`.bind()` de D1). Aucune concaténation SQL, jamais,
  même « juste pour un filtre d'admin ».

## 4. En-têtes HTTP (fichier `_headers`)

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:;
  frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com;
  script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none';
  base-uri 'self'; form-action 'self'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Toute exception à la CSP doit être justifiée en commentaire dans le fichier.

*Correction (Mission 23 Étape 2, 06/10/2026) : `frame-src` inclut `'self'`. Contrairement à
`default-src`, `frame-src` n'hérite jamais implicitement de la même origine quand il est défini
explicitement — sans `'self'`, le lecteur de leçon n'aurait jamais pu afficher un PDF dans un
`<iframe>` pointant vers sa propre API (`/api/files/download`). Trouvé et corrigé avant tout
déploiement, via un test e2e qui vérifie l'absence d'erreur CSP dans la console du navigateur.*

## 5. Contenu payant

- PDF et documents sur R2, servis **uniquement** par une Function qui vérifie la session et
  l'inscription au cours, via une **URL signée expirant en 10 minutes**.
- Aucune URL publique devinable. Le partage d'un lien ne doit rien ouvrir à un non-inscrit.
- Vidéos : YouTube/Vimeo en « non répertorié » — accepter que ce n'est pas une protection
  forte, et **ne pas y mettre le contenu le plus précieux**.

## 6. Secrets et configuration

- Tous les secrets en variables d'environnement Cloudflare, **jamais dans le dépôt**
  (le dépôt est public).
- `.gitignore` doit couvrir : `.dev.vars`, `keys/`, `*secret*`, `*.key`, `.env*`.
- Rotation possible sans redéploiement de code.
- Aucun secret ne doit jamais apparaître dans un message d'erreur renvoyé au client.

## 7. Administration

- `/admin` protégé par la phrase secrète existante + session admin séparée.
- **Journal d'audit** : qui a fait quoi et quand (création/révocation de licence, création
  de compte, modification de formation), consultable dans `/admin`.
- Les actions destructrices demandent une confirmation explicite et sont réversibles quand
  c'est possible (dépublier plutôt que supprimer).

## 8. Données personnelles

- Collecter le minimum : e-mail, prénom/nom, progression. **Pas** de date de naissance,
  d'adresse ni de pièce d'identité.
- L'étudiant peut exporter ses données et demander la suppression de son compte.
- Aucune donnée d'étudiant envoyée à un service tiers sans nécessité — en particulier,
  **ne jamais envoyer le nom ou l'e-mail d'un étudiant dans un appel à l'IA** (mission 25).

## 9. Vérifications à chaque fin d'étape

- [ ] `npm audit` sans vulnérabilité exploitable en production
- [ ] Aucun secret dans le bundle livré au navigateur (vérification automatisée)
- [ ] Un test prouve qu'un étudiant ne peut pas accéder au contenu d'un cours non acheté
- [ ] Un test prouve qu'un non-admin ne peut atteindre aucune route `/api/admin/*`
- [ ] Les en-têtes de sécurité sont bien servis en production
