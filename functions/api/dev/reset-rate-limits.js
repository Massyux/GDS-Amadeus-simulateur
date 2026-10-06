// Route de test UNIQUEMENT -- jamais utilisable en production.
//
// Pourquoi ça existe : chaque requête locale/test partage une même "IP"
// factice (functions/_lib/rateLimit.js clientIp), donc un fichier de tests
// qui enchaîne plusieurs inscriptions/connexions valides peut épuiser son
// propre quota et commencer à s'auto-bloquer. Ce endpoint vide le compteur
// en passant par le binding D1 du worker déjà en cours d'exécution --
// contrairement à relancer `wrangler d1 execute` en parallèle d'un `wrangler
// pages dev` sur le même --persist-to, qui provoque des ECONNRESET côté
// serveur (constaté en écrivant functions/__tests__/auth-api.test.js, Mission
// 23 Étape 1) : deux process distincts touchant le même fichier SQLite au
// même instant, contrairement aux migrations qui s'appliquent avant le
// démarrage du serveur, jamais pendant.
//
// Gardé inerte (404) tant que `MAIL_DEV_ECHO` n'est pas explicitement "1" --
// la même variable que functions/_lib/mailer.js, jamais définie en
// production (voir .dev.vars, gitignored). Si jamais déployée par erreur
// sans cette variable, la route répond 404 comme n'importe quelle route
// inexistante -- aucune action possible sans le flag.
//
// Dossier nommé `dev/` (pas `_dev/`) volontairement : Cloudflare Pages
// exclut du routage tout fichier/dossier préfixé par `_` (c'est exactement
// pourquoi functions/_lib/ n'est jamais exposé en route) -- un `_dev/` ne
// répondrait donc jamais, flag ou pas. La protection réelle est le flag
// ci-dessus, pas le nom du dossier.
import { devEchoEnabled } from "../../_lib/mailer.js";

function notFound() {
  return new Response(JSON.stringify({ ok: false }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost({ env }) {
  if (!devEchoEnabled(env) || !env.DB) return notFound();

  await env.DB.prepare(`DELETE FROM rate_limit_attempts`).run();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequest() {
  return notFound();
}
