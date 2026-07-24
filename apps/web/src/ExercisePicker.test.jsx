import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExercisePicker from "./ExercisePicker.jsx";
import { dictionary } from "./i18n/dictionary.js";
import { exercises } from "@simulateur/exercises";

describe("ExercisePicker", () => {
  it("lists every shipped exercise by its French title", () => {
    render(
      <ExercisePicker t={dictionary.fr} lang="fr" onSelect={() => {}} onBack={() => {}} />
    );
    for (const exercise of exercises) {
      expect(screen.getByText(exercise.titre.fr)).toBeInTheDocument();
    }
  });

  it("calls onSelect with the chosen exercise object", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ExercisePicker t={dictionary.fr} lang="fr" onSelect={onSelect} onBack={() => {}} />
    );

    await user.click(screen.getByText(exercises[0].titre.fr));
    expect(onSelect).toHaveBeenCalledWith(exercises[0]);
  });

  it("calls onBack from the back link", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <ExercisePicker t={dictionary.fr} lang="fr" onSelect={() => {}} onBack={onBack} />
    );

    await user.click(screen.getByText(dictionary.fr.exerciseMode.pickerBack));
    expect(onBack).toHaveBeenCalled();
  });
});
