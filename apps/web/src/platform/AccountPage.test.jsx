import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AccountPage from "./AccountPage.jsx";
import { dictionary } from "../i18n/dictionary.js";

const t = dictionary.fr;

function mockFetch(body) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AccountPage", () => {
  it("shows the empty state with a catalogue CTA when nothing is enrolled", async () => {
    mockFetch({ user: { id: 1, email: "a@b.com" }, courses: [] });
    render(<AccountPage t={t} user={{ email: "a@b.com" }} onLogout={vi.fn()} />);
    expect(await screen.findByText(t.platform.account.noCourses)).toBeTruthy();
    expect(screen.getByRole("button", { name: t.platform.account.browseCatalogue })).toBeTruthy();
  });

  it("shows a Continuer shortcut pointing at the next unfinished lesson", async () => {
    mockFetch({
      user: { id: 1, email: "a@b.com" },
      courses: [{ slug: "amadeus-niveau-1", title: "Amadeus", lessonCount: 5, completedCount: 2, progressPct: 40, nextLessonId: 3 }],
    });
    render(<AccountPage t={t} user={{ email: "a@b.com" }} onLogout={vi.fn()} />);
    const link = await screen.findByRole("link", { name: t.platform.account.continueCta });
    expect(link.getAttribute("href")).toBe("/app/cours/amadeus-niveau-1/lecon/3");
  });
});
