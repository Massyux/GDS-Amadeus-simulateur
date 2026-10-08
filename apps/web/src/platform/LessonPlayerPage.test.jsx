import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LessonPlayerPage from "./LessonPlayerPage.jsx";
import { dictionary } from "../i18n/dictionary.js";

const t = dictionary.fr;

// Un seul module, une seule leçon par défaut -- suffisant pour exercer le
// rendu de contenu ; les tests de navigation/fin de module construisent
// leur propre liste de leçons.
function mockLesson(lesson, nav = { prevId: null, nextId: null }, modules) {
  const courseModules = modules || [
    { id: 1, title: "Module 1", lessons: [{ id: lesson.id, type: lesson.type, title: lesson.title, status: "not_started" }] },
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      const u = String(url);
      if (u.includes("/progress")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (u.includes("/api/courses/")) {
        return new Response(
          JSON.stringify({ course: { id: 1, slug: "amadeus-niveau-1", title: "Amadeus" }, modules: courseModules, enrolled: true }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ lesson, nav, courseSlug: "amadeus-niveau-1" }), { status: 200 });
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// Toutes les leçons déclenchent un SECOND appel réseau après le premier
// (platformApi.course(courseSlug), pour le sommaire/fil d'Ariane -- voir
// LessonPlayerPage.jsx). Un test qui se termine sans l'attendre laisse sa
// promesse en vol jusqu'après le `vi.unstubAllGlobals()` du `afterEach`
// suivant, qui retombe alors sur le vrai `fetch` réseau avec une URL
// relative ("Invalid URL") -- un vrai bug de fiabilité de cette suite,
// invisible en isolation (chaque fichier passe seul) mais réel dès que
// plusieurs fichiers tournent dans le même run (découvert par un hook
// pre-commit qui lance toute la suite d'un coup, Mission 23 Étape 4,
// 09/10/2026). Chaque test attend donc explicitement ce second appel avant
// de se terminer, même quand il ne teste rien qui en dépende directement.
async function waitForCourseSidebar() {
  await screen.findByText("Module 1");
}

describe("LessonPlayerPage content renderers", () => {
  it("renders texte as headings/paragraphs, not raw markdown", async () => {
    mockLesson({ id: 1, type: "texte", title: "Bienvenue", content: { body: "# Titre\n\nUn paragraphe." } });
    render(<LessonPlayerPage t={t} csrfToken="x" lessonId={1} />);
    expect(await screen.findByRole("heading", { name: "Titre" })).toBeTruthy();
    expect(screen.getByText("Un paragraphe.")).toBeTruthy();
    await waitForCourseSidebar();
  });

  it("renders a video embed iframe", async () => {
    mockLesson({ id: 2, type: "video", title: "Vidéo", content: { embedUrl: "https://www.youtube-nocookie.com/embed/x" } });
    render(<LessonPlayerPage t={t} csrfToken="x" lessonId={2} />);
    const iframe = await screen.findByTitle("video");
    expect(iframe.getAttribute("src")).toContain("youtube-nocookie.com");
    await waitForCourseSidebar();
  });

  it("renders a pdf download link from the signed URL", async () => {
    mockLesson({ id: 3, type: "pdf", title: "Support", content: { fileName: "support.pdf", downloadUrl: "/api/files/download?token=abc" } });
    render(<LessonPlayerPage t={t} csrfToken="x" lessonId={3} />);
    const link = await screen.findByRole("link", { name: t.platform.lesson.pdfDownload });
    expect(link.getAttribute("href")).toBe("/api/files/download?token=abc");
    await waitForCourseSidebar();
  });

  it("renders every file in a fichier lesson", async () => {
    mockLesson({
      id: 4,
      type: "fichier",
      title: "Fiches",
      content: { files: [{ fileName: "a.txt", downloadUrl: "/api/files/download?token=a" }, { fileName: "b.txt", downloadUrl: "/api/files/download?token=b" }] },
    });
    render(<LessonPlayerPage t={t} csrfToken="x" lessonId={4} />);
    expect(await screen.findByRole("link", { name: "a.txt" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "b.txt" })).toBeTruthy();
    await waitForCourseSidebar();
  });

  it("shows a join button for an ongoing live session, none for a past one", async () => {
    mockLesson({
      id: 5,
      type: "live",
      title: "Live",
      content: { title: "Live", startsAt: "2020-01-01T00:00:00.000Z", durationMinutes: 60, link: "https://meet.example.com", state: "passee" },
    });
    render(<LessonPlayerPage t={t} csrfToken="x" lessonId={5} />);
    expect(await screen.findByText(t.platform.lesson.livePast)).toBeTruthy();
    expect(screen.queryByRole("link", { name: t.platform.lesson.liveJoin })).toBeNull();
    await waitForCourseSidebar();
  });

  it("shows a launch card for a simulateur lesson on desktop, not the terminal itself", async () => {
    mockLesson({ id: 6, type: "simulateur", title: "Terminal", content: {} });
    render(<LessonPlayerPage t={t} lang="fr" csrfToken="x" lessonId={6} />);
    expect(await screen.findByRole("button", { name: t.platform.lesson.openSimulator })).toBeTruthy();
    expect(screen.queryByText(t.platform.lesson.mobileBlockedTitle)).toBeNull();
    await waitForCourseSidebar();
  });

  it("shows a launch card for an exercice lesson on desktop", async () => {
    mockLesson({ id: 9, type: "exercice", title: "Exercice", content: { exerciseId: "ex-01-read-availability" } });
    render(<LessonPlayerPage t={t} lang="fr" csrfToken="x" lessonId={9} />);
    expect(await screen.findByRole("button", { name: t.platform.lesson.openExercise })).toBeTruthy();
    await waitForCourseSidebar();
  });

  it("shows the mobile-blocked message instead of a launch card under 768px", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query) => ({
        matches: query.includes("767px"),
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
    );
    mockLesson({ id: 8, type: "exercice", title: "Exercice", content: { exerciseId: "ex-01-read-availability" } });
    render(<LessonPlayerPage t={t} lang="fr" csrfToken="x" lessonId={8} />);
    expect(await screen.findByText(t.platform.lesson.mobileBlockedTitle)).toBeTruthy();
    await screen.findByText("Module 1");
    expect(screen.queryByRole("button", { name: t.platform.lesson.openExercise })).toBeNull();
  });

  it("disables Précédent when there is no neighbour, and shows the end-of-module screen on completion", async () => {
    mockLesson({ id: 7, type: "texte", title: "Seule leçon", content: { body: "Contenu." } });
    const user = userEvent.setup();
    render(<LessonPlayerPage t={t} csrfToken="x" lessonId={7} />);

    expect(await screen.findByRole("button", { name: t.platform.lesson.prev })).toBeDisabled();
    // Attend que le sommaire (second appel, /api/courses/:slug) soit chargé
    // avant d'agir -- la détection "dernière leçon du module" en dépend.
    await screen.findByText("Module 1");

    const completeBtn = screen.getByRole("button", { name: t.platform.lesson.markCompleted });
    await user.click(completeBtn);

    expect(await screen.findByText(t.platform.lesson.moduleDoneTitle)).toBeTruthy();
    // Dernière leçon du cours entier (pas de nav.nextId) -- pas de CTA
    // "module suivant", retour au cours à la place.
    expect(screen.queryByRole("button", { name: t.platform.lesson.moduleDoneCta })).toBeNull();
    expect(screen.getByRole("link", { name: t.platform.course.back })).toBeTruthy();
  });

  it("goes straight to the next lesson when it is not completing a module", async () => {
    const modules = [
      {
        id: 1,
        title: "Module 1",
        lessons: [
          { id: 10, type: "texte", title: "Leçon A", status: "not_started" },
          { id: 11, type: "texte", title: "Leçon B", status: "not_started" },
        ],
      },
    ];
    mockLesson({ id: 10, type: "texte", title: "Leçon A", content: { body: "Contenu A." } }, { prevId: null, nextId: 11 }, modules);
    const user = userEvent.setup();
    render(<LessonPlayerPage t={t} csrfToken="x" lessonId={10} />);

    const completeBtn = await screen.findByRole("button", { name: t.platform.lesson.markCompleted });
    // Attend le sommaire avant de cliquer : "dernière leçon du module" se
    // calcule à partir du second appel (platformApi.course) -- cliquer trop
    // tôt le traiterait comme dernière leçon par défaut (liste vide), menant
    // à l'écran de fin de module au lieu de la leçon suivante.
    await waitForCourseSidebar();
    await user.click(completeBtn);

    await screen.findByText("Contenu A.");
  });
});
