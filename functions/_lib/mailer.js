// Envoi d'e-mail transactionnel réel via Brevo (PROMPT-MOTS-DE-PASSE-ET-MAIL.md,
// 25/10/2026, chantier 2) -- décision de l'architecte : 300 e-mails/jour
// gratuits, sans plafond mensuel, et Massy aura besoin du même compte pour le
// marketing automatique plus tard (Resend était l'alternative, écartée pour son
// plafond de 100/jour). Un seul appel HTTP depuis le Worker -- pas de SDK, pas
// de bibliothèque d'e-mail.
//
// Point d'accroche délibéré depuis Mission 23 Étape 1 : `sendMail` était un
// no-op, et c'est le SEUL fichier qui change ici -- aucun appelant
// (functions/api/auth/forgot-password.js) ne change de comportement ni de
// contrat, seulement sa signature (ajout de `env` en premier paramètre, pour
// lire la clé d'API -- même convention que hashPassword(env, password)).
//
// `sendMail` n'échoue JAMAIS vers l'appelant (ne rejette jamais sa promesse) :
// la route qui l'appelle est tenue par une réponse neutre anti-énumération
// (docs/SECURITE.md §3) qui ne doit jamais changer de forme selon qu'un e-mail
// est réellement parti ou non. Mais un échec n'est pas pour autant invisible --
// c'est exactement le motif qui a caché le plafond PBKDF2 pendant des semaines
// (functions/_lib/passwordHash.js) : chaque échec (clé absente/invalide, panne
// réseau, réponse d'erreur de Brevo) est journalisé via console.error avant de
// renvoyer normalement. Une clé BREVO_API_KEY absente ou manifestement invalide
// passe par requireSecret() (functions/_lib/requiredEnv.js, jamais de repli
// silencieux) -- son rejet est attrapé ICI, pas laissé remonter : c'est la seule
// exception consciente à "requireSecret doit faire planter l'appelant", need par
// le contrat anti-énumération des routes d'authentification qui appellent
// sendMail, pas par une négligence.
import { requireSecret } from "./requiredEnv.js";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
// Adresse déjà routée (Cloudflare Email Routing, voir CLAUDE.md) -- un
// expéditeur non vérifié par Brevo ferait échouer l'envoi, pas falsifier une
// autre identité : Brevo exige que le domaine de l'expéditeur soit vérifié
// par DNS sur le compte (à la charge de Massy, voir le prompt).
const SENDER = { email: "contact@orionisacademy.com", name: "Orionis Academy" };

/**
 * @param {Record<string, unknown>} env
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 */
export async function sendMail(env, { to, subject, text, html }) {
  let apiKey;
  try {
    apiKey = requireSecret(env, "BREVO_API_KEY");
  } catch (err) {
    console.error("mailer.js: BREVO_API_KEY absent ou invalide, e-mail non envoyé.", err?.message || err);
    return;
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: to }],
        subject,
        textContent: text,
        ...(html ? { htmlContent: html } : {}),
      }),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      console.error(`mailer.js: Brevo a répondu ${res.status} pour un envoi à "${subject}".`, bodyText.slice(0, 500));
    }
  } catch (err) {
    console.error("mailer.js: échec réseau en envoyant via Brevo.", err?.stack || err?.message || String(err));
  }
}

// En attendant MISSION-22 (aucun e-mail n'est réellement reçu), pour pouvoir
// tester le circuit mot-de-passe-oublié de bout en bout sans service d'e-mail
// réel, le jeton de réinitialisation brut (qui ne doit JAMAIS apparaître dans
// une réponse HTTP normale -- ce serait une prise de contrôle de compte
// triviale) est seulement exposé quand `env.MAIL_DEV_ECHO === "1"`, une
// variable qui n'existe que dans .dev.vars (gitignored) et dans
// l'environnement des tests/CI, jamais en production -- même convention que
// les autres valeurs de test de ce fichier (voir ADMIN_SECRET_HASH dans
// functions/__tests__/testServer.js). Vérifié réellement en production le
// 25/10/2026 : les routes gardées par ce même indicateur (functions/api/dev/*)
// répondent 404, comme n'importe quelle route inexistante.
export function devEchoEnabled(env) {
  return env.MAIL_DEV_ECHO === "1";
}
