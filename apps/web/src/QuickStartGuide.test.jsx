import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuickStartGuide from "./QuickStartGuide.jsx";
import { dictionary } from "./i18n/dictionary.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("QuickStartGuide", () => {
  it("is closed by default and opens the guide when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<QuickStartGuide t={dictionary.fr} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Guide de démarrage rapide" })
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("AN")).toBeInTheDocument();
    expect(screen.getByText("NM1DOE/JOHN MR")).toBeInTheDocument();
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<QuickStartGuide t={dictionary.fr} />);

    await user.click(
      screen.getByRole("button", { name: "Guide de démarrage rapide" })
    );
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls window.print() when the print button is clicked", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<QuickStartGuide t={dictionary.en} />);

    await user.click(screen.getByRole("button", { name: "Quick start guide" }));
    await user.click(screen.getByRole("button", { name: "Print" }));

    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});
