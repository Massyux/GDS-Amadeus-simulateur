// Cloudflare Pages Function — Mission 23 Étape 2 (diffusion des documents
// payants, docs/SECURITE.md §5).
//
// GET ?token=<signé, 10 min> -> flux de l'objet R2, ou 404 neutre.
//
// Pas de session/cookie requis ICI (le jeton signé porte déjà userId/
// courseId -- functions/_lib/fileAccess.js) : ce lien doit pouvoir s'ouvrir
// dans un nouvel onglet ou un lecteur PDF externe, qui n'envoient pas
// forcément le cookie de session. La protection est entièrement dans le
// jeton (signature + expiration + ré-vérification de l'inscription), pas
// dans le cookie.
import { verifyDownloadToken } from "../../_lib/fileAccess.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const payload = await verifyDownloadToken(env, token);
  if (!payload || !env.DB || !env.CONTENT) return notFound();

  if (!payload.isPreview) {
    const enrolled = await env.DB.prepare(
      `SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?`
    )
      .bind(payload.userId, payload.courseId)
      .first();
    if (!enrolled) return notFound();
  }

  const object = await env.CONTENT.get(payload.fileKey);
  if (!object) return notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=0, no-store");

  return new Response(object.body, { status: 200, headers });
}

function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function onRequest() {
  return notFound();
}
