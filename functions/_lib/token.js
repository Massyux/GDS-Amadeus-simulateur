// Shared HMAC-signed token helper (Mission 14 — espace admin + licences).
// Not a route: files under functions/_lib/ are excluded from Cloudflare
// Pages Functions routing (leading underscore), this is a plain module
// imported by the actual route handlers.
//
// Format: <base64url(JSON payload)>.<base64url(HMAC-SHA256 signature)>.
// Deliberately not a full JWT (no header, no algorithm negotiation --
// there is only ever one algorithm here, so there is nothing to confuse
// a verifier into accepting a weaker one). A payload's own `exp` (epoch ms)
// is checked by verifyToken; callers that also need "instantly revocable"
// semantics (license activation) must additionally re-check current state
// in D1 -- a signature alone can prove "the server issued this," never
// "this is still valid right now."

import { constantTimeEqual } from "./hash.js";

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(payload, secret) {
  const payloadB64 = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${base64url(new Uint8Array(signature))}`;
}

// Returns the decoded payload if the signature is valid and (when present)
// payload.exp hasn't passed, otherwise null. Never throws -- a malformed
// token is just an invalid one.
export async function verifyToken(token, secret) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signatureB64] = parts;

  try {
    const key = await hmacKey(secret);
    const expectedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payloadB64)
    );
    const expectedB64 = base64url(new Uint8Array(expectedSignature));

    if (!constantTimeEqual(signatureB64, expectedB64)) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
    if (typeof payload.exp === "number" && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
