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
  return { status: res.status, body: await res.json().catch(() => null), setCookie: res.headers.get("set-cookie") };
}

async function getJson(path, { cookie } = {}) {
  const res = await fetch(`${server.baseUrl}${path}`, { headers: cookie ? { cookie } : {} });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function getRaw(path, { cookie } = {}) {
  const res = await fetch(`${server.baseUrl}${path}`, { headers: cookie ? { cookie } : {} });
  return { status: res.status, headers: res.headers, bytes: new Uint8Array(await res.arrayBuffer()) };
}

function uniqueEmail() {
  return `etudiant-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function registerAndLogin(name) {
  const email = uniqueEmail();
  const { setCookie } = await post("/api/auth/register", {
    email,
    password: "un-mot-de-passe-solide",
    ...name,
  });
  const cookie = sessionCookie(setCookie);
  const me = await getJson("/api/auth/me", { cookie });
  return { cookie, csrfToken: me.body.csrfToken };
}

async function completeAllLessons(cookie, csrfToken, lessonIds) {
  for (const id of lessonIds) {
    await post(`/api/lessons/${id}/progress`, { status: "completed" }, { cookie, csrfToken });
  }
}

// scripts/seed-dev-course.sql : 16 leçons au total pour "amadeus-niveau-1"
// (Module 1 : ids 1-5, Module 2 : ids 6-16, voir Mission 23 Étape 3).
const ALL_LESSON_IDS = Array.from({ length: 16 }, (_, i) => i + 1);

describe("Mission 23 Étape 5 -- attestation de fin de parcours (real wrangler pages dev + local D1)", { timeout: 60000 }, () => {
  before(async () => {
    server = await startTestServer({ extraSqlFiles: ["scripts/seed-dev-course.sql"] });
  });

  after(async () => {
    await server.stop();
  });

  // Ce fichier enregistre plusieurs comptes par test (jusqu'à 2 pour "never
  // leaks...") -- sous la même "IP" de test que /api/auth/register compte
  // (functions/_lib/rateLimit.js), le total dépasserait le quota (5/15min)
  // avant la fin du fichier sans ce reset. Même parade que platform-api.test.js.
  beforeEach(async () => {
    await server.resetRateLimits();
  });

  it("requires a session", async () => {
    const { status } = await getJson("/api/courses/amadeus-niveau-1/certificate");
    assert.equal(status, 401);
  });

  it("404s for a student who isn't enrolled", async () => {
    const { cookie } = await registerAndLogin();
    const { status } = await getJson("/api/courses/amadeus-niveau-1/certificate", { cookie });
    assert.equal(status, 404);
  });

  it("refuses with NOT_COMPLETED before 100% of the lessons are done", async () => {
    const { cookie, csrfToken } = await registerAndLogin();
    await post("/api/courses/amadeus-niveau-1/enroll", {}, { cookie, csrfToken });
    await completeAllLessons(cookie, csrfToken, [1, 2, 3]); // pas tout

    const { status, body } = await getJson("/api/courses/amadeus-niveau-1/certificate", { cookie });
    assert.equal(status, 403);
    assert.equal(body.error, "NOT_COMPLETED");
    assert.equal(body.total, 16);
    assert.equal(body.completed, 3);
  });

  it("returns a real PDF, with the student's name, once every lesson is completed", async () => {
    const { cookie, csrfToken } = await registerAndLogin({ firstName: "Amina", lastName: "Haddad" });
    await post("/api/courses/amadeus-niveau-1/enroll", {}, { cookie, csrfToken });
    await completeAllLessons(cookie, csrfToken, ALL_LESSON_IDS);

    const { status, headers, bytes } = await getRaw("/api/courses/amadeus-niveau-1/certificate", { cookie });
    assert.equal(status, 200);
    assert.equal(headers.get("content-type"), "application/pdf");
    assert.match(headers.get("content-disposition") || "", /attachment|inline/);
    assert.match(headers.get("content-disposition") || "", /attestation-amadeus-niveau-1\.pdf/);
    assert.equal(headers.get("cache-control"), "private, max-age=0, no-store");

    // En-tête PDF réel ("%PDF-"), pas un texte brut ou une erreur déguisée.
    const magic = new TextDecoder().decode(bytes.slice(0, 5));
    assert.equal(magic, "%PDF-");
    assert.ok(bytes.length > 500, "a real one-page PDF should be more than a few hundred bytes");
  });

  it("falls back to the account email when the student never gave a name", async () => {
    const { cookie, csrfToken } = await registerAndLogin(); // pas de firstName/lastName
    await post("/api/courses/amadeus-niveau-1/enroll", {}, { cookie, csrfToken });
    await completeAllLessons(cookie, csrfToken, ALL_LESSON_IDS);

    const { status, bytes } = await getRaw("/api/courses/amadeus-niveau-1/certificate", { cookie });
    assert.equal(status, 200);
    const magic = new TextDecoder().decode(bytes.slice(0, 5));
    assert.equal(magic, "%PDF-");
  });

  it("never leaks one student's certificate to a different student", async () => {
    const studentA = await registerAndLogin();
    await post("/api/courses/amadeus-niveau-1/enroll", {}, studentA);
    await completeAllLessons(studentA.cookie, studentA.csrfToken, ALL_LESSON_IDS);

    const studentB = await registerAndLogin();
    // B n'est pas inscrit -- doit recevoir 404, jamais l'attestation de A.
    const { status } = await getJson("/api/courses/amadeus-niveau-1/certificate", { cookie: studentB.cookie });
    assert.equal(status, 404);
  });

  it("supports both languages via ?lang=", async () => {
    const { cookie, csrfToken } = await registerAndLogin({ firstName: "John", lastName: "Doe" });
    await post("/api/courses/amadeus-niveau-1/enroll", {}, { cookie, csrfToken });
    await completeAllLessons(cookie, csrfToken, ALL_LESSON_IDS);

    const fr = await getRaw("/api/courses/amadeus-niveau-1/certificate?lang=fr", { cookie });
    const en = await getRaw("/api/courses/amadeus-niveau-1/certificate?lang=en", { cookie });
    assert.equal(fr.status, 200);
    assert.equal(en.status, 200);
    // Deux documents différents (texte différent) -- pas le même PDF renvoyé
    // quel que soit lang.
    assert.notEqual(fr.bytes.length, en.bytes.length);
  });
});
