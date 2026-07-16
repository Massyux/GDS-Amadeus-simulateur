import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processCommand } from "@simulateur/core";
import { applySeedState, evaluate } from "../index.js";

async function run(state, cmd) {
  const result = await processCommand(state, cmd);
  return result.state;
}

// Representative fixture exercise, not final content (that's Etape 2/3) --
// exercises the format end to end: mission 08's own example ("Reserve un
// aller ALG->PAR pour M. Dupont, valide le dossier").
const fixtureExercise = {
  id: "ex-fixture-01",
  niveau: 1,
  titre: {
    fr: "Réserver un aller ALG→PAR pour M. Dupont",
    en: "Book an ALG→PAR one-way for Mr Dupont",
  },
  consigne: {
    fr: "Vendez un vol ALG→PAR pour M. Dupont et enregistrez le dossier.",
    en: "Sell an ALG→PAR flight for Mr Dupont and record the PNR.",
  },
  objectifs: [
    {
      id: "obj-pnr",
      type: "pnr-recorded",
      label: { fr: "Dossier enregistré", en: "PNR recorded" },
      points: 2,
    },
    {
      id: "obj-route",
      type: "route",
      from: "ALG",
      to: "PAR",
      status: "HK",
      label: { fr: "Segment ALG→PAR confirmé", en: "Confirmed ALG→PAR segment" },
      points: 1,
    },
    {
      id: "obj-name",
      type: "passenger-name",
      lastName: "DUPONT",
      firstName: "JEAN",
      title: "MR",
      label: { fr: "Nom du passager conforme", en: "Passenger name matches" },
      points: 1,
    },
  ],
  jalonsTrace: [
    {
      id: "jt-an",
      pattern: "^AN",
      label: { fr: "A utilisé AN", en: "Used AN" },
    },
  ],
  aides: [
    {
      id: "hint-1",
      text: { fr: "Commencez par AN.", en: "Start with AN." },
      penalty: 1,
    },
  ],
};

describe("applySeedState", () => {
  it("returns a fresh core state when the exercise has no seedState", () => {
    const state = applySeedState({ id: "no-seed" });
    assert.equal(state.activePNR, null);
    assert.deepEqual(state.tsts, []);
  });

  it("merges seedState on top of createInitialState()", () => {
    const state = applySeedState({
      id: "with-seed",
      seedState: { commandHistory: ["AN26DECALGPAR"] },
    });
    assert.deepEqual(state.commandHistory, ["AN26DECALGPAR"]);
    // Untouched fields still come from createInitialState().
    assert.equal(state.activePNR, null);
  });
});

describe("evaluate -- golden: two different valid solutions both pass", () => {
  it("passes via the numeric-sell path (AN -> SS -> NM -> AP -> RF -> ER)", async () => {
    let state = applySeedState(fixtureExercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DUPONT/JEAN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "ER");

    const result = evaluate(fixtureExercise, state, state.commandHistory);

    assert.equal(result.passed, true);
    assert.equal(result.score, result.maxScore);
    assert.ok(result.feedback.every((f) => f.passed));
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-an").reached,
      true
    );
  });

  it("passes via the long-sell path (no AN at all -- a genuinely different route to the same end state)", async () => {
    let state = applySeedState(fixtureExercise);
    state = await run(state, "AN26DECALGPAR"); // probe only, to learn a real flight/date
    const item = state.lastAN.results[0];
    state = applySeedState(fixtureExercise); // restart clean, without the probe's AN in history
    state = await run(
      state,
      `SS${item.airline}${item.flightNo}Y${item.dateDDMMM}ALGPAR1`
    );
    state = await run(state, "NM1DUPONT/JEAN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "ER");

    const result = evaluate(fixtureExercise, state, state.commandHistory);

    assert.equal(result.passed, true);
    assert.equal(result.score, result.maxScore);
    // This solution never used AN -- the jalon is reached only by the OTHER
    // path, proving jalonsTrace never blocks passing (state-based only).
    assert.equal(
      result.jalonsFeedback.find((j) => j.jalonId === "jt-an").reached,
      false
    );
  });
});

