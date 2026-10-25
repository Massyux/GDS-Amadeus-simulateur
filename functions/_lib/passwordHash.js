// Mot de passe étudiant -- docs/SECURITE.md §1 : "Hachage PBKDF2-HMAC-SHA256
// (100 000 itérations, plafond des Workers Cloudflare) + poivre HMAC-SHA256
// avant PBKDF2, sel aléatoire de 16 octets par utilisateur, via Web Crypto".
// Stocké "algo$iterations$sel$hash" pour pouvoir durcir (augmenter les
// itérations) plus tard sans casser la vérification des hachés existants --
// verifyPassword relit les itérations stockées, pas une constante figée.
//
// Volontairement distinct de functions/_lib/hash.js (sha256Hex) : ce fichier-là
// hache des SECRETS DÉJÀ ALÉATOIRES (clés de licence, phrase admin) où un simple
// SHA-256 suffit ; un mot de passe choisi par un humain a besoin d'un hachage lent
// et salé pour résister au brute-force hors ligne en cas de fuite de la base.
//
// Poivre (PROMPT-MOTS-DE-PASSE-ET-MAIL.md, 25/10/2026) : le plafond de 100 000
// itérations (voir plus bas) est six fois sous la recommandation OWASP pour cet
// algorithme, et c'est une limite dure de la plateforme -- on ne peut pas monter.
// Documenter cette faiblesse ne la compense pas ; ce qui la compense, c'est de
// faire passer le mot de passe par un HMAC-SHA256 avec un secret d'environnement
// (`PASSWORD_PEPPER`, lu via requireSecret -- jamais de repli silencieux, motif
// corrigé le 10/10/2026 sur SESSION_SECRET/ADMIN_SECRET_HASH) AVANT PBKDF2. Une
// base volée seule ne suffit alors plus à casser les mots de passe hors ligne :
// il faudrait aussi ce secret, qui ne vit jamais dans la base.
//
// Format à deux générations, DÉLIBÉRÉMENT (pas un simple renommage) : au moment
// d'écrire ceci, la base de production contient 11 comptes réels (dont des
// inscriptions actives), pas 1 comme supposé au départ -- une bascule brutale du
// format aurait déconnecté tout le monde. `pbkdf2` (hérité, sans poivre) reste
// vérifiable exactement comme avant ; `pbkdf2-pepper` (toute écriture à partir
// de cette date -- inscription, réinitialisation) applique le poivre. Un compte
// hérité migre tout seul au nouveau format la prochaine fois qu'il change de mot
// de passe (réinitialisation) -- aucune action requise de personne, aucun compte
// bloqué.
import { constantTimeEqual } from "./hash.js";
import { requireSecret } from "./requiredEnv.js";

const ALGO_LEGACY = "pbkdf2";
const ALGO_PEPPERED = "pbkdf2-pepper";
// 🔴 Bug critique trouvé en production le 11/10/2026 : cette constante valait
// 600 000 (docs/SECURITE.md §1 d'alors) -- un nombre jamais atteignable en
// réalité. L'implémentation WebCrypto des Workers Cloudflare (PAS celle de
// Node.js, utilisée par tous les tests locaux et par `wrangler pages dev`)
// refuse purement et simplement toute itération PBKDF2 au-delà de 100 000 :
// `NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not
// supported`. Résultat réel en production, jamais vu en local : CHAQUE
// inscription (hashPassword) et chaque réinitialisation de mot de passe
// plantait, sans exception -- aucun compte n'a jamais pu être créé depuis le
// déploiement de Mission 23. `verifyPassword` ne plantait pas (son propre
// try/catch avale l'erreur et renvoie `false`), donc une connexion échouait
// "normalement", comme un mauvais mot de passe -- plus difficile à repérer.
// 100 000 est donc un plafond de la plateforme cible, pas un choix de
// compromis sécurité/performance -- docs/SECURITE.md §1 corrigé en
// conséquence. Ne JAMAIS remonter cette valeur sans vérifier d'abord un vrai
// déploiement Workers (jamais seulement `wrangler pages dev` en local, qui ne
// reproduit pas cette limite).
const ITERATIONS = 100_000;
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

// HMAC-SHA256(key=poivre, message=mot de passe) -> hex -- c'est CE texte hex,
// pas le mot de passe brut, qui devient la matière première de PBKDF2 pour un
// haché `pbkdf2-pepper`. Un attaquant en possession de la seule base ne peut
// reproduire cette étape sans connaître `PASSWORD_PEPPER`.
async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(signature);
}

async function deriveHex(material, saltBytes, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(material),
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

// @param {Record<string, unknown>} env -- doit porter PASSWORD_PEPPER (requireSecret lève sinon).
export async function hashPassword(env, password) {
  const pepper = requireSecret(env, "PASSWORD_PEPPER");
  const peppered = await hmacHex(pepper, password);
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hashHex = await deriveHex(peppered, saltBytes, ITERATIONS);
  return `${ALGO_PEPPERED}$${ITERATIONS}$${toHex(saltBytes)}$${hashHex}`;
}

// Never throws on a malformed STORED HASH (corrupt salt hex, unknown algo
// tag...) -- a corrupt/foreign value should just fail verification, not
// crash the login endpoint. A missing/invalid PASSWORD_PEPPER is different:
// requireSecret's throw is left to propagate (not caught here), exactly the
// "fail loudly" contract from functions/_lib/requiredEnv.js -- swallowing it
// would silently turn "misconfigured environment" into "wrong password",
// the same disguise that hid the PBKDF2 iteration cap for days on 11/10/2026.
// Called even to verify a LEGACY (unpeppered) hash, on purpose: a missing
// pepper must never go unnoticed just because the one account being checked
// happens not to need it yet.
export async function verifyPassword(env, password, stored) {
  if (typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const [algo, iterationsRaw, saltHex, hashHex] = parts;
  if (algo !== ALGO_LEGACY && algo !== ALGO_PEPPERED) return false;

  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const pepper = requireSecret(env, "PASSWORD_PEPPER");

  try {
    const material = algo === ALGO_PEPPERED ? await hmacHex(pepper, password) : password;
    const saltBytes = fromHex(saltHex);
    const computedHex = await deriveHex(material, saltBytes, iterations);
    return constantTimeEqual(computedHex, hashHex);
  } catch {
    return false;
  }
}
