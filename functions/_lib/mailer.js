// Point d'accroche pour MISSION-22 ("le circuit mail viendra en MISSION-22",
// MISSION-23.md Étape 1) -- aucun fournisseur d'e-mail n'est encore branché,
// volontairement : Mission 22 choisira et câblera un vrai service (et le domaine
// nécessaire à l'envoi réel). Un seul fichier à changer quand ce sera fait ;
// aucun appelant (functions/api/auth/*) ne doit avoir à changer.
//
// En attendant, `sendMail` ne fait rien en production. Pour pouvoir tester le
// circuit mot-de-passe-oublié de bout en bout sans service d'e-mail réel, le
// jeton de réinitialisation brut (qui ne doit JAMAIS apparaître dans une réponse
// HTTP normale -- ce serait une prise de contrôle de compte triviale) est
// seulement exposé quand `env.MAIL_DEV_ECHO === "1"`, une variable qui n'existe
// que dans .dev.vars (gitignored) et dans l'environnement des tests/CI, jamais en
// production -- même convention que les autres valeurs de test de ce fichier
// (voir ADMIN_SECRET_HASH dans functions/__tests__/testServer.js).

export async function sendMail({ to, subject, text }) {
  // no-op jusqu'à MISSION-22 -- voir le commentaire de fichier ci-dessus.
  void to;
  void subject;
  void text;
}

export function devEchoEnabled(env) {
  return env.MAIL_DEV_ECHO === "1";
}
