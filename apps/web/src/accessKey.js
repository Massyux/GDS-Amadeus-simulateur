import { normalizeKey, sha256Hex } from "./lib/keyHash.js";

export const ACCESS_KEY_STORAGE_KEY = "simulateur-amadeus:access-key-valid";

// Primary path: Cloudflare Pages Function checks the key against server-side
// hashes (see functions/api/verify-key.js). Fallback: if that endpoint is
// unreachable or not deployed (e.g. Pages Functions blocked, or local
// dev/test where no Functions runtime exists), fall back to comparing the
// key's hash against VITE_FALLBACK_KEY_HASHES baked into the client bundle
// at build time. That env var is empty by default in a production build, so
// the fallback is a no-op unless explicitly configured — documented as a
// deliberately-less-robust pilot-only option in CLAUDE.md.
export async function verifyKey(rawKey) {
  const key = normalizeKey(rawKey);
  if (!key) return false;

  try {
    const res = await fetch("/api/verify-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.valid === true;
    }
  } catch {
    // Functions unreachable — fall through to the client-side fallback.
  }

  const fallbackHashes = (import.meta.env.VITE_FALLBACK_KEY_HASHES || "")
    .split(",")
    .map((hash) => hash.trim().toLowerCase())
    .filter(Boolean);
  if (fallbackHashes.length === 0) return false;

  const hash = await sha256Hex(key);
  return fallbackHashes.includes(hash);
}
