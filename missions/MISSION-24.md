# MISSION 24 — Quiz, notation et tableau de bord étudiant

*(anciennement « mission 09 » de la roadmap initiale — renumérotée à la demande de Massy le
06/10/2026 pour entrer dans la séquence active)*

**Pré-requis** : MISSION-23 (plateforme) close — elle apporte déjà les comptes, les leçons et
la progression « terminé / pas terminé ». **Durée : 2-3 sessions.**

## Périmètre : ce que la plateforme ne fait PAS encore

La mission 23 sait dire *« l'étudiant a terminé la leçon »*. Elle ne sait pas dire
*« il l'a réussie, avec quel score, et ce qu'il doit revoir »*. C'est tout l'objet de
cette mission. **Ne pas refaire ce que la 23 a déjà fait** — relire son modèle de données
avant d'écrire la première ligne.

## Contenu

### 1. Moteur de quiz (QCM auto-corrigé)
Nouveau type de leçon `quiz`, dans le même format de contenu que les exercices (JSON,
versionné, FR/EN). Types de question : choix unique, choix multiple, et **saisie de
commande** (l'étudiant tape la commande attendue — correction par le vrai moteur, pas par
comparaison de chaîne). Correction immédiate avec explication de la bonne réponse, pas
seulement « faux ».

### 2. Notation
Score par exercice (le moteur `packages/exercises` renvoie déjà un barème — l'exploiter au
lieu d'en inventer un autre), score par quiz, score par module, score global de formation.
Règle de réussite d'une formation à fixer avec Massy (ex. 70 % + tous les exercices
obligatoires terminés) — c'est **sa** décision pédagogique, pas une valeur par défaut
inventée.

### 3. Tableau de bord étudiant
Vue d'ensemble : formations en cours, progression, scores, **ce qui est acquis / ce qui est
à revoir** (c'est la partie qui aide vraiment à apprendre), temps passé, dernière activité.
Recommandation simple de révision basée sur les objectifs échoués — pas d'algorithme
sophistiqué, une règle lisible.

### 4. Rattachement à l'attestation
L'attestation de la mission 23 ne se délivre plus sur « 100 % des leçons ouvertes » mais sur
le seuil de réussite défini ci-dessus.

### 5. Vue enseignant (minimale, si la session le permet)
Massy voit la progression et les scores des étudiants inscrits. Si la mission déborde,
reporter — mais le modèle de données doit déjà le permettre sans refonte.

## Critères d'acceptation
- [ ] Un quiz se crée depuis `/admin` sans toucher au code
- [ ] Une question de type « tape la commande » est corrigée par le vrai moteur
- [ ] Le tableau de bord distingue clairement acquis / à revoir
- [ ] L'attestation dépend du seuil de réussite validé par Massy
- [ ] Suites + CI vertes, production vérifiée, rituel de clôture
