// Cloudflare Pages Function — Mission 14 admin: free up a single device
// slot without revoking the whole license (docs/LICENCES.md support case:
// "client changed computers" -> delete the orphaned activation, the freed
// slot is immediately available to the next device that activates).
import { requireAdmin, unauthorizedResponse } from "../../../_lib/adminAuth.js";

export async function onRequestDelete({ request, env, params }) {
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

  const result = await env.DB.prepare("DELETE FROM activations WHERE id = ?").bind(id).run();

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
