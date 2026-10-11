import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "../_lib/passwordHash.js";

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

describe("passwordHash -- plafond PBKDF2 des Workers Cloudflare (bug du 11/10/2026)", () => {
  it("stores an iteration count within the Workers-supported cap", async () => {
    const stored = await hashPassword("un-mot-de-passe-solide");
    const iterations = Number.parseInt(stored.split("$")[1], 10);
    assert.ok(
      iterations <= WORKERS_PBKDF2_MAX_ITERATIONS,
      `hashPassword stores ${iterations} iterations, but Cloudflare Workers' WebCrypto ` +
        `throws NotSupportedError above ${WORKERS_PBKDF2_MAX_ITERATIONS} -- every registration ` +
        `would crash in production exactly like it did on 11/10/2026.`
    );
  });

  it("round-trips: the right password verifies, a wrong one doesn't", async () => {
    const stored = await hashPassword("un-mot-de-passe-solide");
    assert.equal(await verifyPassword("un-mot-de-passe-solide", stored), true);
    assert.equal(await verifyPassword("un-autre-mot-de-passe", stored), false);
  });

  it("never throws on a malformed stored value", async () => {
    assert.equal(await verifyPassword("peu importe", "n'importe quoi"), false);
    assert.equal(await verifyPassword("peu importe", null), false);
    assert.equal(await verifyPassword("peu importe", "pbkdf2$abc$def$ghi"), false);
  });
});
