// Mot de passe étudiant -- docs/SECURITE.md §1 : "Hachage PBKDF2-HMAC-SHA256,
// >= 600 000 itérations, sel aléatoire de 16 octets par utilisateur, via Web
// Crypto". Stocké "algo$iterations$sel$hash" pour pouvoir durcir (augmenter les
// itérations) plus tard sans casser la vérification des hachés existants --
// verifyPassword relit les itérations stockées, pas une constante figée.
//
// Volontairement distinct de functions/_lib/hash.js (sha256Hex) : ce fichier-là
// hache des SECRETS DÉJÀ ALÉATOIRES (clés de licence, phrase admin) où un simple
// SHA-256 suffit ; un mot de passe choisi par un humain a besoin d'un hachage lent
// et salé pour résister au brute-force hors ligne en cas de fuite de la base.
import { constantTimeEqual } from "./hash.js";

const ALGO = "pbkdf2";
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function toHex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function deriveHex(password, saltBytes, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    keyMaterial,
    HASH_BITS
  );
  return toHex(bits);
}

export async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hashHex = await deriveHex(password, saltBytes, ITERATIONS);
  return `${ALGO}$${ITERATIONS}$${toHex(saltBytes)}$${hashHex}`;
}

// Never throws on a malformed stored value -- a corrupt/foreign hash should
// just fail verification, not crash the login endpoint.
export async function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== ALGO) return false;

  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  try {
    const saltBytes = fromHex(parts[2]);
    const computedHex = await deriveHex(password, saltBytes, iterations);
    return constantTimeEqual(computedHex, parts[3]);
  } catch {
    return false;
  }
}
