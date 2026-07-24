import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processCommand } from "@simulateur/core";
import { applySeedState, evaluate } from "../index.js";
import { exercises, exercisesById } from "../content.js";

async function run(state, cmd) {
  const result = await processCommand(state, cmd);
  return result.state;
}

describe("content -- exercises 1-10 catalog", () => {
  it("exposes exactly the 10 Etape 2/3 exercises, indexed by id", () => {
    assert.equal(exercises.length, 10);
    assert.deepEqual(Object.keys(exercisesById).sort(), [
      "ex-01-read-availability",
      "ex-02-decode",
      "ex-03-first-sale",
      "ex-04-full-pnr",
      "ex-05-long-sell",
      "ex-06-retrieve-modify",
      "ex-07-fix-mistakes",
      "ex-08-price-and-issue",
      "ex-09-waitlist",
      "ex-10-full-workflow",
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

describe("ex-05-long-sell -- two valid paths, one typical failure", () => {
  const exercise = exercisesById["ex-05-long-sell"];

  it("passes via a direct long sell, exactly as taught", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "SSPC4773Y26DECALGPAR1");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-longsell").reached,
      true
    );
  });

  it("passes via AN then a numeric SS (a genuinely different, non-long-sell path)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-longsell").reached,
      false
    );
  });

  it("fails when the wrong airline is long-sold", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "SSSV6979Y26DECALGPAR1");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, false);
  });
});

describe("ex-06-retrieve-modify -- two valid paths, one typical failure", () => {
  const exercise = exercisesById["ex-06-retrieve-modify"];

  it("passes retrieving by record locator, then rebooking the class", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "RT ABCDEF");
    state = await run(state, "SBM2");
    state = await run(state, "ER");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(result.score, result.maxScore);
  });

  it("passes retrieving by name instead (a genuinely different retrieval path)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "RT/SMITH");
    state = await run(state, "SBM2");
    state = await run(state, "ER");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
  });

  it("fails when the class is never actually changed", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "RT ABCDEF");
    state = await run(state, "ER");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, false);
    const byId = Object.fromEntries(result.feedback.map((f) => [f.objectifId, f.passed]));
    assert.equal(byId["obj-route-m"], false, "class was never changed to M");
  });
});

describe("ex-07-fix-mistakes -- two valid paths, one typical failure", () => {
  const exercise = exercisesById["ex-07-fix-mistakes"];

  it("passes by discarding everything at once with IG", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "IG");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-ig").reached,
      true
    );
  });

  it("passes by fixing both mistakes by hand (NU + DL + ER)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "NU1/1SMITH/JOHN MR");
    state = await run(state, "DL3");
    state = await run(state, "ER");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-nu").reached,
      true
    );
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-remove").reached,
      true
    );
  });

  it("fails cleanly when only one of the two mistakes gets fixed", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "NU1/1SMITH/JOHN MR"); // name fixed, extra segment left as-is

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, false);
    const byId = Object.fromEntries(result.feedback.map((f) => [f.objectifId, f.passed]));
    assert.equal(byId["obj-name"], true, "the name was fixed");
    assert.equal(byId["obj-segment-count"], false, "the extra segment is still active");
  });
});

describe("ex-08-price-and-issue -- two valid paths, one typical failure", () => {
  const exercise = exercisesById["ex-08-price-and-issue"];

  it("passes with the standard order (ER, then FXP/FP/TTP)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "ER");
    state = await run(state, "FXP");
    state = await run(state, "FPCASH");
    state = await run(state, "TTP");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(result.score, result.maxScore);
  });

  it("passes setting the form of payment before ER instead (a genuinely different order)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "FPCASH");
    state = await run(state, "ER");
    state = await run(state, "FXP");
    state = await run(state, "TTP");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
  });

  it("fails cleanly (precise per-objectif feedback) when TTP is attempted without a form of payment", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "ER");
    state = await run(state, "FXP");
    state = await run(state, "TTP"); // NO FORM OF PAYMENT -- never issues

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, false);
    const byId = Object.fromEntries(result.feedback.map((f) => [f.objectifId, f.passed]));
    assert.equal(byId["obj-pnr"], true);
    assert.equal(byId["obj-route"], true);
    assert.equal(byId["obj-ticket"], false, "no ticket was ever issued");
  });
});

describe("ex-09-waitlist -- two valid paths, one typical failure", () => {
  const exercise = exercisesById["ex-09-waitlist"];

  it("passes via an explicit PE waitlist request, exactly as taught", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS2D1PE");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "2/KL");
    state = await run(state, "ETK");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-pe").reached,
      true
    );
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-etk").reached,
      true
    );
  });

  it("passes by genuinely exhausting the class first (a different route to HL)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS2D4"); // exhausts all 4 D-class seats
    state = await run(state, "SS2D1"); // now auto-waitlisted (HL)
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "3/KL");
    state = await run(state, "ETK");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-pe").reached,
      false
    );
  });

  it("fails cleanly when ER is used instead of ETK (the segment stays KL, never entered as HK)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS2D1PE");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "2/KL");
    state = await run(state, "ER"); // not ETK -- KL is never entered as HK

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, false);
    const byId = Object.fromEntries(result.feedback.map((f) => [f.objectifId, f.passed]));
    assert.equal(byId["obj-pnr"], true, "ER still records the PNR");
    assert.equal(byId["obj-route-confirmed"], false, "the segment is still KL, not HK");
  });
});

describe("ex-10-full-workflow -- two valid paths, one typical failure", () => {
  const exercise = exercisesById["ex-10-full-workflow"];

  it("passes via AN then SS, the full standard sequence", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "TKTL/20DEC");
    state = await run(state, "ER");
    state = await run(state, "FXP");
    state = await run(state, "FPCASH");
    state = await run(state, "TTP");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
    assert.equal(result.score, result.maxScore);
  });

  it("passes via a direct long sell with a different element order (no AN, FP before ER)", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "SSPC4773Y26DECALGPAR1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "FPCASH");
    state = await run(state, "TKTL/20DEC");
    state = await run(state, "ER");
    state = await run(state, "FXP");
    state = await run(state, "TTP");

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, true);
  });

  it("fails cleanly (precise per-objectif feedback) when the ticket is never issued", async () => {
    let state = applySeedState(exercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "TKTL/20DEC");
    state = await run(state, "ER");
    state = await run(state, "FXP"); // never FP'd or TTP'd

    const result = evaluate(exercise, state, state.commandHistory);
    assert.equal(result.passed, false);
    const byId = Object.fromEntries(result.feedback.map((f) => [f.objectifId, f.passed]));
    assert.equal(byId["obj-pnr"], true);
    assert.equal(byId["obj-route"], true);
    assert.equal(byId["obj-name"], true);
    assert.equal(byId["obj-tktl"], true);
    assert.equal(byId["obj-ticket"], false, "the ticket was never issued");
  });
});
