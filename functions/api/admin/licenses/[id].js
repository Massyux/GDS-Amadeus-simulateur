// Cloudflare Pages Function — Mission 14 admin: revoke/reactivate a license,
// or change its device limit ("extend" a school license).
//
// PATCH { status?: "active"|"revoked", maxDevices?: number }
//
// Revoking sets status='revoked': every activation's /api/license/check
// call for this license starts failing on its very next check (no
// per-token action needed -- see migrations/0001_init.sql).
import { requireAdmin, unauthorizedResponse } from "../../../_lib/adminAuth.js";

export async function onRequestPatch({ request, env, params }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "DB_NOT_CONFIGURED" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: "NOT_FOUND" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}));
  const updates = [];
  const values = [];

  if (body?.status === "active" || body?.status === "revoked") {
    updates.push("status = ?");
    values.push(body.status);
  }
  if (Number.isFinite(Number.parseInt(body?.maxDevices, 10))) {
    updates.push("max_devices = ?");
    values.push(Math.max(1, Number.parseInt(body.maxDevices, 10)));
  }

  if (updates.length === 0) {
    return new Response(JSON.stringify({ error: "NOTHING_TO_UPDATE" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  const result = await env.DB.prepare(
    `UPDATE licenses SET ${updates.join(", ")} WHERE id = ?`
  )
    .bind(...values)
    .run();

  if (result.meta.changes === 0) {
    return new Response(JSON.stringify({ error: "NOT_FOUND" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
