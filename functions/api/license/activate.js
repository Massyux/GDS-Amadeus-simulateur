// Cloudflare Pages Function — Mission 14 (D1 licensing, replaces the
// env-var-only ACCESS_KEY_HASHES scheme for whoever calls this).
//
// POST { key, deviceFingerprint }
//  -> { valid: true, token, devicesUsed, maxDevices }
//  -> { valid: false, reason: "NOT_FOUND" }              (unknown/revoked key)
//  -> { valid: false, reason: "DEVICE_LIMIT", devicesUsed, maxDevices }
//
// Unlike verify-key.js, these reasons are intentionally distinguishable --
// the mission calls for a clear "device 2/4 registered" / "device limit
// reached" message, not the deliberately-vague single-shape response used
// for the pilot's plain access-key gate.
//
// Re-activating from the SAME device (same fingerprint) is idempotent: it
// returns the existing token rather than consuming a new device slot.
import { normalizeKey, sha256Hex } from "../../_lib/hash.js";
import { checkRateLimit, clientIp } from "../../_lib/rateLimit.js";

const MIN_DELAY_MS = 300;

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  const start = Date.now();
  let result = { valid: false, reason: "NOT_FOUND" };

  try {
    const body = await request.json();
    const key = normalizeKey(body?.key);
    const deviceFingerprint =
      typeof body?.deviceFingerprint === "string" ? body.deviceFingerprint.trim() : "";

    if (key && deviceFingerprint && env.DB) {
      const keyHash = await sha256Hex(key);
      const license = await env.DB.prepare(
        "SELECT id, max_devices FROM licenses WHERE key_hash = ? AND status = 'active'"
      )
        .bind(keyHash)
        .first();

      if (!license) {
        // docs/SECURITE.md §3 : limitation de débit obligatoire sur
        // l'activation de licence (Mission 23 Étape 1 -- "à appliquer dès la
        // première ligne", pas seulement aux nouvelles routes). Comptée
        // uniquement côté échec (clé inconnue/révoquée), jamais sur un
        // succès : c'est la supposition brute-forcée qu'on veut freiner, pas
        // la réactivation légitime répétée d'une clé déjà correcte -- qui
        // n'est jamais un signal d'attaque, quelle que soit sa fréquence.
        // Bucket par IP SEULE (pas IP+clé) : contrairement à une connexion où
        // l'attaquant vise un compte précis, ici il change de clé à chaque
        // essai -- un bucket par clé ne compterait jamais rien (même
        // raisonnement que "inscription", qui n'a pas encore de compte à
        // combiner avec l'IP). La réponse reste NOT_FOUND quoi qu'il arrive :
        // déjà neutre, rien à changer dans `result`.
        await checkRateLimit(env.DB, `activate:${clientIp(request)}`);
      } else {
        const existing = await env.DB.prepare(
          "SELECT token FROM activations WHERE license_id = ? AND device_fingerprint = ?"
        )
          .bind(license.id, deviceFingerprint)
          .first();

        if (existing) {
          await env.DB.prepare(
            "UPDATE activations SET last_seen_at = datetime('now') WHERE license_id = ? AND device_fingerprint = ?"
          )
            .bind(license.id, deviceFingerprint)
            .run();
          const devicesUsed = await countDevices(env.DB, license.id);
          result = {
            valid: true,
            token: existing.token,
            devicesUsed,
            maxDevices: license.max_devices,
          };
        } else {
          const devicesUsed = await countDevices(env.DB, license.id);
          if (devicesUsed >= license.max_devices) {
            result = { valid: false, reason: "DEVICE_LIMIT", devicesUsed, maxDevices: license.max_devices };
          } else {
            const token = randomToken();
            await env.DB.prepare(
              "INSERT INTO activations (license_id, device_fingerprint, token) VALUES (?, ?, ?)"
            )
              .bind(license.id, deviceFingerprint, token)
              .run();
            result = {
              valid: true,
              token,
              devicesUsed: devicesUsed + 1,
              maxDevices: license.max_devices,
            };
          }
        }
      }
    }
  } catch {
    result = { valid: false, reason: "NOT_FOUND" };
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

async function countDevices(db, licenseId) {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM activations WHERE license_id = ?")
    .bind(licenseId)
    .first();
  return row?.n ?? 0;
}

export async function onRequest() {
  return new Response(JSON.stringify({ valid: false, reason: "NOT_FOUND" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
