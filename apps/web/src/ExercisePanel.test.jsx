import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExercisePanel from "./ExercisePanel.jsx";
import { dictionary } from "./i18n/dictionary.js";
import { exercisesById } from "@simulateur/exercises";

const exercise = exercisesById["ex-03-first-sale"];

async function typeCommand(user, input, text) {
  await user.clear(input);
  await user.type(input, text);
  await user.keyboard("{Enter}");
}

describe("ExercisePanel", () => {
  it("shows the exercise's consigne and can collapse/expand it", async () => {
    const user = userEvent.setup();
    render(
      <ExercisePanel
        exercise={exercise}
        t={dictionary.fr}
        lang="fr"
        onAbandon={() => {}}
        onBackToHome={() => {}}
      />
    );

    expect(screen.getByText(exercise.consigne.fr)).toBeInTheDocument();

    await user.click(screen.getByText(dictionary.fr.exerciseMode.collapse));
    expect(screen.queryByText(exercise.consigne.fr)).not.toBeInTheDocument();

    await user.click(screen.getByText(dictionary.fr.exerciseMode.expand));
    expect(screen.getByText(exercise.consigne.fr)).toBeInTheDocument();
  });

  it("mounts the real terminal underneath, unaffected by the exercise chrome", () => {
    render(
      <ExercisePanel
        exercise={exercise}
        t={dictionary.fr}
        lang="fr"
        onAbandon={() => {}}
        onBackToHome={() => {}}
      />
    );
    expect(screen.getByText("AMADEUS SELLING PLATFORM")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("passes the exercise after a valid solution and shows per-objectif feedback", async () => {
    const user = userEvent.setup();
    render(
      <ExercisePanel
        exercise={exercise}
        t={dictionary.fr}
        lang="fr"
        onAbandon={() => {}}
        onBackToHome={() => {}}
      />
    );

    const input = screen.getByRole("textbox");
    await typeCommand(user, input, "AN26DECALGPAR");
    await screen.findByText(/AMADEUS AVAILABILITY - AN/);
    await typeCommand(user, input, "SS1Y1");

    await user.click(screen.getByText(dictionary.fr.exerciseMode.verify));

    expect(await screen.findByText(dictionary.fr.exerciseMode.resultPassed)).toBeInTheDocument();
    expect(screen.getByText(exercise.objectifs[0].label.fr)).toBeInTheDocument();
  });

  it("fails the exercise when nothing was sold, with a precise objectif failure", async () => {
    const user = userEvent.setup();
    render(
      <ExercisePanel
        exercise={exercise}
        t={dictionary.fr}
        lang="fr"
        onAbandon={() => {}}
        onBackToHome={() => {}}
      />
    );

    await user.click(screen.getByText(dictionary.fr.exerciseMode.verify));

    expect(await screen.findByText(dictionary.fr.exerciseMode.resultFailed)).toBeInTheDocument();
    const objectifLine = screen.getByText(exercise.objectifs[0].label.fr);
    expect(objectifLine.closest("li")).toHaveClass("exercise-objectif-failed");
  });

  it("reveals hints one at a time and disables the button once exhausted", async () => {
    const user = userEvent.setup();
    render(
      <ExercisePanel
        exercise={exercise}
        t={dictionary.fr}
        lang="fr"
        onAbandon={() => {}}
        onBackToHome={() => {}}
      />
    );

    expect(screen.queryByText(exercise.aides[0].text.fr)).not.toBeInTheDocument();
    await user.click(screen.getByText(dictionary.fr.exerciseMode.hint));
    expect(screen.getByText(exercise.aides[0].text.fr)).toBeInTheDocument();

    const hintButton = screen.getByText(dictionary.fr.exerciseMode.noMoreHints);
    expect(hintButton).toBeDisabled();
  });

  it("calls onAbandon from the toolbar", async () => {
    const user = userEvent.setup();
    const onAbandon = vi.fn();
    render(
      <ExercisePanel
        exercise={exercise}
        t={dictionary.fr}
        lang="fr"
        onAbandon={onAbandon}
        onBackToHome={() => {}}
      />
    );

    await user.click(screen.getByText(dictionary.fr.exerciseMode.abandon));
    expect(onAbandon).toHaveBeenCalled();
  });
});
