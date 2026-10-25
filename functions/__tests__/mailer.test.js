import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { sendMail, devEchoEnabled } from "../_lib/mailer.js";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("mailer.js -- Brevo (PROMPT-MOTS-DE-PASSE-ET-MAIL.md, 25/10/2026, chantier 2)", () => {
  it("calls Brevo's transactional endpoint with the sender/recipient/subject/text", async () => {
    let captured;
    globalThis.fetch = async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ messageId: "x" }), { status: 201 });
    };

    await sendMail(
      { BREVO_API_KEY: "test-brevo-key-never-use-in-prod" },
      { to: "etudiant@example.com", subject: "Sujet de test", text: "Corps de test" }
    );

    assert.equal(captured.url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(captured.init.method, "POST");
    assert.equal(captured.init.headers["api-key"], "test-brevo-key-never-use-in-prod");
    const payload = JSON.parse(captured.init.body);
    assert.deepEqual(payload.sender, { email: "contact@orionisacademy.com", name: "Orionis Academy" });
    assert.deepEqual(payload.to, [{ email: "etudiant@example.com" }]);
    assert.equal(payload.subject, "Sujet de test");
    assert.equal(payload.textContent, "Corps de test");
    assert.equal(payload.htmlContent, undefined, "no HTML content unless explicitly provided");
  });

  it("includes htmlContent only when a html body is explicitly passed", async () => {
    let captured;
    globalThis.fetch = async (url, init) => {
      captured = init;
      return new Response("{}", { status: 201 });
    };
    await sendMail(
      { BREVO_API_KEY: "test-brevo-key-never-use-in-prod" },
      { to: "a@b.com", subject: "s", text: "t", html: "<p>t</p>" }
    );
    assert.equal(JSON.parse(captured.body).htmlContent, "<p>t</p>");
  });

  it(
    "never rejects when BREVO_API_KEY is missing -- the caller's neutral anti-énumération " +
      "response must never depend on whether a real e-mail could be sent",
    async () => {
      let fetchCalled = false;
      globalThis.fetch = async () => {
        fetchCalled = true;
        return new Response("{}", { status: 200 });
      };
      await assert.doesNotReject(() => sendMail({}, { to: "a@b.com", subject: "s", text: "t" }));
      assert.equal(fetchCalled, false, "no network call should be attempted without a key");
    }
  );

  it("never rejects when Brevo itself answers with an error status", async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 });
    await assert.doesNotReject(() =>
      sendMail({ BREVO_API_KEY: "test-brevo-key-never-use-in-prod" }, { to: "a@b.com", subject: "s", text: "t" })
    );
  });

  it("never rejects on a network failure", async () => {
    globalThis.fetch = async () => {
      throw new Error("network down");
    };
    await assert.doesNotReject(() =>
      sendMail({ BREVO_API_KEY: "test-brevo-key-never-use-in-prod" }, { to: "a@b.com", subject: "s", text: "t" })
    );
  });
});

describe("mailer.js -- devEchoEnabled", () => {
  it("is true only when MAIL_DEV_ECHO is the exact string \"1\"", () => {
    assert.equal(devEchoEnabled({ MAIL_DEV_ECHO: "1" }), true);
    assert.equal(devEchoEnabled({ MAIL_DEV_ECHO: "true" }), false);
    assert.equal(devEchoEnabled({ MAIL_DEV_ECHO: 1 }), false);
    assert.equal(devEchoEnabled({}), false);
  });
});
