import { describe, it, expect, vi } from "vitest";
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

  it("keeps the visual caret in sync with the input's cursor position", async () => {
    const user = userEvent.setup();
    render(<Terminal />);
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.type(input, "ABCDE");

    // After typing, the caret sits at the end: nothing after it.
    let caret = document.querySelector(".prompt-ghost .caret-block");
    expect(caret.previousSibling.textContent).toBe("ABCDE");
    expect(caret.nextSibling).toBeNull();

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    caret = document.querySelector(".prompt-ghost .caret-block");
    expect(caret.previousSibling.textContent).toBe("ABC");
    expect(caret.nextSibling.textContent).toBe("DE");
  });

  it("does not truncate commands containing a slash that aren't AN (NM/OP/TKTL)", async () => {
    // Regression: the AN airline-filter split (AN.../XX) used to run on every
    // command, truncating anything after a "/" that wasn't an AN entry.
    const user = userEvent.setup();
    render(<Terminal />);
    const input = screen.getByRole("textbox");

    // Each command's echoed input line ("> ...") and its PNR-display line
    // both legitimately contain the same text, so assert with findAllByText
    // rather than findByText (which requires exactly one match).
    await typeCommand(user, input, "NM1MEHDANI/MASSU");
    expect((await screen.findAllByText(/MEHDANI\/MASSU/)).length).toBeGreaterThan(0);

    await typeCommand(user, input, "OP26DEC/CALL PAX BEFORE DEPARTURE");
    expect(
      (await screen.findAllByText(/OP26DEC\/CALL PAX BEFORE DEPARTURE/)).length
    ).toBeGreaterThan(0);

    await typeCommand(user, input, "TKTL/26DEC");
    expect((await screen.findAllByText(/TKTL\/26DEC/)).length).toBeGreaterThan(0);
  });

  it("keeps the prompt line centered in the viewport instead of pinned to the bottom", async () => {
    const scrollIntoViewSpy = vi.spyOn(Element.prototype, "scrollIntoView");
    const user = userEvent.setup();
    render(<Terminal />);
    const input = screen.getByRole("textbox");
    await typeCommand(user, input, "AN15DECALGPAR");
    await screen.findByText(/AMADEUS AVAILABILITY - AN/);

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: "center" });
    expect(scrollIntoViewSpy).not.toHaveBeenCalledWith({ block: "end" });
    scrollIntoViewSpy.mockRestore();
  });
});
