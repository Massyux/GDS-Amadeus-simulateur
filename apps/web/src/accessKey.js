import { getDeviceFingerprint } from "./lib/deviceFingerprint.js";

export const ACCESS_KEY_STORAGE_KEY = "simulateur-amadeus:access-key-valid";
export const ACCESS_TOKEN_STORAGE_KEY = "simulateur-amadeus:access-token";

// Mission 14 Etape 3: talks to the real license system (Cloudflare D1,
// functions/api/license/activate.js) instead of the retired
// ACCESS_KEY_HASHES/verify-key.js env-var scheme. No client-side fallback
// this time -- per-device limits are the whole point of this system, and a
// client-side hash comparison could never express "how many devices has
// this key already activated".
//
// Returns the Function's own response shape: { valid: true, token, ... } or
// { valid: false, reason: "NOT_FOUND" | "DEVICE_LIMIT", ... }. Any transport
// failure (Functions unreachable, bad JSON) is folded into the same
// NOT_FOUND shape a caller already has to handle -- no new UI state needed.
export async function activateKey(rawKey) {
  const key = typeof rawKey === "string" ? rawKey.trim() : "";
  if (!key) return { valid: false, reason: "NOT_FOUND" };

  try {
    const deviceFingerprint = await getDeviceFingerprint();
    const res = await fetch("/api/license/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, deviceFingerprint }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Functions unreachable -- falls through to the neutral NOT_FOUND below.
  }
  return { valid: false, reason: "NOT_FOUND" };
}

// Called at load time (docs/LICENCES.md #2) to confirm a previously stored
// token is still valid. Revoking a license from /admin makes this return
// false on the very next call. Tolerates a brief network/server hiccup by
// failing OPEN (keeps the user in) rather than forcing a logout on a
// transient error -- only an explicit { valid: false } from the server ever
// triggers one.
export async function checkToken(token) {
  try {
    const res = await fetch("/api/license/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.valid !== false;
    }
  } catch {
    // fall through
  }
  return true;
}
