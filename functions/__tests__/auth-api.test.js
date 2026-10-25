import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { startTestServer } from "./testServer.js";

let server;

function sessionCookie(setCookieHeader) {
  return setCookieHeader ? setCookieHeader.split(";")[0] : null;
}

async function post(path, body, { cookie, csrfToken } = {}) {
  const res = await fetch(`${server.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json(), setCookie: res.headers.get("set-cookie") };
}

async function get(path, { cookie } = {}) {
  const res = await fetch(`${server.baseUrl}${path}`, { headers: cookie ? { cookie } : {} });
  return { status: res.status, body: await res.json() };
}

function uniqueEmail() {
  return `etudiant-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

describe(
  "Mission 23 Étape 1 -- auth API (real wrangler pages dev + local D1)",
  { timeout: 60000 },
  () => {
    before(async () => {
      server = await startTestServer();
    });

    after(async () => {
      await server.stop();
    });

    // Every test gets a full rate-limit quota -- see testServer.js
    // resetRateLimits for why this is necessary (one fake IP shared by every
    // local/test request).
    beforeEach(async () => {
      await server.resetRateLimits();
    });

    describe("register", () => {
      it("creates an account and logs the caller in (session cookie set)", async () => {
        const email = uniqueEmail();
        const { status, body, setCookie } = await post("/api/auth/register", {
          email,
          password: "un-mot-de-passe-solide",
          firstName: "Yacine",
          lastName: "Test",
        });
        assert.equal(status, 200);
        assert.equal(body.ok, true);
        assert.ok(setCookie, "a session cookie must be set on successful registration");

        const me = await get("/api/auth/me", { cookie: sessionCookie(setCookie) });
        assert.equal(me.body.user.email, email);
        assert.ok(me.body.csrfToken);
      });

      it("rejects a password shorter than 12 characters with an actionable message", async () => {
        const { body, setCookie } = await post("/api/auth/register", {
          email: uniqueEmail(),
          password: "short1",
        });
        assert.equal(body.ok, false);
        assert.match(body.error, /12 caractères/);
        assert.equal(setCookie, null);
      });

      it("rejects a common password", async () => {
        // >= 12 caractères (sinon le refus porte sur la longueur avant même
        // d'atteindre le contrôle de liste -- voir validators.js) mais
        // présent dans commonPasswords.js.
        const { body } = await post("/api/auth/register", {
          email: uniqueEmail(),
          password: "administrateur",
        });
        assert.equal(body.ok, false);
        assert.match(body.error, /trop courant/);
      });

      it("rejects a malformed email", async () => {
        const { body } = await post("/api/auth/register", {
          email: "pas-un-email",
          password: "un-mot-de-passe-solide",
        });
        assert.equal(body.ok, false);
        assert.match(body.error, /invalide/);
      });

      it(
        "anti-énumération: registering an already-used email returns the same {ok:true} " +
          "shape, but creates no session and never touches the existing account's password",
        async () => {
          const email = uniqueEmail();
          await post("/api/auth/register", { email, password: "mot-de-passe-original-1" });

          const collision = await post("/api/auth/register", {
            email,
            password: "mot-de-passe-attaquant-2",
          });
          assert.equal(collision.status, 200);
          assert.deepEqual(collision.body, { ok: true });
          assert.equal(collision.setCookie, null, "a collision must never grant a session");

          const loginOriginal = await post("/api/auth/login", {
            email,
            password: "mot-de-passe-original-1",
          });
          assert.equal(loginOriginal.body.ok, true, "the original password must still work");

          const loginAttacker = await post("/api/auth/login", {
            email,
            password: "mot-de-passe-attaquant-2",
          });
          assert.equal(loginAttacker.body.ok, false, "the account must not have been overwritten");
        }
      );

      it(
        "🔴 bug fixed 11/10/2026: exceeding the rate limit (15/15min/IP) returns the same " +
          "generic failure as any other error, never {ok:true} -- a fake success used to " +
          "leave the caller believing an account was created when none was",
        async () => {
          let last;
          for (let i = 0; i < 15; i += 1) {
            last = await post("/api/auth/register", {
              email: uniqueEmail(),
              password: "un-mot-de-passe-solide",
            });
            assert.equal(last.body.ok, true, `attempt ${i + 1}/15 should still be within quota`);
          }

          const blockedEmail = uniqueEmail();
          const blocked = await post("/api/auth/register", {
            email: blockedEmail,
            password: "un-mot-de-passe-solide",
          });
          assert.equal(blocked.body.ok, false);
          assert.equal(blocked.body.error, "Une erreur est survenue, réessaie.");
          assert.equal(blocked.setCookie, null);

          const loginAttempt = await post("/api/auth/login", {
            email: blockedEmail,
            password: "un-mot-de-passe-solide",
          });
          assert.equal(loginAttempt.body.ok, false, "no account should exist for the blocked email");
        }
      );
    });

    describe("login", () => {
      it("anti-énumération: unknown email and wrong password return the exact same message", async () => {
        const email = uniqueEmail();
        await post("/api/auth/register", { email, password: "un-mot-de-passe-solide" });

        const wrongPassword = await post("/api/auth/login", { email, password: "mauvais-mdp-1" });
        const unknownEmail = await post("/api/auth/login", {
          email: uniqueEmail(),
          password: "peu-importe-1",
        });

        assert.equal(wrongPassword.status, unknownEmail.status);
        assert.deepEqual(wrongPassword.body, unknownEmail.body);
        assert.equal(wrongPassword.body.ok, false);
      });

      it(
        "rate limit (5/15min/IP+compte) is neutral: the 6th attempt fails identically " +
          "even with the correct password",
        async () => {
          const email = uniqueEmail();
          await post("/api/auth/register", { email, password: "un-mot-de-passe-solide" });

          let last;
          for (let i = 0; i < 5; i += 1) {
            last = await post("/api/auth/login", { email, password: "mauvais-mdp" });
            assert.equal(last.body.ok, false);
          }

          const sixthWithCorrectPassword = await post("/api/auth/login", {
            email,
            password: "un-mot-de-passe-solide",
          });
          assert.equal(sixthWithCorrectPassword.status, last.status);
          assert.deepEqual(sixthWithCorrectPassword.body, last.body);
          assert.equal(sixthWithCorrectPassword.setCookie, null);
        }
      );
    });

    describe("me / logout", () => {
      it("returns user: null without a session cookie", async () => {
        const { body } = await get("/api/auth/me");
        assert.deepEqual(body, { user: null });
      });

      it("logout requires a valid CSRF token and actually invalidates the session", async () => {
        const email = uniqueEmail();
        const { setCookie } = await post("/api/auth/register", {
          email,
          password: "un-mot-de-passe-solide",
        });
        const cookie = sessionCookie(setCookie);
        const me = await get("/api/auth/me", { cookie });
        const { csrfToken } = me.body;

        const withoutCsrf = await post("/api/auth/logout", {}, { cookie });
        assert.equal(withoutCsrf.status, 403);

        const stillLoggedIn = await get("/api/auth/me", { cookie });
        assert.ok(stillLoggedIn.body.user, "a rejected logout must not end the session");

        const withCsrf = await post("/api/auth/logout", {}, { cookie, csrfToken });
        assert.equal(withCsrf.body.ok, true);

        const afterLogout = await get("/api/auth/me", { cookie });
        assert.deepEqual(afterLogout.body, { user: null });
      });
    });

    describe("forgot-password / reset-password", () => {
      it("always returns {ok:true}, whether the email exists or not (anti-énumération)", async () => {
        const known = await post("/api/auth/forgot-password", { email: uniqueEmail() });
        const unknown = await post("/api/auth/forgot-password", { email: uniqueEmail() });
        assert.equal(known.body.ok, true);
        assert.equal(unknown.body.ok, true);
      });

      it(
        "a full reset changes the password, invalidates every existing session, " +
          "and the token can't be reused",
        async () => {
          const email = uniqueEmail();
          const { setCookie } = await post("/api/auth/register", {
            email,
            password: "ancien-mot-de-passe-1",
          });
          const oldCookie = sessionCookie(setCookie);
          assert.ok((await get("/api/auth/me", { cookie: oldCookie })).body.user);

          const forgot = await post("/api/auth/forgot-password", { email });
          assert.ok(forgot.body.devResetToken, "MAIL_DEV_ECHO=1 must expose the raw token in tests");

          const reset = await post("/api/auth/reset-password", {
            token: forgot.body.devResetToken,
            newPassword: "nouveau-mot-de-passe-2",
          });
          assert.equal(reset.body.ok, true);

          const oldSessionNowDead = await get("/api/auth/me", { cookie: oldCookie });
          assert.deepEqual(oldSessionNowDead.body, { user: null });

          const loginOld = await post("/api/auth/login", { email, password: "ancien-mot-de-passe-1" });
          assert.equal(loginOld.body.ok, false);

          const loginNew = await post("/api/auth/login", { email, password: "nouveau-mot-de-passe-2" });
          assert.equal(loginNew.body.ok, true);

          const reuse = await post("/api/auth/reset-password", {
            token: forgot.body.devResetToken,
            newPassword: "encore-un-autre-3",
          });
          assert.equal(reuse.body.ok, false);
        }
      );

      it("rejects an unknown/garbage token with an actionable message", async () => {
        const { body } = await post("/api/auth/reset-password", {
          token: "0".repeat(64),
          newPassword: "un-mot-de-passe-solide",
        });
        assert.equal(body.ok, false);
        assert.match(body.error, /invalide ou a expiré/);
      });
    });

    describe("license activation rate limiting (docs/SECURITE.md §3, family fix)", () => {
      it("is also neutral: repeated attempts on an unknown key keep returning NOT_FOUND", async () => {
        let last;
        for (let i = 0; i < 6; i += 1) {
          last = await post("/api/license/activate", {
            key: "GDS-0000-0000",
            deviceFingerprint: "fp-test",
          });
        }
        assert.deepEqual(last.body, { valid: false, reason: "NOT_FOUND" });
      });
    });
  }
);
