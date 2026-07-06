// Cloudflare Pages Function — server-side access key validation.
//
// POST { key: string } -> { valid: boolean }
//
// Valid keys are never stored in clear text: the Cloudflare Pages project's
// "ACCESS_KEY_HASHES" environment variable holds a comma-separated list of
// SHA-256 hex digests of the normalized key strings. Generate keys and their
// hashes with `node scripts/generate-keys.mjs` (see that script's header and
// README.md "Gestion des clés d'accès" for how Massy adds/revokes a key from
// the Cloudflare dashboard without touching any code).
//
// Anti-abuse (minimal, appropriate for a pilot, not a hardened auth system):
// missing key, invalid key, and unconfigured env all return the exact same
// { valid: false } shape after the same minimum delay, so a caller can't
// distinguish "no such key" from "no keys configured" or probe for validity
// faster than a legitimate check.

const MIN_DELAY_MS = 300;

function normalizeKey(key) {
  return typeof key === "string" ? key.trim().toUpperCase() : "";
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost({ request, env }) {
  const start = Date.now();
  let valid = false;

  try {
    const body = await request.json();
    const key = normalizeKey(body?.key);
    const configuredHashes = (env.ACCESS_KEY_HASHES || "")
      .split(",")
      .map((hash) => hash.trim().toLowerCase())
      .filter(Boolean);

    if (key && configuredHashes.length > 0) {
      const hash = await sha256Hex(key);
      valid = configuredHashes.includes(hash);
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

// Any other method: same neutral response, no method/route enumeration hints.
export async function onRequest() {
  return new Response(JSON.stringify({ valid: false }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
