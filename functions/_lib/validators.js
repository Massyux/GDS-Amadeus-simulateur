import { isCommonPassword } from "./commonPasswords.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email) {
  return EMAIL_RE.test(email) && email.length <= 254;
}

// docs/SECURITE.md §1: "Minimum 8 caractères, refus des mots de passe les plus
// courants ... Pas d'exigences absurdes (majuscule + chiffre + symbole)."
// Returns an actionable message (DESIGN-SYSTEM §5: "dit quoi faire") or null.
export function passwordError(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Le mot de passe doit faire au moins 8 caractères.";
  }
  if (password.length > 200) {
    return "Le mot de passe est trop long.";
  }
  if (isCommonPassword(password)) {
    return "Ce mot de passe est trop courant, choisis-en un autre.";
  }
  return null;
}
