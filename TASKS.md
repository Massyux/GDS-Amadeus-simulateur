# TASKS — Simulateur Amadeus GDS

> Tracker vivant exigé par `CLAUDE.md` §Méthode de travail (mis à jour à chaque session/mission).
> Classification des observations selon `CONSTITUTION.md` §5 : bug critique / incohérence
> fonctionnelle / amélioration recommandée / idée d'évolution.

## En cours

**🟢 Données du simulateur élargies à la formation le 16/10/2026** (prompt architecte « Élargir
les données du simulateur pour qu'elles couvrent la formation », `missions/
PROMPT-DONNEES-SIMULATEUR.md`) : les fiches de référence enseignaient ~250 aéroports et
~100 compagnies, le simulateur n'en connaissait que 25 et 12 — un élève tapant un code appris en
cours obtenait une erreur. Décision de Massy : les fiches sont la référence, le simulateur
s'élargit. `apps/web/public/data/locations.json` passe de 28 à 226 entrées (+198), `airlines.json`
de 13 à 105 (+92) — **ajout pur, aucune entrée existante modifiée** (confirmé par `git diff` :
une seule ligne non additive, une virgule de syntaxe). Source : aucun fichier de données Python
trouvé dans `D:\cowork\formation-amadeus-n1\` (dossier de travail de l'architecte) — extraction
directe depuis les PDF `03-aeroports-algeriens`, `04-aeroports-du-monde`, `05-compagnies-
aeriennes`. **Noms de ville/pays anglicisés** (LONDON pas LONDRES, EGYPT pas ÉGYPTE, etc.) pour
matcher la convention déjà en place dans le fichier existant (Amadeus authentique reste en
anglais même si les fiches sont en français) — vérifié entrée par entrée contre les 16 entrées
déjà présentes avant cette passe. `LON` et `NYC` ajoutés en codes de ville (`type: "C"`), comme
`PAR` déjà existant, conformément à la mention explicite de la fiche 04 ; leurs aéroports
constitutifs (CDG/ORY/BVA, LHR/LGW/STN, JFK/EWR/LGA) restent `type: "A"`.
**Garde-fou permanent ajouté** : `apps/web/src/data/ficheCoverage.json` (photographie figée des
226+105 codes enseignés) + `apps/web/src/dataCoverage.test.js` — vérifie que chaque code des
fiches résout dans les données (pas de régression future si une entrée est supprimée par erreur),
que PAR/LON/NYC restent bien de type C et leurs aéroports de type A, qu'aucun code n'est dupliqué,
**et** rejoue réellement DAC/DAN/AN/DNA avec le vrai moteur (`packages/core` + `packages/data`,
même câblage que `Terminal.jsx`) sur les codes de vérification demandés (DAC DXB, DAN DUBAI,
AN15DECALGIST, AN15DECALGDXB, TMR/BSK/GHA, QR/EK/TK) plus deux nouveaux (CBH/Bechar, 6R/Tassili).
**Limite assumée** : ce test protège contre une régression future des DONNÉES, pas contre un ajout
futur dans une FICHE que personne n'aurait reporté ici — `ficheCoverage.json` doit être remis à
jour à la main le jour où une fiche change, sinon le test ne peut rien détecter (la fiche source
vit hors du dépôt, dans `D:\cowork\formation-amadeus-n1\`, jamais parsée automatiquement).
**Volume vérifié, pas de chargement différé nécessaire** : ces fichiers sont déjà chargés à la
demande (fetch asynchrone dans `packages/data`, déclenché au montage de `Terminal.jsx` — jamais
inclus dans le bundle JS). Poids brut `locations.json` 4 Ko→33 Ko, `airlines.json` 0,8 Ko→6,5 Ko ;
gzippé, environ 7 Ko au total pour les deux — négligeable pour un fetch unique non bloquant.
**🟢 Les deux écarts `TU`/`SV` corrigés le 17/10/2026**, après arbitrage de l'architecte (vérifié
à la source, pas une supposition) : `TU` portait le préfixe numérique `083` — **une vraie erreur**,
083 est le préfixe IATA de South African Airways (`SA`), pas de Tunisair, confirmé par la liste
des membres IATA et le fichier de la Chambre de compensation IATA (« TU-199 »), corrigé à `199`.
`SV` renommé de `SAUDI ARABIAN AIRLINES` à `SAUDIA` : la dénomination légale reste Saudi Arabian
Airlines, mais SAUDIA est la marque commerciale imprimée sur la fiche distribuée aux élèves —
la base s'aligne sur ce qu'un élève lit en cours, pas sur le nom légal. Les douze autres entrées
préexistantes (`AH`, `AF`, `TK`, `PC`, `AT`, `DL`, `AA`, `BA`, `LH`, `EK`, `QR`) ont été vérifiées
indépendamment par l'architecte et confirmées exactes — non revérifiées par Claude Code.
**Enseignement retenu, qui dépasse ces deux corrections** : `dataCoverage.test.js` ne vérifiait
jusqu'ici que la *présence* d'un code enseigné dans les données, jamais sa *valeur* — il n'aurait
jamais détecté `TU=083`, le code existait, avec un mauvais préfixe. **Étendu** : `ficheCoverage.json`
régénéré pour porter les valeurs complètes (ville+pays par aéroport, préfixe+nom par compagnie,
226+105 entrées, pas seulement une liste de codes) ; le test compare désormais champ par champ,
plus un test dédié qui rejoue `DNA TU` (doit afficher 199, jamais 083) et `DNA SV` (doit afficher
SAUDIA, jamais SAUDI ARABIAN AIRLINES) sur le vrai moteur. Non-régression : lint clean, 268/268
`packages/core`, 9/9 `packages/data`, 113/113 tests web (dont le nouveau test de régression
dédié), 59/59 e2e, 6/6 e2e-admin. **Vérifié en production après déploiement** : `DNA TU` et
`DNA SV`.
Non-régression complète de la passe initiale (16/10/2026) : lint clean, typecheck clean
(`packages/core`, `packages/exercises`), 59/59 e2e (dont les scénarios golden ALG→PAR de
`terminal.spec.js`, restés identiques), 6/6 e2e-admin. Vérifié en production après déploiement :
`DAC DXB`, `DAN DUBAI`, `AN15DECALGIST`, `AN15DECALGDXB`, `TMR`/`BSK`/`GHA`, `QR`/`EK`/`TK`.

**🟢 Constat architecte du 15/10/2026 : « l'accueil s'affiche en anglais sur un navigateur neuf
configuré en anglais » — investigué, non reproduit, deux vraies incohérences adjacentes
corrigées par prudence.** Diagnostic avant correctif (comme demandé) : recherche exhaustive
(`navigator.language`, `navigator.languages`, `Accept-Language`, `Intl.`) dans tout `apps/web/
src` et `functions/` — aucune détection de langue navigateur nulle part, `useLang.js` a
toujours défaulté inconditionnellement sur `"fr"` (seul commit de son histoire, Mission 06).
Reproduit en conditions réelles contre la production : `curl` avec `Accept-Language:
en-US,en;q=0.9` → HTML brut en français (`<html lang="fr">`, titre français, `cf-cache-status:
DYNAMIC`, aucune négociation de contenu côté edge) ; Playwright avec un contexte
`locale: "en-US"` complet (navigator.language, Intl, Accept-Language tous alignés) → accueil
rendu en français, `localStorage` vide. **Le bug tel que décrit ne se reproduit pas depuis un
état réellement neuf.** Explication la plus probable : un `localStorage` non réellement vierge
sur le navigateur de test (`simulateur-amadeus:lang=en` resté d'un essai précédent) ou la
traduction automatique du navigateur lui-même (Chrome) confondue avec le site. Pas d'action
corrective sur `useLang.js` au-delà de ce qui suit, puisqu'il n'y avait rien à retirer.
**Deux incohérences réelles trouvées en vérifiant la famille (comme demandé)**, corrigées :
(1) `<html lang>` restait figé à `"fr"` dans `index.html` et ne suivait jamais un choix explicite
d'anglais (incohérence SEO/accessibilité réelle, indépendante du bug rapporté) — `useLang.js`
synchronise désormais `document.documentElement.lang` à chaque changement, même motif que
`useTheme.js`/`data-theme`. (2) `og:locale` était absent de `index.html` — ajouté en `fr_FR`
(le document initial est toujours français) avec `og:locale:alternate` `en_US`. Attestation PDF
vérifiée à part : `functions/_lib/certificate.js` défaute déjà sur `lang = "fr"`, alimenté par le
même `useLang()` via `?lang=` — rien à corriger.
**Tests ajoutés** (`apps/web/e2e/language-default.spec.js`, garde-fou permanent même sans bug
actuel) : navigateur `locale: "en-US"` complet → accueil et `<html lang>` en français ; choix
explicite de l'anglais → respecté et mémorisé après un rechargement complet de la page.
Vérifié en production avec un vrai navigateur configuré en anglais (pas seulement en local).

**🟢 `PROMPT-PASSE-ACCUEIL.md` CLOS le 15/10/2026 — quatre chantiers faits, enchaînés en mode
autonome.** **Chantier 1 (démo du terminal)** : route `/demo`
(`apps/web/src/DemoTerminalPage.jsx`), vrai `Terminal.jsx` monté sans compte ni clé, jamais
modifié (vérifié par `git diff --stat` vide sur ce fichier et `packages/core` avant commit). Fin
au premier des deux événements (PNR enregistré ou 15 commandes), trois commandes d'exemple en
fenêtre glissante sur les 6 étapes d'un parcours complet, carte de fin en superposition.
**Chantier 2 (inscription directe)** : `/app/inscription` ouvre `AuthScreen` en mode `"register"`
; les trois boutons « Commencer »/« Essayer gratuitement » de l'accueil y mènent désormais, le
lien « Connexion » reste vers `/app`.
**Chantier 3 (pied de page, 15/10/2026)** : les trois liens étaient `href="#"` en production.
Contact → vraie adresse (`mailto:contact@orionisacademy.com`, active depuis le 09/10/2026).
Conditions/Remboursement → deux vraies routes (`/conditions`, `/remboursement`,
`apps/web/src/platform/LegalPendingPage.jsx`, nouveau) avec un état d'attente explicite et
visible — **aucun texte juridique écrit par Claude Code**, conformément à l'instruction
explicite de l'architecte (« un faux texte de loi est pire que l'absence »). Le texte réel
(conditions de vente, politique de remboursement) reste à écrire par Massy. **Ces deux pages
bloquent Mission 22** : on n'encaisse pas un paiement Chargily sans CGV ni politique de
remboursement publiées — à ne pas oublier au démarrage de cette mission.

**🟢 Textes juridiques intégrés le 16/10/2026** (`docs/legal/CONDITIONS-GENERALES-DE-VENTE.md`,
`docs/legal/POLITIQUE-DE-REMBOURSEMENT.md`, rédigés par Massy) : le contenu intégral est rendu
sur `/conditions` et `/remboursement` (titres, articles, tableau de prix, listes, citations —
`apps/web/src/platform/LegalMarkdown.jsx` + `legalMarkdown.js`, lus depuis les fichiers sources
via import `?raw`, jamais retranscrits à la main), **mais ces deux brouillons ne sont PAS
publiés** : les deux documents eux-mêmes portent `[À COMPLÉTER]` partout où seul le statut
d'entreprise de Massy fournira les mentions obligatoires de l'article 11 de la loi 18-05
(registre du commerce, identifiant fiscal, adresse, téléphone, prix TTC, prestataire de
paiement) — « des CGV affichant [À COMPLÉTER] sont pires qu'une page en préparation » (Massy).
**Un seul interrupteur contrôle l'affichage public** : `LEGAL_CONTENT_PUBLISHED` dans
`apps/web/src/platform/legalContentFlag.js`, à `false` aujourd'hui — tant qu'il l'est, le public
voit toujours l'état « en préparation » habituel, quel que soit l'avancement du contenu réel. Ne
pas le passer à `true` avant que les deux documents soient entièrement complétés **et** relus par
un avocat ou conseil juridique algérien.
**Nouvelle question de conformité à trancher par Massy avant Mission 22, auprès du CNRC ou d'un
avocat** (trouvée en intégrant le texte de l'Article 1 des CGV) : l'article 8 de la loi 18-05
subordonne l'exercice du commerce électronique à un site **hébergé en Algérie** avec une
extension **`.com.dz`** déposée auprès du CNRC — or `orionisacademy.com` est un `.com` hébergé
chez Cloudflare (hors d'Algérie). À vérifier et trancher avant d'encaisser le moindre paiement,
indépendamment de l'avancement de Mission 22 par ailleurs.
**Chantier 4 (habillage `/admin`, 15/10/2026)** : `apps/web/src/index.css` (bloc `.admin-*`,
~370 lignes), couleurs et police seulement — **structure et comportement inchangés**, confirmé
par les 6 tests `e2e-admin` (login, licences, formations) restés verts sans aucune modification.
Palette alignée sur `docs/DESIGN-SYSTEM.md` (`#0A1733`/`#1D7FB8`/`#1593A8`/`#F2F7FF`/`#FFFFFF`)
en valeurs **littérales**, pas `var(--...)` : `platform.css` scope délibérément ses variables à
`.platform-root`, qui ne couvre jamais `/admin` (confirmé par son propre commentaire d'en-tête) —
cette isolation volontaire est respectée, pas contournée. Police alignée sur la pile système du
design system (`--font-sans`), retirant les deux déclarations `"Courier New"` orphelines.
Couleurs de statut (erreur rouge, bannière succès verte) **laissées inchangées** : ce ne sont pas
des teintes de marque, hors périmètre d'un « habillage ».
**Non-régression** : lint clean, 90/90 tests unitaires web, 57/57 e2e (suite complète,
`legal.spec.js` nouveau inclus), 6/6 e2e-admin. **Non vérifié cette session** : la suite
`functions/__tests__` (3 fichiers, chacun avec son propre `wrangler pages dev` local) est restée
bloquée ~15 minutes sans sortie ni progression de process observable — tuée plutôt que laissée
tourner indéfiniment. Aucun rapport avec ce chantier (chantiers 3+4 ne touchent aucun fichier de
`functions/`) mais à rejouer isolément en début de prochaine session pour confirmer qu'il s'agit
d'un aléa et pas d'une régression silencieuse.
Vérification finale en production (1280/390px) : parcours complet par clic — accueil → terminal
du héros → 3 commandes d'exemple → PNR complet → carte de fin → « Créer mon compte » → atterrit
sur `/app/inscription` ; `/admin` (connexion + tableau de bord, nouvelle palette) ; `/conditions`
et `/remboursement` (état d'attente visible). Détail complet dans `JOURNAL.md`.

**🟢 Variante compacte du logo intégrée le 14/10/2026** (`PROMPT-LOGO-COMPACT.md`, insérée entre
les chantiers 1 et 2 ci-dessus comme demandé) : corrige le défaut de lisibilité d'ACADEMY en
barre de navigation constaté en production avec le grand format. `apps/web/src/brandLogo.js` —
seule source de vérité pour le choix de fichier (seuil de hauteur, thème), partagée par
`Brand.jsx` et `/admin` (qui utilisait jusqu'ici un chemin codé en dur, maintenant centralisé).
40px partout en barre de nav, repli CSS pur (`<picture>`, pas de mesure JS) vers l'emblème seul
sous 340px de large. Vérifié réellement en production par capture d'écran à taille réelle,
1280/390px, deux thèmes — ACADEMY lisible partout. CLS/LCP re-mesurés, aucune dégradation.
Détail complet (seuils, ratios, couleurs) dans `docs/IDENTITE-VISUELLE.md` et `JOURNAL.md`.

**🟢 Logo officiel Orionis Academy intégré le 12/10/2026.** Kit fourni par Massy (SVG, PNG,
favicons, image de partage) posé dans `apps/web/public/brand/` (pas R2, actif public du site).
`Brand.jsx` ne recompose plus le nom en HTML (interdit par le kit) — image théma­tique
(sombre/clair) via `useTheme()`, partout : nav plateforme, connexion/inscription, pied de page,
`/admin` (qui n'avait aucune marque jusqu'ici), et l'attestation PDF (logo embarqué en base64
dans `functions/_lib/certificateLogo.js`, variante transparente posée sur le fond NIGHT — un
Worker ne peut pas lire un fichier statique sur disque à l'exécution). Favicon et Open Graph
posés dans `index.html` (URL absolue réelle pour `og:image`).
**Conflit de palette résolu** : le kit (`--cyan` `#43C9D9`, `--coral` `#FC8C5E`) fait référence
— `docs/DESIGN-SYSTEM.md` s'aligne dessus (deux thèmes), pas l'inverse. Détail et contrastes
réellement mesurés (WCAG, pas une estimation) dans `DESIGN-SYSTEM.md` §2/§2 bis.
**Décision en attente de Massy** : le `LISEZ-MOI.md` du kit recommande Cormorant Garamond
(titres) + Inter (texte courant) pour toute l'interface — **non appliqué dans cette passe**,
c'est un changement de typographie générale du site, pas une pose de logo. Pour : cohérence
avec le logo (dont le texte est déjà vectorisé, donc pas bloqué par cette décision). Contre :
refonte typographique de toutes les pages, à revalider écran par écran avant d'y toucher.
**Amélioration recommandée, pas corrigée ici** : le contraste du dégradé `.pf-grad` (gros
titres, chiffres clés) en thème clair était déjà sous le seuil AA avant cette bascule de
palette (`--cyan`/`--coral` texte sur `--sky`) — pas une régression introduite par le logo,
mais à traiter si Massy le juge prioritaire.

**🟢 Régression critique résolue le 11/10/2026 : le site était un cul-de-sac depuis l'accueil
en production.** `apps/web/src/main.jsx` ne lisait `window.location.pathname` qu'une fois, à
l'import — `navigate()` changeait bien l'URL mais rien n'écoutait l'événement `popstate` au
sommet de l'app pour re-choisir quelle racine monter. Cliquer « Commencer » changeait l'URL vers
`/app` sans jamais afficher la plateforme. Détail complet (inventaire, cause, correctif,
vérification aux deux largeurs 1280/390px) dans `JOURNAL.md`.
Corrigé : `apps/web/src/Root.jsx` (nouveau, extrait de `main.jsx` pour satisfaire ESLint
`react-hooks/static-components`/`react-refresh/only-export-components`) s'abonne à `popstate`
et re-choisit la bonne branche à chaque rendu, via des `return` conditionnels directs (jamais une
variable de composant intermédiaire). `apps/web/src/platform/NotFoundPage.jsx` (nouveau) :
page « introuvable » propre, utilisée en racine ET par `PlatformApp.jsx` pour toute sous-route
`/app/*` inconnue (qui retombait avant en silence sur le catalogue). 13 nouveaux tests
(`apps/web/e2e/navigation.spec.js`) qui entrent par un clic depuis l'endroit réel où un visiteur
commence, jamais par `goto()` dans la zone testée — **leçon explicitement consignée pour la
suite du projet** : toute la suite e2e historique entrait par URL directe, donc ne testait
jamais la porte d'entrée du site, ce qui a laissé ce bug passer en production malgré des suites
100% vertes.
**Amélioration recommandée, pas un bug** (vérification demandée par l'architecte pendant cette
même passe) : aucun fichier `_redirects`/`_routes.json` n'existe. Cloudflare Pages sert déjà
`index.html` par défaut pour toute route profonde (confirmé réel : `/app`, `/admin`, etc.
répondent 404 mais avec le bon contenu SPA, pas une page d'erreur) — fonctionnellement correct,
mais le code HTTP est faux (mauvais pour le SEO/monitoring). Tenté avec la règle standard
Cloudflare (`/* /index.html 200`) : `wrangler` la détecte comme boucle infinie et l'ignore au
build (même famille d'incident que « Parsed 0 valid redirect rules », cette fois intercepté
avant déploiement) — fichier retiré plutôt que laissé avec une règle neutralisée. Corriger
proprement le code de statut demanderait un réglage `assets.not_found_handling` dans
`wrangler.jsonc`, explicitement écarté cette session (risque jugé disproportionné pour un
problème cosmétique, vu l'historique de ce fichier) — à reprendre si Massy le juge utile.

**🟢 Bug critique résolu le 11/10/2026 : aucune inscription n'a jamais réussi en production,
depuis le premier déploiement de Mission 23.** Deux bugs empilés — voir `JOURNAL.md` pour le
détail complet. (1) `register.js` renvoyait `{ok:true}` au-delà du quota d'inscription, lu par
le front comme un succès puis bascule muette vers la connexion — corrigé, quota relevé à
15/15min/IP, message conditionnel sur collision d'e-mail. (2) **Le vrai verrou, trouvé en
vérifiant (1) en production** : `functions/_lib/passwordHash.js` demandait 600 000 itérations
PBKDF2 — l'implémentation WebCrypto des **Workers Cloudflare** (jamais reproduite par les tests
locaux ni par `wrangler pages dev`) refuse tout au-delà de 100 000. Corrigé à 100 000 ;
`docs/SECURITE.md` §1 mis à jour en conséquence (l'exigence « ≥ 600 000 » était impossible sur
la cible réelle). Catch muets corrigés en famille (register/login/reset-password/
forgot-password/license-activate) pour ne plus jamais masquer une vraie exception derrière un
message neutre, sans aucune trace. **Vérifié réellement** : inscription + connexion avec un
compte jamais utilisé, en production, aboutissent désormais au catalogue — confirmé par une
requête D1 réelle (premier compte étudiant de l'histoire de la plateforme, `id:1`).
**Leçon à retenir pour toute future dépendance à Web Crypto dans `functions/`** : la plateforme
Workers a des limites qui ne se voient JAMAIS en local (ni `wrangler pages dev`, ni les tests
Node) — un comportement neuf touchant `crypto.subtle` doit être vérifié sur un vrai déploiement
avant d'être considéré fiable.

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
**Étape 5 (clôture finale, bascule production) EN GRANDE PARTIE CLOSE le 11/10/2026** — voir le
détail Phases 1-4 ci-dessous (toutes faites et vérifiées : correctif sécurité, attestation PDF,
bucket R2 + migrations + secrets en production, déploiement). **Reste un point avant de
considérer la mission entièrement close** : la Phase 5 (vérification par l'usage réel en
production, checklist complète de `missions/MISSION-23.md`) n'a pu être menée qu'en partie —
**aucune formation ni aucune clé de licence n'existe encore en production** pour exercer le
parcours étudiant complet (inscription → leçons → progression → attestation) ni le parcours
licence. Ce qui est réellement vérifié aujourd'hui, par constat direct et pas par supposition :
- ✅ **Connexion `/admin` en production** : confirmée par Massy lui-même (11/10/2026) — le point
  le plus important de la checklist, jamais testé avant ce jour (voir le constat ci-dessous).
- ✅ **Inscription et connexion étudiant** (ajouté le 11/10/2026, après le correctif du bug
  critique ci-dessus) : un compte jamais utilisé s'inscrit et se connecte réellement en
  production, atterrit sur le catalogue. Jamais vérifié avant ce jour — et pour cause, ça n'a
  jamais fonctionné jusqu'à ce correctif (voir plus haut).
- ✅ Téléchargement de fichier sans jeton signé valide → `404` neutre (`functions/api/files/
  download.js`), conforme à `docs/SECURITE.md` §5 — vérifié par requête réelle.
- ✅ Activation avec une clé de licence inconnue → `{"valid":false,"reason":"NOT_FOUND"}` —
  vérifié par requête réelle. **Non vérifié** : l'activation avec une *vraie* clé existante
  (aucune clé pilote n'a jamais été distribuée, `Mission 07 Partie B` jamais lancée — il n'existe
  simplement aucune clé réelle à tester).
- ❌ **Non vérifié** (faute de données de test en production, pas faute de code) : création
  d'une formation complète depuis `/admin` (vidéo/PDF/fichier/live), persistance de la
  progression d'un étudiant inscrit à une vraie formation, génération de l'attestation à 100 %,
  protection d'un document payant *avec un vrai document*, terminal/exercices en mode libre et en
  mode cours (aucune clé de licence de test n'existe pour entrer en mode libre).
**Reprise exacte pour la suite** : créer une formation de test (ou utiliser la première
formation réelle de Massy) et une clé de licence de test en production, puis rejouer la
checklist complète de Phase 5 de `missions/MISSION-23.md`. Une fois cela fait, Mission 23 peut
être déclarée entièrement close. **En attendant, un chantier correctif « accueil » est en
file** (prompt de l'architecte du 11/10/2026 : démo du terminal `/demo`, route `/app/inscription`,
pages légales du pied de page, habillage `/admin`) — **explicitement à ne démarrer qu'après la
clôture complète de Mission 23**, pas avant.

**🟢 Découverte du 11/10/2026, pendant la Phase 3 de l'Étape 5, résolue le même jour :
`ADMIN_SECRET_HASH` était absent des variables d'environnement du projet Pages** (constaté par
Massy à l'écran, section *Variables and secrets*, environnement Production — une seule ligne,
`SESSION_SECRET`, qu'il venait d'ajouter). Or `README.md` affirmait depuis le 27/07/2026
« `ADMIN_SECRET_HASH` configuré », et le compte rendu de cette date présentait la bascule
production comme faite et vérifiée — **la documentation était fausse** (corrigée dans ce même
`README.md` le 11/10/2026, voir §Administration). Jusqu'au correctif de la Phase 1 (10/10/2026),
le repli `|| ""` faisait que l'absence ne produisait aucune erreur visible — indétectable sans
aller regarder le dashboard. La connexion `/admin` n'avait donc probablement jamais fonctionné
en production avant ce jour (l'épisode « Phrase secrète invalide » du 06/10/2026 était un test
en local ; la vérification du 06/10 ne portait que sur `/api/license/check`, qui n'utilise pas
cette variable).
**Résolu le 11/10/2026** : Massy a régénéré une nouvelle phrase (l'ancienne est caduque) et posé
`ADMIN_SECRET_HASH` en *Secret* sur Production et Preview, de même que `SESSION_SECRET`. La
connexion `/admin` en production est confirmée fonctionnelle par Massy lui-même le même jour.
**Même classe d'erreur qu'en juillet** (`TASKS.md` disait la Mission 14 Étape 3 non faite alors
qu'elle l'était ; ici `README.md` disait une configuration faite alors qu'elle ne l'était pas) :
une affirmation écrite sans vérification sur le système réel. Leçon reconfirmée pour la
troisième fois sur ce projet — ne jamais écrire « configuré »/« fait »/« vérifié » sans l'avoir
constaté à l'écran ou par une requête.

**Rappel production pour la clôture finale (Étape 5)** : quatre choses à faire une fois, qui
n'existent qu'en local pour l'instant — `SESSION_SECRET` (env var Cloudflare Pages, comme
`ADMIN_SECRET_HASH`), le binding R2 réel (`wrangler.jsonc` n'a volontairement PAS été modifié,
voir l'entrée Étape 2 ci-dessous) une fois le bucket créé, `migrations/0002_platform_users.sql`
**et** `migrations/0003_audit_log.sql` appliqués en `--remote` (dans cet ordre, après 0001).
**Fait le 11/10/2026** : bucket `gds-content` créé, binding `CONTENT` posé dans `wrangler.jsonc`,
les deux migrations appliquées — vérifié par une requête réelle sur `sqlite_master` listant les
11 tables attendues.

**🟢 Correctif ci-dessus appliqué et vérifié le 10/10/2026 (Phase 1 de l'Étape 5, commit
`6469155`)** : `functions/_lib/requiredEnv.js` lève désormais si `SESSION_SECRET` ou
`ADMIN_SECRET_HASH` est absent/trop court, dans les quatre modules listés plus
`adminAuth.js`/`admin/login.js` (même motif trouvé et corrigé sur `ADMIN_SECRET_HASH`, pas
seulement `SESSION_SECRET`) — 13 tests dédiés, `functions/__tests__/requiredEnv.test.js`, qui
échouaient avant le correctif et passent après. Zéro `env.X || ""` restant sur une variable
sensible dans `functions/` (vérifié par recherche exhaustive).

**Bizarrerie d'environnement constatée le 11/10/2026 : `wrangler d1 execute --remote --file=...`
échoue systématiquement sur cette machine.** 5 tentatives identiques (y compris avec la dernière
version de wrangler, 4.149.0) — toutes échouent au même point : l'upload PUT du fichier vers R2
réussit, puis le POST suivant (`action: "ingest"`, qui dit à D1 de commencer le traitement)
échoue avec `fetch failed`, sans aucun détail réseau exploitable. Lu le code source de wrangler
(`node_modules/wrangler/wrangler-dist/cli.js`, fonction `uploadAndBeginIngestion`) : ce POST
passe par le même client HTTP (undici) dont la liste de méthodes auto-retryables est `GET, HEAD,
OPTIONS, PUT, DELETE, TRACE` — **POST n'y figure pas**. Le PUT (retryable) réussit toujours ; le
POST (non retryable) échoue toujours, ce qui est cohérent avec un aléa réseau Windows ponctuel
sur cette machine plutôt qu'avec le contenu des migrations, l'authentification ou R2 lui-même
(confirmé : `wrangler whoami` répond, `wrangler d1 execute --remote --command "SELECT 1"`
réussit à chaque fois).
**Contournement utilisé, pas un correctif du bug lui-même** : les deux migrations ont été
appliquées via `--command` (qui emprunte le chemin simple à une seule requête POST, déjà vérifié
fonctionnel) au lieu de `--file`. **Aucune instruction SQL n'a été modifiée** — seules les lignes
de commentaire entières (`-- ...`) ont été retirées du texte envoyé, uniquement pour tenir sous
la limite de longueur de ligne de commande Windows ; les `CREATE TABLE/INDEX IF NOT EXISTS` sont
passés tels quels. Invocation faite via `node wrangler-dist/cli.js` directement (pas `npx`), pour
éviter toute réinterprétation des caractères spéciaux du SQL par un shell.
Si une vraie migration de fichier volumineux (trop gros pour `--command`) est nécessaire un jour :
soit diagnostiquer plus avant l'environnement réseau de cette machine, soit découper le fichier
en instructions individuelles et les rejouer une par une par `--command` (comme ici), soit
appliquer la migration depuis une autre machine/CI où `--file --remote` fonctionne.

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
