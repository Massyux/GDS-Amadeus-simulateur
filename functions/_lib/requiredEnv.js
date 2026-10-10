// Garde unique pour les variables d'environnement sensibles (bug critique
// trouvé par l'architecte le 09/10/2026, TASKS.md). Avant ce fichier, quatre
// appels dans trois modules faisaient `env.SESSION_SECRET || ""` : si la
// variable était absente, mal nommée, ou oubliée sur un environnement
// Cloudflare (preview comme production), le repli n'était pas une erreur --
// c'était la chaîne vide comme clé HMAC. Jetons de session, jetons CSRF et
// liens de téléchargement signés devenaient alors forgeables par n'importe
// qui, puisque la clé est connue de tous. Rien ne le signalait : pas de log,
// pas de page d'erreur, pas de test rouge. Le même motif existait sur
// `ADMIN_SECRET_HASH` dans `functions/_lib/adminAuth.js`.
//
// `requireSecret` lève plutôt que de replier -- un environnement mal
// configuré doit faire échouer la requête bruyamment (log Cloudflare, 500),
// jamais la servir avec une clé vide.
//
// Nommé `requiredEnv.js`, pas `secrets.js` : `.gitignore` a un filet large
// `*secret*` (toute occurrence du mot, délibérément, pour qu'un vrai secret
// mal nommé ne puisse jamais être commité par accident) -- un fichier de
// CODE appelé `secrets.js` s'y faisait prendre tout autant qu'un vrai
// secret, et restait silencieusement non suivi par git. Garder le code loin
// de ce mot dans son nom de fichier plutôt que de toucher au filet lui-même.
//
// CONSTITUTION.md §5 : corrigé en famille (un seul helper, tous les appels
// migrés), pas site d'appel par site d'appel.

// Pas un contrôle de force du secret (ce serait le rôle de qui le génère,
// jamais de ce garde) -- juste un filet contre une variable absente, une
// chaîne vide, ou une valeur manifestement oubliée/placeholder. Les vraies
// valeurs attendues (SESSION_SECRET généré aléatoirement, ADMIN_SECRET_HASH
// = un SHA-256 hex) font 32+ caractères ; 16 est délibérément bien en
// dessous de ça pour ne jamais rejeter une vraie valeur par erreur, tout en
// attrapant le cas "variable absente" (`undefined` -> "") et la plupart des
// fautes de frappe grossières.
const MIN_SECRET_LENGTH = 16;

export class SecretConfigError extends Error {
  constructor(name) {
    super(`Variable d'environnement absente ou invalide : ${name}`);
    this.name = "SecretConfigError";
    this.varName = name;
  }
}

/**
 * @param {Record<string, unknown>} env
 * @param {string} name
 * @param {{ minLength?: number }} [options]
 * @returns {string}
 */
export function requireSecret(env, name, { minLength = MIN_SECRET_LENGTH } = {}) {
  const value = env?.[name];
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw new SecretConfigError(name);
  }
  return value;
}
