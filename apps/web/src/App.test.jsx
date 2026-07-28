import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { ACCESS_KEY_STORAGE_KEY } from "./accessKey.js";

const TEST_KEY = "GDS-TEST-0001";

// Routes by URL so a single stub covers both /api/license/activate (the key
// form) and /api/license/check (the boot-time revocation check, Mission 14
// Etape 3) -- most tests here only exercise one of the two.
function mockLicenseApi({ activate, check } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      if (url === "/api/license/activate") {
        return new Response(
          JSON.stringify(activate ?? { valid: true, token: "test-token" }),
          { status: 200 }
        );
      }
      if (url === "/api/license/check") {
        return new Response(JSON.stringify(check ?? { valid: true }), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    })
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App onboarding + access gate flow", () => {
  it("shows the marketing homepage on first visit, not the terminal", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Simulateur Amadeus GDS" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("never mounts the terminal without a validated access key", async () => {
    mockLicenseApi({ activate: { valid: false, reason: "NOT_FOUND" } });
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole("button", { name: "J'ai une clé d'accès" }));
    expect(container.querySelector(".prompt-input")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Clé d'accès"), "GDS-0000-0000");
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Clé invalide.");
    expect(container.querySelector(".prompt-input")).not.toBeInTheDocument();
  });

  it("enters the terminal with a valid key and remembers it across reloads", async () => {
    mockLicenseApi();
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: "J'ai une clé d'accès" }));
    await user.type(screen.getByLabelText("Clé d'accès"), TEST_KEY);
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => expect(screen.getByRole("textbox")).toBeInTheDocument());

    unmount();
    render(<App />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Simulateur Amadeus GDS" })
    ).not.toBeInTheDocument();
  });

  it("logs the user out on reload once the stored token is revoked", async () => {
    mockLicenseApi();
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: "J'ai une clé d'accès" }));
    await user.type(screen.getByLabelText("Clé d'accès"), TEST_KEY);
    await user.click(screen.getByRole("button", { name: "Valider" }));
    await waitFor(() => expect(screen.getByRole("textbox")).toBeInTheDocument());
    unmount();

    mockLicenseApi({ check: { valid: false } });
    render(<App />);
    // Optimistic first paint still shows the terminal (initialScreen() reads
    // localStorage synchronously); the boot-time check then kicks in.
    await waitFor(() => expect(screen.getByLabelText("Clé d'accès")).toBeInTheDocument());
    expect(localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBeNull();
  });

  it("toggles between French and English on the homepage", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "EN" }));
    expect(
      screen.getByRole("heading", { name: "Amadeus GDS Simulator" })
    ).toBeInTheDocument();
  });
});

describe("App exercise mode entry (missions/MISSION-08.md Etape 2)", () => {
  it("gates exercise mode behind the same access key as free mode (no free bypass to the real terminal)", async () => {
    mockLicenseApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Mode exercices" }));
    // Still behind the key gate -- not the exercise picker yet.
    expect(screen.getByLabelText("Clé d'accès")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Clé d'accès"), TEST_KEY);
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByRole("heading", { name: "Choisissez un exercice" })
    ).toBeInTheDocument();
  });

  it("goes straight to the exercise picker (skipping the key screen) when a key is already validated", async () => {
    const user = userEvent.setup();
    render(<App />);
    // Simulate a key already validated in this tab without remounting (the
    // real trigger -- initialScreen() reading a stored valid key -- would
    // skip onboarding entirely, so onExercises' own live localStorage check
    // is exercised directly here instead). No token stored on purpose: the
    // boot-time revocation check (App.jsx's effect) skips itself when there
    // is nothing to check, so no fetch mock is needed for this shortcut.
    localStorage.setItem(ACCESS_KEY_STORAGE_KEY, "1");

    await user.click(screen.getByRole("button", { name: "Mode exercices" }));

    expect(
      await screen.findByRole("heading", { name: "Choisissez un exercice" })
    ).toBeInTheDocument();
  });
});
