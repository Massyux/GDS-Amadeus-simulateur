import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "../_lib/passwordHash.js";
import { SecretConfigError } from "../_lib/requiredEnv.js";

// 🔴 Bug critique trouvé en production le 11/10/2026 (functions/_lib/
// passwordHash.js) : l'implémentation WebCrypto de Node.js (utilisée par ce
// fichier de test, et par `wrangler pages dev` en local) accepte sans
// broncher n'importe quel nombre d'itérations PBKDF2 -- seule la VRAIE
// plateforme Workers refuse au-delà de 100 000 (`NotSupportedError`). Aucun
// test local ne peut donc reproduire le plantage lui-même ; ce fichier
// verrouille la seule chose qu'il peut vérifier depuis Node -- que la
// constante ne dépasse plus jamais ce plafond, quelle que soit la raison
// (durcissement futur, copier-coller d'une recommandation OWASP générique
// qui ne connaît pas cette limite de plateforme).
const WORKERS_PBKDF2_MAX_ITERATIONS = 100_000;

// Jamais une vraie valeur -- même esprit que SESSION_SECRET de .dev.vars.
const env = { PASSWORD_PEPPER: "test-password-pepper-never-use-in-prod" };

describe("passwordHash -- plafond PBKDF2 des Workers Cloudflare (bug du 11/10/2026)", () => {
  it("stores an iteration count within the Workers-supported cap", async () => {
    const stored = await hashPassword(env, "un-mot-de-passe-solide");
    const iterations = Number.parseInt(stored.split("$")[1], 10);
    assert.ok(
      iterations <= WORKERS_PBKDF2_MAX_ITERATIONS,
      `hashPassword stores ${iterations} iterations, but Cloudflare Workers' WebCrypto ` +
        `throws NotSupportedError above ${WORKERS_PBKDF2_MAX_ITERATIONS} -- every registration ` +
        `would crash in production exactly like it did on 11/10/2026.`
    );
  });

  it("round-trips: the right password verifies, a wrong one doesn't", async () => {
    const stored = await hashPassword(env, "un-mot-de-passe-solide");
    assert.equal(await verifyPassword(env, "un-mot-de-passe-solide", stored), true);
    assert.equal(await verifyPassword(env, "un-autre-mot-de-passe", stored), false);
  });

  it("never throws on a malformed stored value", async () => {
    assert.equal(await verifyPassword(env, "peu importe", "n'importe quoi"), false);
    assert.equal(await verifyPassword(env, "peu importe", null), false);
    assert.equal(await verifyPassword(env, "peu importe", "pbkdf2$abc$def$ghi"), false);
  });
});

// Poivre (PROMPT-MOTS-DE-PASSE-ET-MAIL.md, 25/10/2026) : HMAC-SHA256 avec un
// secret d'environnement avant PBKDF2, pour compenser le plafond
// d'itérations ci-dessus -- une base volée seule ne suffit plus, il faut
// aussi PASSWORD_PEPPER.
describe("passwordHash -- poivre (PROMPT-MOTS-DE-PASSE-ET-MAIL.md, 25/10/2026)", () => {
  it("tags every newly-hashed password with the peppered algo marker", async () => {
    const stored = await hashPassword(env, "un-mot-de-passe-solide");
    assert.equal(stored.split("$")[0], "pbkdf2-pepper");
  });

  it("a password hashed with one pepper does not verify under a different pepper", async () => {
    const stored = await hashPassword(env, "un-mot-de-passe-solide");
    const otherEnv = { PASSWORD_PEPPER: "un-autre-poivre-totalement-different" };
    assert.equal(await verifyPassword(otherEnv, "un-mot-de-passe-solide", stored), false);
  });

  // 11 vrais comptes existaient déjà en production au moment d'écrire ceci
  // (vérifié avant de commencer, voir JOURNAL.md) -- une bascule brutale du
  // format les aurait tous déconnectés. Un haché hérité (`pbkdf2`, jamais
  // poivré) doit donc continuer à se vérifier exactement comme avant, sans
  // que le poivre y soit appliqué.
  it("still verifies a legacy (unpeppered) hash created before this change", async () => {
    // Haché "à la main", au format d'avant cette session -- équivalent à ce
    // qu'un hashPassword(password) sans poivre aurait produit.
    const crypto_ = globalThis.crypto;
    const salt = crypto_.getRandomValues(new Uint8Array(16));
    const saltHex = [...salt].map((b) => b.toString(16).padStart(2, "0")).join("");
    const keyMaterial = await crypto_.subtle.importKey(
      "raw",
      new TextEncoder().encode("mot-de-passe-herite"),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto_.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
      keyMaterial,
      256
    );
    const hashHex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const legacyStored = `pbkdf2$100000$${saltHex}$${hashHex}`;

    assert.equal(await verifyPassword(env, "mot-de-passe-herite", legacyStored), true);
    assert.equal(await verifyPassword(env, "un-mauvais-mot-de-passe", legacyStored), false);
  });

  it("hashPassword throws loudly (never a silent fallback) when PASSWORD_PEPPER is missing", async () => {
    await assert.rejects(() => hashPassword({}, "un-mot-de-passe-solide"), SecretConfigError);
  });

  // Même pour un haché HÉRITÉ (qui n'a techniquement pas besoin du poivre) :
  // un PASSWORD_PEPPER absent doit échouer bruyamment dans TOUS les cas,
  // jamais seulement "tant qu'il reste un compte hérité à vérifier" -- même
  // motif que le repli silencieux corrigé le 10/10/2026 sur SESSION_SECRET.
  it("verifyPassword throws loudly when PASSWORD_PEPPER is missing, even for a legacy hash", async () => {
    const legacyStored = "pbkdf2$100000$00112233445566778899aabbccddeeff$" + "0".repeat(64);
    await assert.rejects(() => verifyPassword({}, "peu importe", legacyStored), SecretConfigError);
  });
});
