import { isCommonPassword } from "./commonPasswords.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email) {
  return EMAIL_RE.test(email) && email.length <= 254;
}

// docs/SECURITE.md §1: "Minimum 12 caractères, refus des mots de passe les plus
// courants ... Pas d'exigences absurdes (majuscule + chiffre + symbole)."
// Monté de 8 à 12 le 25/10/2026 (PROMPT-MOTS-DE-PASSE-ET-MAIL.md) : le hachage
// est bridé à 100 000 itérations PBKDF2 (functions/_lib/passwordHash.js), six
// fois sous la recommandation OWASP pour cet algorithme, sans pouvoir monter
// (limite dure des Workers Cloudflare). La longueur du mot de passe lui-même
// compense en partie -- chaque caractère de plus multiplie l'espace de
// recherche d'un brute-force hors ligne par la taille de l'alphabet utilisé,
// quel que soit le nombre d'itérations. 12 plutôt que 10 : c'est la valeur
// la plus haute suggérée par le prompt, et elle reste sans exigence de
// composition (toujours "pas d'exigences absurdes") -- 12 caractères simples
// sont plus faciles à retenir qu'un mot de passe court truffé de symboles.
// Returns an actionable message (DESIGN-SYSTEM §5: "dit quoi faire") or null.
export function passwordError(password) {
  if (typeof password !== "string" || password.length < 12) {
    return "Le mot de passe doit faire au moins 12 caractères.";
  }
  if (password.length > 200) {
    return "Le mot de passe est trop long.";
  }
  if (isCommonPassword(password)) {
    return "Ce mot de passe est trop courant, choisis-en un autre.";
  }
  return null;
}
