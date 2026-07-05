# MISSION 05 — Déploiement public (Phase 2, fin) — AVEC MASSY

**Phase** : 2 · **Durée cible** : 1 session courte · **Pré-requis** : MISSION-01 close ;
Massy présent (son compte hébergeur, règle CLAUDE.md : ne pas déployer sans lui)

## Tâches

1. Choix avec Massy : hébergeur (Vercel ou Netlify — gratuit suffisant pour v1), nom de domaine
   ou sous-domaine fourni.
2. Le guider pas à pas : création du compte, connexion du repo GitHub, config build
   (`npm run build:web`, dossier `apps/web/dist`, racine monorepo → définir le répertoire projet).
3. Déploiement + vérification : onboarding s'affiche, séquence AN→SS→NM→AP→RF→ER→RT fonctionne
   en production, disclaimer visible.
4. Configurer le déploiement automatique sur push main (préviews sur branches inutiles pour v1).
5. Documenter l'URL et la procédure dans CLAUDE.md (Phase 2 → ✅).

## Critères d'acceptation
- [ ] URL publique fonctionnelle validée par Massy sur son propre navigateur
- [ ] Redéploiement automatique sur push vérifié
- [ ] CLAUDE.md à jour, rituel de clôture exécuté