describe("evaluate -- a typical incomplete failure gives precise per-objectif feedback", () => {
  it("fails cleanly (not a crash) when the segment is sold but the PNR is never named/recorded", async () => {
    let state = applySeedState(fixtureExercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1"); // sold, but no NM/AP/RF/ER afterward

    const result = evaluate(fixtureExercise, state, state.commandHistory);

    assert.equal(result.passed, false);
    const byId = Object.fromEntries(result.feedback.map((f) => [f.objectifId, f.passed]));
    assert.equal(byId["obj-pnr"], false, "PNR was never recorded");
    assert.equal(byId["obj-route"], true, "the segment itself was sold");
    assert.equal(byId["obj-name"], false, "no passenger was ever added");
    assert.ok(result.score < result.maxScore);
  });

  it("fails on an entirely untouched state (nothing done at all)", () => {
    const state = applySeedState(fixtureExercise);
    const result = evaluate(fixtureExercise, state, state.commandHistory);

    assert.equal(result.passed, false);
    assert.ok(result.feedback.every((f) => f.passed === false));
    assert.equal(result.score, 0);
  });
});

describe("evaluate -- hint penalties", () => {
  it("deducts each revealed aide's penalty from the score, floored at 0", async () => {
    let state = applySeedState(fixtureExercise);
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DUPONT/JEAN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "ER");

    const noHints = evaluate(fixtureExercise, state, state.commandHistory, {
      hintsUsed: 0,
    });
    const oneHint = evaluate(fixtureExercise, state, state.commandHistory, {
      hintsUsed: 1,
    });
    assert.equal(noHints.score, noHints.maxScore);
    assert.equal(oneHint.score, noHints.maxScore - 1);
    // passed is about objectifs only -- hints never change pass/fail.
    assert.equal(oneHint.passed, true);
  });

  it("never lets the score go negative even with more hints than aides defined", async () => {
    const state = applySeedState(fixtureExercise);
    const result = evaluate(fixtureExercise, state, [], { hintsUsed: 99 });
    assert.equal(result.score, 0);
  });
});

describe("evaluate -- objectif types (unit coverage)", () => {
  it("segment-count matches an exact count and an optional status filter", async () => {
    let state = applySeedState({});
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "SS1Y1");

    const exactTwo = evaluate(
      { objectifs: [{ id: "o", type: "segment-count", count: 2, label: {} }] },
      state,
      []
    );
    assert.equal(exactTwo.feedback[0].passed, true);

    const exactOne = evaluate(
      { objectifs: [{ id: "o", type: "segment-count", count: 1, label: {} }] },
      state,
      []
    );
    assert.equal(exactOne.feedback[0].passed, false);
  });

  it("segment-count ignores cancelled (HX) segments", async () => {
    let state = applySeedState({});
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "SS1Y1");
    state = await run(state, "XE1");

    const result = evaluate(
      { objectifs: [{ id: "o", type: "segment-count", count: 1, label: {} }] },
      state,
      []
    );
    assert.equal(result.feedback[0].passed, true);
  });

  it("tst-present checks for a TST, optionally by status", async () => {
    let state = applySeedState({});
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "FXP");

    const anyTst = evaluate(
      { objectifs: [{ id: "o", type: "tst-present", label: {} }] },
      state,
      []
    );
    assert.equal(anyTst.feedback[0].passed, true);

    const wrongStatus = evaluate(
      {
        objectifs: [
          { id: "o", type: "tst-present", status: "TICKETED", label: {} },
        ],
      },
      state,
      []
    );
    assert.equal(wrongStatus.feedback[0].passed, false);
  });

  it("ticket-issued is false until TTP actually issues one", async () => {
    let state = applySeedState({});
    state = await run(state, "AN26DECALGPAR");
    state = await run(state, "SS1Y1");
    state = await run(state, "NM1DOE/JOHN MR");
    state = await run(state, "AP1234567890");
    state = await run(state, "RFMM");
    state = await run(state, "ER");
    state = await run(state, "FXP");
    state = await run(state, "FPCASH");

    const beforeTicketing = evaluate(
      { objectifs: [{ id: "o", type: "ticket-issued", label: {} }] },
      state,
      []
    );
    assert.equal(beforeTicketing.feedback[0].passed, false);

    state = await run(state, "TTP");
    const afterTicketing = evaluate(
      { objectifs: [{ id: "o", type: "ticket-issued", label: {} }] },
      state,
      []
    );
    assert.equal(afterTicketing.feedback[0].passed, true);
  });

  it("element-status matches any active segment with the given status (e.g. a waitlist exercise)", async () => {
    let state = applySeedState({});
    state = await run(state, "AN26DECALGPAR");
    const item = state.lastAN.results.find((r) => r.lineNo === 1);
    const cls = item.bookingClasses.find((c) => c.code === "Y");
    const initialSeats = cls.seats;
    for (let i = 0; i < initialSeats; i++) {
      state = await run(state, "SS1Y1");
    }
    state = await run(state, "SS1Y1"); // now waitlisted (HL)

    const result = evaluate(
      { objectifs: [{ id: "o", type: "element-status", status: "HL", label: {} }] },
      state,
      []
    );
    assert.equal(result.feedback[0].passed, true);
  });

  it("an unknown objectif type fails closed instead of throwing", () => {
    const state = applySeedState({});
    const result = evaluate(
      { objectifs: [{ id: "o", type: "not-a-real-type", label: {} }] },
      state,
      []
    );
    assert.equal(result.feedback[0].passed, false);
    assert.equal(result.passed, false);
  });
});
