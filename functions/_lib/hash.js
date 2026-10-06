// Shared key/secret normalization + hashing (Mission 14). Same
// normalize-then-SHA-256 convention as functions/api/verify-key.js and
// scripts/generate-keys.mjs -- kept as its own copy here (not a shared
// import from verify-key.js) so Mission 14's new endpoints never risk
// touching that already-live, already-verified pilot access code path.

export function normalizeKey(key) {
  return typeof key === "string" ? key.trim().toUpperCase() : "";
}

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Constant-time string comparison (length-then-XOR, never short-circuits on
// the first difference like `===` does) -- shared by token.js (signature
// verification) and admin/login.js (secret comparison), both comparing
// values an attacker could otherwise time-probe one character at a time.
export function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
