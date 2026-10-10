// Cloudflare Pages Function — Mission 14 admin auth. No Supabase Auth (only
// Massy administers this): a single shared passphrase, hashed with SHA-256
// into the ADMIN_SECRET_HASH env var (same pattern as ACCESS_KEY_HASHES /
// scripts/generate-keys.mjs; see scripts/generate-admin-secret.mjs).
//
// POST { secret } -> { valid: true, token } | { valid: false }
//
// The returned token is signed with ADMIN_SECRET_HASH itself as the HMAC
// key (functions/_lib/token.js) -- it never leaves the server unsigned,
// stays valid only as long as that env var does, and needs no second
// secret for Massy to configure. It carries a short expiry (session-length,
// not "forever"); there is deliberately no server-side session table to
// revoke early since there is exactly one admin and rotating
// ADMIN_SECRET_HASH already invalidates every outstanding token at once.
import { sha256Hex, constantTimeEqual } from "../../_lib/hash.js";
import { signToken } from "../../_lib/token.js";
import { requireSecret } from "../../_lib/requiredEnv.js";

const MIN_DELAY_MS = 300;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h

export async function onRequestPost({ request, env }) {
  const start = Date.now();
  let result = { valid: false };

  try {
    const body = await request.json();
    const secret = typeof body?.secret === "string" ? body.secret.trim() : "";
    // requireSecret lève si ADMIN_SECRET_HASH est absent/trop court -- avalé
    // par ce même try/catch, qui retombe sur le résultat neutre {valid:false}
    // déjà utilisé pour une mauvaise phrase : un environnement mal configuré
    // ne doit jamais se distinguer d'un simple échec de connexion.
    const adminHash = requireSecret(env, "ADMIN_SECRET_HASH");
    const configuredHash = adminHash.trim().toLowerCase();

    if (secret) {
      const hash = await sha256Hex(secret);
      if (constantTimeEqual(hash, configuredHash)) {
        const token = await signToken(
          { role: "admin", exp: Date.now() + SESSION_TTL_MS },
          adminHash
        );
        result = { valid: true, token };
      }
    }
  } catch {
    result = { valid: false };
  }

  const elapsed = Date.now() - start;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }

  return new Response(JSON.stringify(result), {
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
