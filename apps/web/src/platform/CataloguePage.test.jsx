import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CataloguePage from "./CataloguePage.jsx";
import { dictionary } from "../i18n/dictionary.js";

const t = dictionary.fr;

function mockFetch(body) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CataloguePage", () => {
  it("renders every published course with its lesson count", async () => {
    mockFetch({
      courses: [
        { slug: "amadeus-niveau-1", title: "Amadeus — Niveau 1", level: "Débutant", lessonCount: 5, enrolled: false, progressPct: 0 },
      ],
    });
    render(<CataloguePage t={t} user={{ id: 1 }} onLogout={vi.fn()} />);

    expect(await screen.findByText("Amadeus — Niveau 1")).toBeTruthy();
    expect(screen.getByText("5 leçons")).toBeTruthy();
  });

  it("shows the empty state when there is no published course", async () => {
    mockFetch({ courses: [] });
    render(<CataloguePage t={t} user={{ id: 1 }} onLogout={vi.fn()} />);
    expect(await screen.findByText(t.platform.catalogue.empty)).toBeTruthy();
  });

  it("shows a progress bar only for enrolled courses", async () => {
    mockFetch({
      courses: [
        { slug: "a", title: "A", level: null, lessonCount: 4, enrolled: true, progressPct: 50 },
      ],
    });
    render(<CataloguePage t={t} user={{ id: 1 }} onLogout={vi.fn()} />);
    expect(await screen.findByRole("progressbar")).toBeTruthy();
  });
});
