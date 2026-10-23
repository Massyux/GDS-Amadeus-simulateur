import { afterEach, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LandscapeHint from "./LandscapeHint.jsx";
import { dictionary } from "./i18n/dictionary.js";

const DISMISSED_KEY = "simulateur-amadeus:landscape-hint-dismissed";

afterEach(() => {
  localStorage.removeItem(DISMISSED_KEY);
});

describe("LandscapeHint", () => {
  it("shows the message by default", () => {
    render(<LandscapeHint t={dictionary.fr} />);
    expect(screen.getByRole("note")).toHaveTextContent("Tourne ton téléphone");
  });

  it("dismisses permanently via localStorage, not just for this render -- never a modal", async () => {
    const user = userEvent.setup();
    render(<LandscapeHint t={dictionary.fr} />);

    await user.click(screen.getByRole("button", { name: "Fermer ce message" }));
    expect(screen.queryByRole("note")).toBeNull();
    expect(localStorage.getItem(DISMISSED_KEY)).toBe("1");
  });

  it("stays hidden on a fresh mount once it was dismissed before (shown only once, ever)", () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    render(<LandscapeHint t={dictionary.fr} />);
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("renders the English message when given the English dictionary", () => {
    render(<LandscapeHint t={dictionary.en} />);
    expect(screen.getByRole("note")).toHaveTextContent("Rotate your phone");
  });
});
