/**
 * Interrupteur unique pour la publication des pages légales (/conditions,
 * /remboursement) -- demande explicite de Massy du 16/10/2026 : un seul
 * drapeau à basculer, pas dix conditions éparpillées dans le code.
 *
 * Tant que c'est `false`, les deux pages restent "en préparation" pour le
 * public (`LegalPendingPage.jsx`), même si le contenu intégral des deux
 * textes (`docs/legal/CONDITIONS-GENERALES-DE-VENTE.md`,
 * `docs/legal/POLITIQUE-DE-REMBOURSEMENT.md`) est déjà intégré et prêt à
 * l'affichage.
 *
 * Ne pas passer à `true` tant que les mentions obligatoires de l'article 11
 * de la loi 18-05 (registre du commerce, identifiant fiscal, adresse,
 * téléphone, prix TTC, prestataire de paiement) et tous les blocs
 * `[À COMPLÉTER]`/`[DÉCISION]` des deux documents n'ont pas été renseignés
 * ET relus par un avocat ou conseil juridique algérien -- voir TASKS.md
 * pour le détail complet et le point de conformité article 8 (loi 18-05,
 * hébergement .com.dz) encore à trancher.
 */
export const LEGAL_CONTENT_PUBLISHED = false;
