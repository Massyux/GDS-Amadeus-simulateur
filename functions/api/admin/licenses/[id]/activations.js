// Cloudflare Pages Function — Mission 14 admin: list a license's individual
// device activations (so /admin can show which device to free up via
// DELETE /api/admin/activations/:id).
import { requireAdmin, unauthorizedResponse } from "../../../../_lib/adminAuth.js";

export async function onRequestGet({ request, env, params }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ activations: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const licenseId = Number.parseInt(params.id, 10);
  if (!Number.isFinite(licenseId)) {
    return new Response(JSON.stringify({ error: "NOT_FOUND" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, device_fingerprint, created_at, last_seen_at
     FROM activations WHERE license_id = ? ORDER BY created_at ASC`
  )
    .bind(licenseId)
    .all();

  return new Response(
    JSON.stringify({
      activations: results.map((row) => ({
        id: row.id,
        deviceFingerprint: row.device_fingerprint,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
      })),
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}
