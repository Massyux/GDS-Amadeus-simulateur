import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FeedbackButton from "./FeedbackButton.jsx";
import { dictionary } from "./i18n/dictionary.js";

describe("FeedbackButton", () => {
  it("links to a mailto with the app version and screen in the subject", () => {
    render(<FeedbackButton t={dictionary.fr} screen="terminal" />);
    const link = screen.getByRole("link", { name: "Feedback" });
    const href = link.getAttribute("href");
    expect(href).toMatch(/^mailto:massinissa\.mehdani@gmail\.com\?subject=/);
    const subject = decodeURIComponent(href.split("subject=")[1]);
    expect(subject).toContain("terminal");
    expect(subject).toContain("1.0.0-pilot");
  });

  it("renders the English label when given the English dictionary", () => {
    render(<FeedbackButton t={dictionary.en} screen="onboarding" />);
    expect(screen.getByRole("link", { name: "Feedback" })).toBeInTheDocument();
  });
});
