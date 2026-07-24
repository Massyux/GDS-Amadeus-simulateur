import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processCommand } from "@simulateur/core";
import { applySeedState, evaluate } from "../index.js";
import { exercises, exercisesById } from "../content.js";

async function run(state, cmd) {
  const result = await processCommand(state, cmd);
  return result.state;
}

describe("content -- exercises 1-4 catalog", () => {
  it("exposes exactly the 4 Etape 2 exercises, indexed by id", () => {
    assert.equal(exercises.length, 4);
    assert.deepEqual(Object.keys(exercisesById).sort(), [
      "ex-01-read-availability",
      "ex-02-decode",
      "ex-03-first-sale",
      "ex-04-full-pnr",
    ]);
  });

  it("every exercise has bilingual titre/consigne and at least one objectif with bilingual label", () => {
    for (const exercise of exercises) {
      assert.ok(exercise.titre.fr && exercise.titre.en, exercise.id);
      assert.ok(exercise.consigne.fr && exercise.consigne.en, exercise.id);
      assert.ok(exercise.objectifs.length > 0, exercise.id);
      for (const objectif of exercise.objectifs) {
        assert.ok(objectif.label.fr && objectif.label.en, `${exercise.id}/${objectif.id}`);
      }
    }
  });
});

describe("ex-01-read-availability -- two valid paths, one typical failure", () => {
  const exercise = exercisesById["ex-01-read-availability"];

  it("passes by reading the plain AN display and picking an AH row directly", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS2Y1");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(result.score, result.maxScore);
  });

  it("passes via AC/AAH (a genuinely different path: filtering instead of reading directly)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "AC/AAH");
    state = await run(state, "SS1Y1");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-ac").reached,
      true
    );
  });

  it("fails with precise feedback when a non-Air Algérie flight is sold instead", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1"); // line 1 is PC, not AH

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, false);
    assert.equal(result.feedback[0].passed, false);
  });
});

describe("ex-02-decode -- two valid paths, one typical failure", () => {
  const exercise = exercisesById["ex-02-decode"];

  it("passes via AN then SS on the Saudia row (decode commands are informational only)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "DAC ALG");
    state = await run(state, "DNA SV");
    state = await run(state, "DC SA");
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS3Y1");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.ok(
      ["jt-dac", "jt-dna", "jt-dc"].every(
        (id) => result.jalonsFeedback.find((j) => j.jalonId === id).reached
      )
    );
  });

  it("passes via a direct long sell, without AN or any decode command at all", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "SSSV6979Y26DECALGPAR1");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.ok(
      ["jt-dac", "jt-dna", "jt-dc"].every(
        (id) => !result.jalonsFeedback.find((j) => j.jalonId === id).reached
      ),
      "none of the decode jalons should be reached on this path"
    );
  });

  it("fails when a different airline is sold instead of Saudia", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1"); // line 1 is PC, not SV

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, false);
  });
});

describe("ex-03-first-sale -- two valid paths, one typical failure", () => {
  const exercise = exercisesById["ex-03-first-sale"];

  it("passes via the numeric sell after AN, then RT", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "RT");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-rt").reached,
      true
    );
  });

  it("passes via a direct long sell, without AN or RT at all", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "SSPC4773Y26DECALGPAR1");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-rt").reached,
      false
    );
  });

  it("fails when nothing was ever sold (AN alone doesn't create a segment)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, false);
    assert.equal(result.feedback[0].passed, false);
  });
});

describe("ex-04-full-pnr -- two valid paths, one typical failure", () => {
  const exercise = exercisesById["ex-04-full-pnr"];

  it("passes with the standard element order (NM, AP, RF, TKTL, ER)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "TKTL/20DEC");
    state = await run(state, "ER");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(result.score, result.maxScore);
  });

  it("passes with a different element order (TKTL before RF/AP -- ER only cares that all are present)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "TKTL/20DEC");
    state = await run(state, "RFMM");
    state = await run(state, "AP1234567890");
    state = await run(state, "ER");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
  });

  it("fails cleanly (precise per-objectif feedback) when the signature is missing so ER never records", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "ER"); // no RF -- END PNR FIRST, never recorded

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, false);
    const byId = Object.fromEntries(result.feedback.map((f) => [f.objectifId, f.passed]));
    assert.equal(byId["obj-pnr"], false, "PNR was never recorded");
    assert.equal(byId["obj-route"], true, "the segment itself was sold");
    assert.equal(byId["obj-name"], true, "the name was still added");
    assert.equal(byId["obj-tktl"], false, "TKTL was never set on this path");
  });
});
