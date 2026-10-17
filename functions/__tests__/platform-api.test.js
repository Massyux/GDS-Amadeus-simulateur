import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { startTestServer } from "./testServer.js";
import { signToken } from "../_lib/token.js";

// Matches .dev.vars' SESSION_SECRET (gitignored, test-only value) -- needed
// here to forge a token with a *valid* signature but a payload that bypasses
// the normal mint flow entirely, to test download.js's own re-check in
// isolation from functions/api/lessons/[id]/index.js's.
const TEST_SESSION_SECRET = "test-session-secret-never-use-in-prod";

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
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();
  return { status: res.status, body, headers: res.headers };
}

function uniqueEmail() {
  return `etudiant-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function registerAndLogin() {
  const email = uniqueEmail();
  const { setCookie } = await post("/api/auth/register", { email, password: "un-mot-de-passe-solide" });
  const cookie = sessionCookie(setCookie);
  const me = await get("/api/auth/me", { cookie });
  return { cookie, csrfToken: me.body.csrfToken, userId: me.body.user.id };
}

describe(
  "Mission 23 Étape 2 -- platform API (real wrangler pages dev + local D1 + R2)",
  { timeout: 60000 },
  () => {
    before(async () => {
      server = await startTestServer({ extraSqlFiles: ["scripts/seed-dev-course.sql"] });
      await server.seedFile("support.pdf", "%PDF-1.4 fake pdf content");
      await server.seedFile("fiche1.txt", "fiche 1");
      await server.seedFile("fiche2.txt", "fiche 2");
    });

    after(async () => {
      await server.stop();
    });

    beforeEach(async () => {
      await server.resetRateLimits();
    });

    describe("catalogue", () => {
      it("lists the published course with lesson count and no enrollment yet", async () => {
        const { cookie } = await registerAndLogin();
        const { body } = await get("/api/courses", { cookie });
        const course = body.courses.find((c) => c.slug === "amadeus-niveau-1");
        assert.ok(course, "seeded course must appear in the catalogue");
        assert.equal(course.enrolled, false);
        assert.equal(course.lessonCount, 16);
      });

      // Rendue publique le 17/10/2026 (PROMPT-PASSE-ACCUEIL.md, "vitrine
      // d'accueil") : la vitrine de l'accueil et le catalogue complet
      // doivent pouvoir s'afficher à un visiteur sans session. `enrolled`
      // reste `false` et aucun champ personnel (`next*`) n'est calculé.
      it("is public: an anonymous visitor sees the published course without personal fields", async () => {
        const { status, body } = await get("/api/courses");
        assert.equal(status, 200);
        const course = body.courses.find((c) => c.slug === "amadeus-niveau-1");
        assert.ok(course, "seeded course must appear even without a session");
        assert.equal(course.enrolled, false);
        assert.equal(course.nextLessonId, null);
      });
    });

    describe("course detail", () => {
      it("shows the outline with lesson titles/types before enrollment, but not enrolled", async () => {
        const { cookie } = await registerAndLogin();
        const { body } = await get("/api/courses/amadeus-niveau-1", { cookie });
        assert.equal(body.enrolled, false);
        assert.equal(body.modules[0].lessons.length, 5);
        assert.equal(body.modules[0].lessons[0].type, "texte");
      });

      it("404s for an unknown slug", async () => {
        const { cookie } = await registerAndLogin();
        const { status } = await get("/api/courses/ne-existe-pas", { cookie });
        assert.equal(status, 404);
      });

      // Rendue publique le 17/10/2026 (PROMPT-PASSE-ACCUEIL.md) : même
      // sommaire pour un visiteur anonyme, sans aucune session.
      it("is public: an anonymous visitor sees the outline, marked not enrolled", async () => {
        const { status, body } = await get("/api/courses/amadeus-niveau-1");
        assert.equal(status, 200);
        assert.equal(body.enrolled, false);
        assert.equal(body.modules[0].lessons[0].isPreview, true);
      });
    });

    describe("enrollment gating (docs/SECURITE.md §9 checklist item)", () => {
      // Leçon 1 est l'aperçu gratuit (scripts/seed-dev-course.sql) --
      // volontairement ouverte à tous depuis le 17/10/2026, voir le
      // describe "aperçu gratuit" plus bas. La leçon 2 (vidéo, sans
      // `isPreview`) reste le cas "verrouillé" de référence pour ce test.
      it("a non-enrolled student cannot read a non-preview lesson's content", async () => {
        const { cookie } = await registerAndLogin();
        const { status, body } = await get("/api/lessons/2", { cookie });
        assert.equal(status, 404);
        assert.deepEqual(body, { error: "NOT_FOUND" });
      });

      it("enroll requires CSRF", async () => {
        const { cookie } = await registerAndLogin();
        const { status } = await post("/api/courses/amadeus-niveau-1/enroll", {}, { cookie });
        assert.equal(status, 403);
      });

      it("after enrolling, the same student can read every lesson type", async () => {
        const { cookie, csrfToken } = await registerAndLogin();
        const enroll = await post("/api/courses/amadeus-niveau-1/enroll", {}, { cookie, csrfToken });
        assert.equal(enroll.body.ok, true);

        const texte = await get("/api/lessons/1", { cookie });
        // Le mot "Bienvenue" est le TITRE de la leçon (texte.body.lesson.title),
        // pas son corps -- le corps avait son propre "# Bienvenue" en doublon,
        // retiré du fixture (scripts/seed-dev-course.sql) lors d'une revue
        // visuelle antérieure (bug de titre dupliqué à l'affichage).
        assert.match(texte.body.lesson.content.body, /Au programme/);
        assert.equal(texte.body.nav.prevId, null);
        assert.equal(texte.body.nav.nextId, 2);

        const video = await get("/api/lessons/2", { cookie });
        assert.match(video.body.lesson.content.embedUrl, /youtube-nocookie\.com/);
        assert.equal(video.body.nav.prevId, 1);
        assert.equal(video.body.nav.nextId, 3);

        const live = await get("/api/lessons/3", { cookie });
        assert.equal(live.body.lesson.content.state, "a-venir");

        const pdf = await get("/api/lessons/4", { cookie });
        assert.ok(pdf.body.lesson.content.downloadUrl.startsWith("/api/files/download?token="));

        const fichier = await get("/api/lessons/5", { cookie });
        assert.equal(fichier.body.lesson.content.files.length, 2);
      });

      it("a DIFFERENT student (not enrolled) still can't read the same lesson ids", async () => {
        const studentA = await registerAndLogin();
        await post("/api/courses/amadeus-niveau-1/enroll", {}, studentA);
        const studentB = await registerAndLogin();
        const { status } = await get("/api/lessons/2", { cookie: studentB.cookie });
        assert.equal(status, 404);
      });
    });

    // Aperçu gratuit sans compte (PROMPT-PASSE-ACCUEIL.md chantier 2,
    // 17/10/2026) : la leçon 1 porte `isPreview:true` dans son `content`
    // (scripts/seed-dev-course.sql) -- doit s'ouvrir à N'IMPORTE QUI, avec
    // ou sans session, contrairement à toute autre leçon du cours.
    describe("aperçu gratuit (isPreview)", () => {
      it("a completely anonymous visitor (no session at all) can read the free preview lesson", async () => {
        const { status, body } = await get("/api/lessons/1");
        assert.equal(status, 200);
        assert.equal(body.lesson.isPreview, true);
        assert.equal(body.enrolled, false);
        assert.match(body.lesson.content.body, /Au programme/);
      });

      it("a logged-in but non-enrolled student can also read it", async () => {
        const { cookie } = await registerAndLogin();
        const { status, body } = await get("/api/lessons/1", { cookie });
        assert.equal(status, 200);
        assert.equal(body.enrolled, false);
      });

      it(
        "a forged-but-validly-signed preview download token bypasses the enrollment " +
          "re-check in download.js -- proves the bypass is scoped to isPreview, not a " +
          "blanket skip (functions/_lib/fileAccess.js, functions/api/files/download.js)",
        async () => {
          const previewToken = await signToken(
            { fileKey: "support.pdf", userId: null, courseId: 1, isPreview: true, exp: Date.now() + 10 * 60 * 1000 },
            TEST_SESSION_SECRET
          );
          const res = await fetch(`${server.baseUrl}/api/files/download?token=${encodeURIComponent(previewToken)}`);
          const text = await res.text();
          assert.equal(res.status, 200);
          assert.match(text, /fake pdf content/);
        }
      );

      it("the same token shape WITHOUT isPreview is rejected for an anonymous (null) userId", async () => {
        const nonPreviewToken = await signToken(
          { fileKey: "support.pdf", userId: null, courseId: 1, exp: Date.now() + 10 * 60 * 1000 },
          TEST_SESSION_SECRET
        );
        const res = await fetch(`${server.baseUrl}/api/files/download?token=${encodeURIComponent(nonPreviewToken)}`);
        assert.equal(res.status, 404);
      });
    });

    describe("signed file download (docs/SECURITE.md §5)", () => {
      it("a valid signed URL from an enrolled student streams the real file content", async () => {
        const { cookie, csrfToken } = await registerAndLogin();
        await post("/api/courses/amadeus-niveau-1/enroll", {}, { cookie, csrfToken });
        const pdf = await get("/api/lessons/4", { cookie });
        const res = await fetch(`${server.baseUrl}${pdf.body.lesson.content.downloadUrl}`);
        const text = await res.text();
        assert.equal(res.status, 200);
        assert.match(text, /fake pdf content/);
      });

      it("a garbage/forged token is rejected", async () => {
        const res = await fetch(`${server.baseUrl}/api/files/download?token=not-a-real-token`);
        assert.equal(res.status, 404);
      });

      it(
        "a VALIDLY-SIGNED token is still rejected if its own userId isn't enrolled -- " +
          "proves download.js re-checks enrollment itself, not just the signature " +
          "(functions/_lib/fileAccess.js documents this as deliberate, not redundant)",
        async () => {
          const neverEnrolled = await registerAndLogin();
          const forgedToken = await signToken(
            {
              fileKey: "support.pdf",
              userId: neverEnrolled.userId,
              courseId: 1,
              exp: Date.now() + 10 * 60 * 1000,
            },
            TEST_SESSION_SECRET
          );
          const res = await fetch(`${server.baseUrl}/api/files/download?token=${encodeURIComponent(forgedToken)}`);
          assert.equal(res.status, 404);
        }
      );
    });

    describe("progress + account (reprise en un clic)", () => {
      it("marking a lesson completed updates the account's next-lesson pointer", async () => {
        const { cookie, csrfToken } = await registerAndLogin();
        await post("/api/courses/amadeus-niveau-1/enroll", {}, { cookie, csrfToken });

        const before1 = await get("/api/account", { cookie });
        const courseBefore = before1.body.courses.find((c) => c.slug === "amadeus-niveau-1");
        assert.equal(courseBefore.completedCount, 0);
        assert.equal(courseBefore.nextLessonId, 1);

        const progress = await post("/api/lessons/1/progress", { status: "completed" }, { cookie, csrfToken });
        assert.equal(progress.body.ok, true);

        const after1 = await get("/api/account", { cookie });
        const courseAfter = after1.body.courses.find((c) => c.slug === "amadeus-niveau-1");
        assert.equal(courseAfter.completedCount, 1);
        assert.equal(courseAfter.nextLessonId, 2);
      });

      it("progress requires enrollment, not just a valid session", async () => {
        const { cookie, csrfToken } = await registerAndLogin();
        const { status } = await post("/api/lessons/1/progress", { status: "completed" }, { cookie, csrfToken });
        assert.equal(status, 404);
      });
    });
  }
);
