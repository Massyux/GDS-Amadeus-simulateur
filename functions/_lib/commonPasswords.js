// docs/SECURITE.md §1 : "refus des mots de passe les plus courants (petite liste
// locale). Pas d'exigences absurdes (majuscule + chiffre + symbole) : la longueur
// prime." Liste volontairement courte -- l'objectif est de bloquer les choix
// triviaux les plus évidents, pas de remplacer un vérificateur d'entropie.
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "azertyuiop",
  "motdepasse",
  "lemotdepasse",
  "admin1234",
  "administrateur",
  "iloveyou1",
  "letmein12",
  "welcome12",
  "amadeus123",
  "amadeus1234",
  "simulateur",
]);

export function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(String(password || "").toLowerCase());
}
