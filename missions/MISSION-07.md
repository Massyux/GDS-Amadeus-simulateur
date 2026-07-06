# MISSION 07 — Lancement pilote (Phase 4)

**Phase** : 4 · **Pré-requis** : Mission 06 close (✅ 06/07/2026) + Massy a configuré au moins
une clé réelle (`ACCESS_KEY_HASHES`) et l'a testée lui-même en production.

## Partie A — Préparation technique (Claude Code, 1 session courte)

1. **Mesure d'audience sans cookies** : activer Cloudflare Web Analytics (gratuit, RGPD-friendly,
   pas de bannière nécessaire) — Massy colle le snippet depuis son dashboard, ou variable d'env.
2. **Canal de retour intégré** : bouton discret « Feedback » (coin de l'écran terminal + accueil),
   ouvrant le canal choisi par Massy (mailto avec objet pré-rempli incluant version/écran, ou
   formulaire externe s'il préfère). FR/EN.
3. **Guide de démarrage rapide** : un écran accessible depuis l'accueil et le terminal (« ? ») :
   les commandes de base et la séquence complète AN→SS→NM→AP→RF→ER, FR/EN, imprimable.
4. Tests (Vitest + un scénario Playwright) + rituel de clôture.

## Partie B — Opérations (Massy, checklist)

- [ ] Générer les clés : `node scripts/generate-keys.mjs <N>` — garder le CSV hors du repo
- [ ] Ajouter les hachés dans Cloudflare → Settings → Environment variables → `ACCESS_KEY_HASHES`,
      redéployer, tester UNE clé soi-même en production
- [ ] Recruter 5 à 15 pilotes (étudiants tourisme, audience TikTok FikraDZ, contacts agences)
- [ ] Une clé par personne (traçabilité dans le CSV : nom ↔ clé)
- [ ] Consigne aux pilotes : compléter la séquence de réservation + noter tout ce qui bloque,
      étonne ou manque
- [ ] Consigner chaque retour dans `docs/PILOTE.md` : date, pilote, catégorie (bug /
      incompréhension / manque / positif), verbatim

## Boucle corrective

Chaque bug remonté = session Claude Code immédiate (la constitution s'applique : famille de
bugs, test de non-régression, push → redéploiement auto). Les demandes de fonctionnalités vont
au Backlog, elles n'interrompent pas le pilote.

## Critères de sortie de phase
- [ ] ≥ 5 pilotes ont complété la séquence complète en production
- [ ] Tous les retours consignés dans `docs/PILOTE.md`, bugs critiques corrigés
- [ ] Décision écrite de Massy dans CLAUDE.md : prêt pour lancement large (ou itération de plus)
