// Unit tests purs (pas de wrangler/D1 -- ces modules n'ont pas besoin d'un
// vrai binding pour exercer le comportement testé ici) pour le bug critique
// du 09/10/2026 (TASKS.md) : env.SESSION_SECRET || "" / env.ADMIN_SECRET_HASH
// || "" retombait silencieusement sur la chaîne vide comme clé HMAC quand la
// variable d'environnement était absente -- jetons de session, CSRF et
// liens de téléchargement signés devenaient forgeables par n'importe qui.
//
// Chaque test ci-dessous échouait avant la correction (la fonction testée
// réussissait silencieusement avec une clé vide au lieu de lever) et passe
// après.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requireSecret, SecretConfigError } from "../_lib/requiredEnv.js";
import { createSession, getSession } from "../_lib/session.js";
import { csrfTokenForSession, verifyCsrfToken } from "../_lib/csrf.js";
import { signDownloadUrl, verifyDownloadToken } from "../_lib/fileAccess.js";
import { requireAdmin } from "../_lib/adminAuth.js";

function fakeRequestWithCookie(cookieValue) {
  return {
    headers: {
      get(name) {
        if (name === "cookie") return `session=${cookieValue}`;
        return null;
      },
    },
    url: "https://example.test/",
  };
}

function fakeRequestWithBearer(token) {
  return {
    headers: {
      get(name) {
        if (name === "authorization") return `Bearer ${token}`;
        return null;
      },
    },
  };
}

describe("requireSecret", () => {
  it("returns the value when it is long enough", () => {
    assert.equal(requireSecret({ FOO: "a".repeat(32) }, "FOO"), "a".repeat(32));
  });

  it("throws SecretConfigError when the variable is missing", () => {
    assert.throws(() => requireSecret({}, "FOO"), SecretConfigError);
  });

  it("throws when the variable is an empty string", () => {
    assert.throws(() => requireSecret({ FOO: "" }, "FOO"), SecretConfigError);
  });

  it("throws when the variable is shorter than the minimum length", () => {
    assert.throws(() => requireSecret({ FOO: "short" }, "FOO"), SecretConfigError);
  });

  it("never silently falls back to an empty string", () => {
    // La forme exacte du bug corrigé : plus aucun appelant ne doit pouvoir
    // obtenir "" en retour pour signer/vérifier un HMAC.
    assert.throws(() => requireSecret({ FOO: undefined }, "FOO"));
  });
});

describe("session.js -- fails loudly without SESSION_SECRET", () => {
  it("createSession throws before writing anything to D1", async () => {
    let dbTouched = false;
    const env = {
      get DB() {
        dbTouched = true;
        return { prepare: () => ({ bind: () => ({ run: async () => {} }) }) };
      },
    };
    await assert.rejects(() => createSession(env, {}, 1), SecretConfigError);
    assert.equal(dbTouched, false, "must validate the secret before touching D1");
  });

  it("getSession throws instead of verifying a cookie against an empty-key signature", async () => {
    const env = {}; // no SESSION_SECRET
    const request = fakeRequestWithCookie("anything.anything");
    await assert.rejects(() => getSession(env, request), SecretConfigError);
  });
});

describe("csrf.js -- fails loudly without SESSION_SECRET", () => {
  it("csrfTokenForSession throws", async () => {
    await assert.rejects(() => csrfTokenForSession({}, "session-id"), SecretConfigError);
  });

  it("verifyCsrfToken throws rather than silently rejecting", async () => {
    await assert.rejects(() => verifyCsrfToken({}, "session-id", "whatever"), SecretConfigError);
  });
});

describe("fileAccess.js -- fails loudly without SESSION_SECRET", () => {
  it("signDownloadUrl throws", async () => {
    await assert.rejects(
      () => signDownloadUrl({}, { fileKey: "x", userId: 1, courseId: 1 }),
      SecretConfigError
    );
  });

  it("verifyDownloadToken throws instead of accepting an empty-key-forged token", async () => {
    await assert.rejects(() => verifyDownloadToken({}, "anything.anything"), SecretConfigError);
  });
});

describe("adminAuth.js -- fails loudly without ADMIN_SECRET_HASH", () => {
  it("requireAdmin throws when a bearer token is presented but the secret is unconfigured", async () => {
    const request = fakeRequestWithBearer("anything.anything");
    await assert.rejects(() => requireAdmin(request, {}), SecretConfigError);
  });

  it("requireAdmin still returns null (not a throw) when there is simply no Authorization header", async () => {
    const request = { headers: { get: () => null } };
    assert.equal(await requireAdmin(request, {}), null);
  });
});
