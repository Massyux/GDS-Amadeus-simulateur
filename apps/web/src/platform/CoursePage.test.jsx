import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CoursePage from "./CoursePage.jsx";
import { dictionary } from "../i18n/dictionary.js";

const t = dictionary.fr;

function mockCourse(modules, enrolled = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          course: { id: 1, slug: "amadeus-niveau-1", title: "Amadeus — Niveau 1", description: "", level: "Débutant" },
          modules,
          enrolled,
        }),
        { status: 200 }
      )
    )
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CoursePage -- attestation (Mission 23 Étape 5)", () => {
  it("shows the certificate link once every lesson is completed", async () => {
    mockCourse([
      { id: 1, title: "Module 1", lessons: [{ id: 1, type: "texte", title: "A", status: "completed" }] },
    ]);
    render(<CoursePage t={t} lang="fr" slug="amadeus-niveau-1" csrfToken="x" />);

    const link = await screen.findByRole("link", { name: t.platform.course.certificateCta });
    expect(link.getAttribute("href")).toBe("/api/courses/amadeus-niveau-1/certificate?lang=fr");
  });

  it("does not show the certificate link while a lesson is still incomplete", async () => {
    mockCourse([
      {
        id: 1,
        title: "Module 1",
        lessons: [
          { id: 1, type: "texte", title: "A", status: "completed" },
          { id: 2, type: "texte", title: "B", status: "not_started" },
        ],
      },
    ]);
    render(<CoursePage t={t} lang="fr" slug="amadeus-niveau-1" csrfToken="x" />);

    await screen.findByText(t.platform.course.enrolled);
    expect(screen.queryByRole("link", { name: t.platform.course.certificateCta })).toBeNull();
  });

  it("does not show the certificate link before enrolling", async () => {
    mockCourse([{ id: 1, title: "Module 1", lessons: [{ id: 1, type: "texte", title: "A", status: "not_started" }] }], false);
    render(<CoursePage t={t} lang="fr" slug="amadeus-niveau-1" csrfToken="x" />);

    await screen.findByRole("button", { name: t.platform.course.enrollCta });
    expect(screen.queryByRole("link", { name: t.platform.course.certificateCta })).toBeNull();
  });
});
