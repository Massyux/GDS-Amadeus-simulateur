import { beforeEach, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

beforeEach(() => {
  localStorage.clear();
});

describe("App onboarding flow", () => {
  it("shows the onboarding screen on first visit", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Simulateur Amadeus GDS" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("enters the terminal and remembers the choice on reload", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Entrer dans le terminal" })
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    unmount();
    render(<App />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Simulateur Amadeus GDS" })
    ).not.toBeInTheDocument();
  });
});
