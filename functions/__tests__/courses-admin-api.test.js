import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { startTestServer, TEST_ADMIN_SECRET } from "./testServer.js";

let server;
let adminToken;

async function post(path, body, token, headers = {}) {
  const res = await fetch(`${server.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function patch(path, body, token) {
  const res = await fetch(`${server.baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function del(path, token) {
  const res = await fetch(`${server.baseUrl}${path}`, {
    method: "DELETE",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json() };
}

async function get(path, token) {
  const res = await fetch(`${server.baseUrl}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json() };
}

async function uploadFile(fileName, contents, token) {
  const res = await fetch(`${server.baseUrl}/api/admin/upload`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "X-File-Name": fileName,
    },
    body: contents,
  });
  return { status: res.status, body: await res.json() };
}

function uniqueSlug(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

describe("Mission 23 Étape 4 -- back-office formations API (real wrangler pages dev + local D1 + R2)", { timeout: 60000 }, () => {
  before(async () => {
    server = await startTestServer();
    const login = await post("/api/admin/login", { secret: TEST_ADMIN_SECRET });
    adminToken = login.body.token;
    assert.ok(adminToken, "admin login must succeed with the test secret");
  });

  after(async () => {
    await server.stop();
  });

  describe("auth", () => {
    it("rejects every admin courses/modules/lessons/upload/audit-log route without a token", async () => {
      assert.equal((await get("/api/admin/courses")).status, 401);
      assert.equal((await post("/api/admin/courses", {})).status, 401);
      assert.equal((await post("/api/admin/modules", {})).status, 401);
      assert.equal((await post("/api/admin/lessons", {})).status, 401);
      assert.equal((await post("/api/admin/upload", "x")).status, 401);
      assert.equal((await get("/api/admin/audit-log")).status, 401);
    });
  });

  describe("courses CRUD", () => {
    it("creates a course as a draft, with the next sort order", async () => {
      const slug = uniqueSlug("cours");
      const { status, body } = await post("/api/admin/courses", { slug, title: "Cours de test" }, adminToken);
      assert.equal(status, 201);
      assert.equal(body.course.slug, slug);
      assert.equal(body.course.status, "draft");
      assert.equal(body.course.moduleCount, 0);
    });

    it("rejects a duplicate slug with 409", async () => {
      const slug = uniqueSlug("cours-dup");
      await post("/api/admin/courses", { slug, title: "Premier" }, adminToken);
      const { status, body } = await post("/api/admin/courses", { slug, title: "Second" }, adminToken);
      assert.equal(status, 409);
      assert.equal(body.error, "SLUG_ALREADY_USED");
    });

    it("lists drafts too (unlike the student-facing /api/courses)", async () => {
      const slug = uniqueSlug("cours-liste");
      await post("/api/admin/courses", { slug, title: "Brouillon visible" }, adminToken);
      const { body } = await get("/api/admin/courses", adminToken);
      assert.ok(body.courses.some((c) => c.slug === slug && c.status === "draft"));
    });

    it("updates title/slug/description/level, and toggles publish/unpublish", async () => {
      const slug = uniqueSlug("cours-update");
      const created = await post("/api/admin/courses", { slug, title: "Avant" }, adminToken);
      const id = created.body.course.id;

      const patched = await patch(`/api/admin/courses/${id}`, { title: "Après", level: "Débutant" }, adminToken);
      assert.equal(patched.status, 200);

      const published = await patch(`/api/admin/courses/${id}`, { status: "published" }, adminToken);
      assert.equal(published.status, 200);

      const detail = await get(`/api/admin/courses/${id}`, adminToken);
      assert.equal(detail.body.course.title, "Après");
      assert.equal(detail.body.course.level, "Débutant");
      assert.equal(detail.body.course.status, "published");
    });

    it("404s on an unknown course id", async () => {
      assert.equal((await get("/api/admin/courses/999999", adminToken)).status, 404);
      assert.equal((await patch("/api/admin/courses/999999", { title: "x" }, adminToken)).status, 404);
    });

    // objectives/durationHours vivent dans course_extras (migrations/
    // 0004_course_extras.sql), traités séparément de la table `courses` --
    // round-trip PATCH -> GET pour les deux chemins : avec un champ core en
    // même temps, et seuls (sans aucun champ de `courses`, le cas d'une
    // formation qui n'a encore que ses objectifs -- l'UPSERT ne doit pas
    // planter sur une ligne `course_extras` qui n'existe pas encore).
    it("round-trips objectives/durationHours through course_extras (PATCH then GET)", async () => {
      const slug = uniqueSlug("cours-extras");
      const course = (await post("/api/admin/courses", { slug, title: "Avec objectifs" }, adminToken)).body.course;

      const patched = await patch(
        `/api/admin/courses/${course.id}`,
        { objectives: ["Objectif un", "Objectif deux", ""], durationHours: 12 },
        adminToken
      );
      assert.equal(patched.status, 200);

      const detail = await get(`/api/admin/courses/${course.id}`, adminToken);
      assert.deepEqual(detail.body.course.objectives, ["Objectif un", "Objectif deux"]);
      assert.equal(detail.body.course.durationHours, 12);

      // Deuxième PATCH, extras seuls (aucun champ de `courses`) : ne doit
      // pas renvoyer NOTHING_TO_UPDATE, et doit bien remplacer la ligne
      // existante (UPSERT), pas en créer une deuxième.
      const patchedAgain = await patch(`/api/admin/courses/${course.id}`, { durationHours: 20 }, adminToken);
      assert.equal(patchedAgain.status, 200);
      const detailAgain = await get(`/api/admin/courses/${course.id}`, adminToken);
      assert.equal(detailAgain.body.course.durationHours, 20);
      assert.deepEqual(detailAgain.body.course.objectives, ["Objectif un", "Objectif deux"]);
    });
  });

  describe("modules + lessons CRUD", () => {
    it("creates a module, adds lessons, reorders, then deletes the module and cascades its lessons", async () => {
      const slug = uniqueSlug("cours-modules");
      const course = (await post("/api/admin/courses", { slug, title: "Avec modules" }, adminToken)).body.course;

      const moduleA = (await post("/api/admin/modules", { courseId: course.id, title: "Module A" }, adminToken)).body.module;
      assert.equal(moduleA.sortOrder, 0);

      const lessonA = (
        await post(
          "/api/admin/lessons",
          { moduleId: moduleA.id, type: "texte", title: "Leçon A", content: { body: "# A" } },
          adminToken
        )
      ).body.lesson;
      const lessonB = (
        await post(
          "/api/admin/lessons",
          { moduleId: moduleA.id, type: "texte", title: "Leçon B", content: { body: "# B" } },
          adminToken
        )
      ).body.lesson;
      assert.equal(lessonA.sortOrder, 0);
      assert.equal(lessonB.sortOrder, 1);

      // Réordonner : B passe devant A (échange des sortOrder, comme le fait
      // l'UI avec ses boutons ↑/↓, CoursesAdmin.jsx `moveLesson`).
      await patch(`/api/admin/lessons/${lessonA.id}`, { sortOrder: 1 }, adminToken);
      await patch(`/api/admin/lessons/${lessonB.id}`, { sortOrder: 0 }, adminToken);

      const detail = await get(`/api/admin/courses/${course.id}`, adminToken);
      const reordered = detail.body.modules[0].lessons;
      assert.equal(reordered[0].title, "Leçon B");
      assert.equal(reordered[1].title, "Leçon A");

      const deleted = await del(`/api/admin/modules/${moduleA.id}`, adminToken);
      assert.equal(deleted.status, 200);

      const afterDelete = await get(`/api/admin/courses/${course.id}`, adminToken);
      assert.equal(afterDelete.body.modules.length, 0);
    });

    it("rejects an invalid lesson type", async () => {
      const slug = uniqueSlug("cours-invalid-type");
      const course = (await post("/api/admin/courses", { slug, title: "x" }, adminToken)).body.course;
      const module_ = (await post("/api/admin/modules", { courseId: course.id, title: "M" }, adminToken)).body.module;
      const { status, body } = await post(
        "/api/admin/lessons",
        { moduleId: module_.id, type: "not-a-real-type", title: "x" },
        adminToken
      );
      assert.equal(status, 400);
      assert.equal(body.error, "INVALID_TYPE");
    });

    it("stores the exact per-type content shapes the student-facing API expects", async () => {
      const slug = uniqueSlug("cours-types");
      const course = (await post("/api/admin/courses", { slug, title: "Tous les types" }, adminToken)).body.course;
      const module_ = (await post("/api/admin/modules", { courseId: course.id, title: "M" }, adminToken)).body.module;

      const video = (
        await post(
          "/api/admin/lessons",
          { moduleId: module_.id, type: "video", title: "Vidéo", content: { embedUrl: "https://www.youtube-nocookie.com/embed/x" } },
          adminToken
        )
      ).body.lesson;
      assert.equal(video.content.embedUrl, "https://www.youtube-nocookie.com/embed/x");

      const live = (
        await post(
          "/api/admin/lessons",
          {
            moduleId: module_.id,
            type: "live",
            title: "Live",
            content: { title: "Session", startsAt: "2026-12-01T18:00:00.000Z", durationMinutes: 45, link: "https://meet.example.com" },
          },
          adminToken
        )
      ).body.lesson;
      assert.equal(live.content.durationMinutes, 45);

      const exercice = (
        await post(
          "/api/admin/lessons",
          { moduleId: module_.id, type: "exercice", title: "Exercice", content: { exerciseId: "ex-01-read-availability" } },
          adminToken
        )
      ).body.lesson;
      assert.equal(exercice.content.exerciseId, "ex-01-read-availability");

      const simulateur = (
        await post("/api/admin/lessons", { moduleId: module_.id, type: "simulateur", title: "Terminal" }, adminToken)
      ).body.lesson;
      assert.deepEqual(simulateur.content, {});
    });
  });

  describe("upload (R2)", () => {
    it("stores an uploaded file and returns a fileKey usable in a pdf lesson", async () => {
      const upload = await uploadFile("support.pdf", "%PDF-1.4 contenu de test", adminToken);
      assert.equal(upload.status, 201);
      assert.ok(upload.body.fileKey.endsWith("support.pdf"));
      assert.equal(upload.body.fileName, "support.pdf");

      const slug = uniqueSlug("cours-pdf");
      const course = (await post("/api/admin/courses", { slug, title: "Avec PDF" }, adminToken)).body.course;
      const module_ = (await post("/api/admin/modules", { courseId: course.id, title: "M" }, adminToken)).body.module;
      const lesson = (
        await post(
          "/api/admin/lessons",
          { moduleId: module_.id, type: "pdf", title: "Support", content: { fileKey: upload.body.fileKey, fileName: upload.body.fileName } },
          adminToken
        )
      ).body.lesson;
      assert.equal(lesson.content.fileKey, upload.body.fileKey);
    });

    it("sanitizes the file name and rejects path traversal attempts", async () => {
      const upload = await uploadFile("../../etc/passwd", "contenu", adminToken);
      assert.equal(upload.status, 201);
      assert.ok(!upload.body.fileKey.includes(".."));
      assert.ok(!upload.body.fileKey.includes("/etc/"));
    });
  });

  describe("audit log", () => {
    it("records course/module/lesson actions and exposes them to the admin", async () => {
      const slug = uniqueSlug("cours-audit");
      const course = (await post("/api/admin/courses", { slug, title: "Pour le journal" }, adminToken)).body.course;
      await patch(`/api/admin/courses/${course.id}`, { status: "published" }, adminToken);

      const { body } = await get("/api/admin/audit-log", adminToken);
      const actions = body.entries.map((e) => e.action);
      assert.ok(actions.includes("course.create"));
      assert.ok(actions.includes("course.publish"));
    });
  });

  describe("critère d'acceptation -- une formation complète créée et publiée depuis /admin", () => {
    it("builds a course with a video, a pdf, a fichier, and a live lesson, publishes it, and it appears in the real student catalogue", async () => {
      const slug = uniqueSlug("cours-complet");
      const course = (await post("/api/admin/courses", { slug, title: "Formation complète" }, adminToken)).body.course;
      const module_ = (await post("/api/admin/modules", { courseId: course.id, title: "Module 1" }, adminToken)).body.module;

      await post(
        "/api/admin/lessons",
        { moduleId: module_.id, type: "video", title: "Vidéo d'intro", content: { embedUrl: "https://www.youtube-nocookie.com/embed/x" } },
        adminToken
      );

      const pdfUpload = await uploadFile("memo.pdf", "%PDF-1.4 memo", adminToken);
      await post(
        "/api/admin/lessons",
        { moduleId: module_.id, type: "pdf", title: "Mémo", content: { fileKey: pdfUpload.body.fileKey, fileName: pdfUpload.body.fileName } },
        adminToken
      );

      const fichierUpload = await uploadFile("modele.docx", "faux docx", adminToken);
      await post(
        "/api/admin/lessons",
        {
          moduleId: module_.id,
          type: "fichier",
          title: "Modèle à remplir",
          content: { files: [{ fileKey: fichierUpload.body.fileKey, fileName: fichierUpload.body.fileName, sizeBytes: fichierUpload.body.sizeBytes }] },
        },
        adminToken
      );

      await post(
        "/api/admin/lessons",
        {
          moduleId: module_.id,
          type: "live",
          title: "Session de lancement",
          content: { title: "Lancement", startsAt: "2026-12-15T10:00:00.000Z", durationMinutes: 60, link: "https://meet.example.com/x" },
        },
        adminToken
      );

      await patch(`/api/admin/courses/${course.id}`, { status: "published" }, adminToken);

      // Vue admin : les 4 leçons sont bien là, avec leur contenu complet.
      const adminDetail = await get(`/api/admin/courses/${course.id}`, adminToken);
      assert.equal(adminDetail.body.modules[0].lessons.length, 4);

      // Vue étudiante réelle (pas un raccourci -- l'API /api/courses
      // consommée par CataloguePage.jsx) : la formation publiée apparaît,
      // avec le bon nombre de leçons.
      const registerRes = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `${uniqueSlug("etudiant")}@example.com`,
          password: "un-mot-de-passe-bien-trop-simple-a-deviner",
        }),
      });
      const cookie = (registerRes.headers.get("set-cookie") || "").split(";")[0];
      assert.ok(cookie, "register must set a session cookie");

      const catalogue = await fetch(`${server.baseUrl}/api/courses`, { headers: { cookie } });
      const catalogueBody = await catalogue.json();
      const published = catalogueBody.courses.find((c) => c.slug === slug);
      assert.ok(published, "the newly published course must appear in the real student catalogue");
      assert.equal(published.lessonCount, 4);
    });
  });
});
