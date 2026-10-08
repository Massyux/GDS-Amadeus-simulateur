// Cloudflare Pages Function — Mission 23 Étape 4 (back-office formations).
//
// POST (corps binaire brut, en-tête X-File-Name) -> 201 { fileKey, fileName, sizeBytes }
//
// Écrit directement sur le binding R2 (env.CONTENT.put), même geste que
// functions/api/dev/seed-file.js mais gardé par requireAdmin au lieu du
// garde-fou MAIL_DEV_ECHO -- c'est le premier vrai endpoint d'upload du
// projet (aucun n'existait avant cette étape, voir docs/SECURITE.md §5 :
// "téléversement depuis /admin"). `fileKey` est renvoyé pour être posé tel
// quel dans le `content` d'une leçon pdf/fichier (fileKey/fileName,
// functions/api/lessons/[id]/index.js) -- jamais exposé directement à
// l'étudiant, qui ne reçoit qu'une URL signée à durée limitée
// (functions/_lib/fileAccess.js).
//
// Pas de binding wrangler.jsonc réel pour CONTENT avant la bascule
// production (Étape 5, TASKS.md) -- fonctionne dès maintenant en local/test
// via `--r2 CONTENT` (wrangler pages dev), comme le reste du projet.
import { requireAdmin, unauthorizedResponse } from "../../_lib/adminAuth.js";
import { recordAudit } from "../../_lib/auditLog.js";

// Pas de limite documentée dans docs/SECURITE.md -- 25 Mo est une valeur de
// bon sens pour des PDF/fiches de cours (pas de vidéo, volontairement
// hébergée en URL externe, voir MISSION-23.md), consignée dans TASKS.md
// "À valider par Massy" (mode autonome, règle 2).
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function sanitizeFileName(raw) {
  const base = (raw || "fichier").split(/[/\\]/).pop();
  return base.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(0, 120) || "fichier";
}

function randomSegment(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, length);
}

export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.CONTENT) {
    return new Response(JSON.stringify({ error: "STORAGE_NOT_CONFIGURED" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const fileName = sanitizeFileName(request.headers.get("X-File-Name"));
  const contentLength = Number.parseInt(request.headers.get("content-length") || "", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
    return new Response(JSON.stringify({ error: "FILE_TOO_LARGE" }), {
      status: 413,
      headers: { "content-type": "application/json" },
    });
  }

  const fileKey = `admin/${Date.now()}-${randomSegment(8)}-${fileName}`;
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return new Response(JSON.stringify({ error: "FILE_TOO_LARGE" }), {
      status: 413,
      headers: { "content-type": "application/json" },
    });
  }

  await env.CONTENT.put(fileKey, body);

  await recordAudit(env, { action: "file.upload", target: fileKey, details: { fileName, sizeBytes: body.byteLength } });

  return new Response(
    JSON.stringify({ fileKey, fileName, sizeBytes: body.byteLength }),
    { status: 201, headers: { "content-type": "application/json" } }
  );
}

export async function onRequest() {
  return unauthorizedResponse();
}
