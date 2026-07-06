// Must stay in sync with the normalization/hashing logic in
// functions/api/verify-key.js and scripts/generate-keys.mjs: same trim+
// uppercase normalization, same SHA-256 hex digest.

export function normalizeKey(key) {
  return typeof key === "string" ? key.trim().toUpperCase() : "";
}

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
