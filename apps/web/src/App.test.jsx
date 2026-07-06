import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

const TEST_KEY = "GDS-TEST-0001";
// SHA-256 hex digest of "GDS-TEST-0001" (see src/lib/keyHash.test.js).
const TEST_KEY_HASH =
  "f422821e3d707a6557c0b112a856927c754b5ca0842cb44503e6e028aa539a16";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
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
    vi.stubEnv("VITE_FALLBACK_KEY_HASHES", TEST_KEY_HASH);
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
    vi.stubEnv("VITE_FALLBACK_KEY_HASHES", TEST_KEY_HASH);
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

  it("toggles between French and English on the homepage", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "EN" }));
    expect(
      screen.getByRole("heading", { name: "Amadeus GDS Simulator" })
    ).toBeInTheDocument();
  });
});
