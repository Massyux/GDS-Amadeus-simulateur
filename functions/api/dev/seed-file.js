// Route de test UNIQUEMENT -- jamais utilisable en production (même garde que
// functions/api/dev/reset-rate-limits.js : inerte sauf MAIL_DEV_ECHO === "1").
//
// Pourquoi ça existe : `wrangler r2 object put` valide les noms de bucket
// selon les règles S3 réelles (minuscules uniquement) même en --local, alors
// que `wrangler pages dev --r2 CONTENT` (sans wrangler.jsonc -- ce binding
// n'existe pas encore en production, volontairement, voir TASKS.md) garde le
// nom du binding tel quel ("CONTENT") comme espace de stockage local. Les
// deux ne se rejoignent jamais en passant par le CLI. Écrire l'objet depuis
// l'intérieur du worker déjà démarré (env.CONTENT.put) utilise forcément le
// même espace que celui que les Functions liront ensuite.
import { devEchoEnabled } from "../../_lib/mailer.js";

function notFound() {
  return new Response(JSON.stringify({ ok: false }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost({ request, env }) {
  if (!devEchoEnabled(env) || !env.CONTENT) return notFound();

  const key = request.headers.get("X-Seed-Key");
  if (!key) return notFound();

  await env.CONTENT.put(key, request.body);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequest() {
  return notFound();
}
