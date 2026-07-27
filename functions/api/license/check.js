// Cloudflare Pages Function — Mission 14. POST { token } -> { valid: bool }.
// Called at load time to confirm a previously-activated device's token is
// still good. Revoking a license (status='revoked') or deleting its
// activation row (admin "free up this device") makes every check for that
// token start failing immediately -- there is no signature/expiry to reason
// about separately, the DB row IS the source of truth (see migrations/
// 0001_init.sql comment on the activations table).
const MIN_DELAY_MS = 200;

export async function onRequestPost({ request, env }) {
  const start = Date.now();
  let valid = false;

  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (token && env.DB) {
      const row = await env.DB.prepare(
        `SELECT l.status AS status
         FROM activations a
         JOIN licenses l ON l.id = a.license_id
         WHERE a.token = ?`
      )
        .bind(token)
        .first();

      if (row && row.status === "active") {
        valid = true;
        await env.DB.prepare("UPDATE activations SET last_seen_at = datetime('now') WHERE token = ?")
          .bind(token)
          .run();
      }
    }
  } catch {
    valid = false;
  }

  const elapsed = Date.now() - start;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }

  return new Response(JSON.stringify({ valid }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequest() {
  return new Response(JSON.stringify({ valid: false }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
