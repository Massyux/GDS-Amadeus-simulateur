// Cloudflare Pages Function — Mission 23 Étape 4 (back-office formations).
//
// POST { moduleId, type, title, content? } -> 201 { lesson }
//   sortOrder = max+1 dans ce module. `content` est un objet libre, sérialisé
//   tel quel (JSON.stringify) -- sa forme exacte par type est documentée dans
//   functions/api/lessons/[id]/index.js (buildContent) : texte {body},
//   video {embedUrl}, pdf {fileKey,fileName}, fichier {files:[{fileKey,
//   fileName,sizeBytes}]}, live {title,startsAt,durationMinutes,link},
//   simulateur {}, exercice {exerciseId}. Pas de validation de forme ici
//   (CONSTITUTION §8 : un seul admin, pas un formulaire public) -- seul
//   `type` est vérifié contre la liste autorisée, pour renvoyer une erreur
//   propre plutôt que l'erreur brute de la contrainte CHECK de D1.
import { requireAdmin, unauthorizedResponse } from "../../../_lib/adminAuth.js";
import { recordAudit } from "../../../_lib/auditLog.js";

const LESSON_TYPES = ["texte", "video", "pdf", "fichier", "live", "simulateur", "exercice", "quiz"];

export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "DB_NOT_CONFIGURED" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}));
  const moduleId = Number.parseInt(body?.moduleId, 10);
  const type = typeof body?.type === "string" ? body.type : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "object" && body.content !== null ? body.content : {};

  if (!Number.isFinite(moduleId) || !title) {
    return new Response(JSON.stringify({ error: "MODULE_ID_AND_TITLE_REQUIRED" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (!LESSON_TYPES.includes(type)) {
    return new Response(JSON.stringify({ error: "INVALID_TYPE" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const moduleRow = await env.DB.prepare(`SELECT id FROM modules WHERE id = ?`).bind(moduleId).first();
  if (!moduleRow) {
    return new Response(JSON.stringify({ error: "MODULE_NOT_FOUND" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const { max_sort: maxSort } = await env.DB.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM lessons WHERE module_id = ?`
  )
    .bind(moduleId)
    .first();

  const inserted = await env.DB.prepare(
    `INSERT INTO lessons (module_id, type, title, sort_order, content) VALUES (?, ?, ?, ?, ?)
     RETURNING id, module_id, type, title, sort_order, content`
  )
    .bind(moduleId, type, title, maxSort + 1, JSON.stringify(content))
    .first();

  await recordAudit(env, { action: "lesson.create", target: `lesson:${inserted.id}`, details: { moduleId, type, title } });

  return new Response(
    JSON.stringify({
      lesson: {
        id: inserted.id,
        moduleId: inserted.module_id,
        type: inserted.type,
        title: inserted.title,
        sortOrder: inserted.sort_order,
        content: JSON.parse(inserted.content || "{}"),
      },
    }),
    { status: 201, headers: { "content-type": "application/json" } }
  );
}

export async function onRequest() {
  return unauthorizedResponse();
}
