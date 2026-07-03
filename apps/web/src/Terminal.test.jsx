import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Terminal from "./Terminal.jsx";

async function typeCommand(user, input, text) {
  await user.clear(input);
  await user.type(input, text);
  await user.keyboard("{Enter}");
}

describe("Terminal", () => {
  it("shows the initial banner", () => {
    render(<Terminal />);
    expect(screen.getByText("AMADEUS SELLING PLATFORM")).toBeInTheDocument();
    expect(screen.getByText("TRAINING MODE")).toBeInTheDocument();
  });

  it("displays AN availability rows with class/seat tokens", async () => {
    const user = userEvent.setup();
    render(<Terminal />);
    const input = screen.getByRole("textbox");
    await typeCommand(user, input, "AN15DECALGPAR");

    expect(
      await screen.findByText(/AMADEUS AVAILABILITY - AN/)
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".avail-token").length).toBeGreaterThan(0);
  });

  it("shows NO FLIGHTS when the airline filter has no match", async () => {
    const user = userEvent.setup();
    render(<Terminal />);
    const input = screen.getByRole("textbox");
    await typeCommand(user, input, "AN15DECALGPAR/ZZ");

    expect(await screen.findByText("NO FLIGHTS")).toBeInTheDocument();
  });

  it("defaults the selected token to the first one with available seats", async () => {
    const user = userEvent.setup();
    render(<Terminal />);
    const input = screen.getByRole("textbox");
    await typeCommand(user, input, "AN15DECALGPAR");
    await screen.findByText(/AMADEUS AVAILABILITY - AN/);

    const selected = document.querySelector(".avail-token.selected");
    expect(selected).not.toBeNull();
    expect(Number(selected.textContent.slice(1))).toBeGreaterThan(0);
  });

  it("moves the token selection with arrow keys while the input is empty", async () => {
    const user = userEvent.setup();
    render(<Terminal />);
    const input = screen.getByRole("textbox");
    await typeCommand(user, input, "AN15DECALGPAR");
    await screen.findByText(/AMADEUS AVAILABILITY - AN/);

    const before = document.querySelector(".avail-token.selected").textContent;
    await user.keyboard("{ArrowRight}");
    const after = document.querySelector(".avail-token.selected").textContent;
    expect(after).not.toBe(before);
  });

  it("builds and executes an SS command from the selected token on Enter", async () => {
    const user = userEvent.setup();
    render(<Terminal />);
    const input = screen.getByRole("textbox");
    await typeCommand(user, input, "AN15DECALGPAR");
    await screen.findByText(/AMADEUS AVAILABILITY - AN/);

    await user.keyboard("{Enter}");
    expect(await screen.findByText(/^> SS\d+[A-Z]\d+$/)).toBeInTheDocument();
  });
});
