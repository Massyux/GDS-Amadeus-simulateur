// Cloudflare Pages Function — Mission 14 admin CRUD (list + create).
// Every request requires a valid admin bearer token (functions/_lib/adminAuth.js).
//
// GET  -> { licenses: [{ id, tier, maxDevices, devicesUsed, clientName, status, createdAt, lastActivity }, ...] }
// POST { tier, maxDevices, clientName } -> { key, license }
//   `key` is the clear-text license key -- returned ONCE, at creation time,
//   exactly like scripts/generate-keys.mjs's CSV output. Only its hash is
//   ever stored.
import { requireAdmin, unauthorizedResponse } from "../../_lib/adminAuth.js";
import { normalizeKey, sha256Hex } from "../../_lib/hash.js";

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

function randomSegment(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const byte of bytes) out += KEY_ALPHABET[byte % KEY_ALPHABET.length];
  return out;
}

function generateLicenseKey() {
  return `GDS-${randomSegment(4)}-${randomSegment(4)}`;
}

function toLicenseDTO(row) {
  return {
    id: row.id,
    tier: row.tier,
    maxDevices: row.max_devices,
    devicesUsed: row.devices_used,
    clientName: row.client_name,
    status: row.status,
    createdAt: row.created_at,
    lastActivity: row.last_activity ?? null,
  };
}

export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ licenses: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const { results } = await env.DB.prepare(
    `SELECT l.id, l.tier, l.max_devices, l.client_name, l.status, l.created_at,
            COUNT(a.id) AS devices_used, MAX(a.last_seen_at) AS last_activity
     FROM licenses l
     LEFT JOIN activations a ON a.license_id = l.id
     GROUP BY l.id
     ORDER BY l.created_at DESC`
  ).all();

  return new Response(JSON.stringify({ licenses: results.map(toLicenseDTO) }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorizedResponse();
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "DB_NOT_CONFIGURED" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}));
  const tier = body?.tier === "school" ? "school" : "individual";
  const maxDevices = tier === "school" ? clampSchoolDevices(body?.maxDevices) : 1;
  const clientName = typeof body?.clientName === "string" ? body.clientName.trim() : null;

  const key = generateLicenseKey();
  const keyHash = await sha256Hex(normalizeKey(key));

  const inserted = await env.DB.prepare(
    `INSERT INTO licenses (key_hash, tier, max_devices, client_name)
     VALUES (?, ?, ?, ?)
     RETURNING id, tier, max_devices, client_name, status, created_at`
  )
    .bind(keyHash, tier, maxDevices, clientName)
    .first();

  return new Response(
    JSON.stringify({ key, license: toLicenseDTO({ ...inserted, devices_used: 0 }) }),
    { status: 201, headers: { "content-type": "application/json" } }
  );
}

function clampSchoolDevices(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 2;
  return Math.min(4, Math.max(2, n));
}
