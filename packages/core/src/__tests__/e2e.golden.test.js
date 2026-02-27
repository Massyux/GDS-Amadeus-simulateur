import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitialState, processCommand } from "../index.js";

function createDeterministicDeps(overrides = {}) {
  const fixedNow = new Date(Date.UTC(2030, 11, 1, 12, 0, 0));
  let seed = 123456789;
  const base = {
    clock: {
      now: () => new Date(fixedNow),
      today: () =>
        new Date(
          fixedNow.getUTCFullYear(),
          fixedNow.getUTCMonth(),
          fixedNow.getUTCDate()
        ),
      todayUTC: () =>
        new Date(
          Date.UTC(
            fixedNow.getUTCFullYear(),
            fixedNow.getUTCMonth(),
            fixedNow.getUTCDate()
          )
        ),
    },
    rng: () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    },
  };
  const merged = { ...base, ...overrides };
  merged.clock = { ...base.clock, ...(overrides.clock || {}) };
  return merged;
}

async function runScenario(commands, depsOverride = {}, state = createInitialState()) {
  const deps = createDeterministicDeps(depsOverride);
  const steps = [];

  for (const cmd of commands) {
    const result = await processCommand(state, cmd, { deps });
    const prints = result.events
      .filter((event) => event.type === "print")
      .map((event) => event.text);
    const errors = result.events
      .filter((event) => event.type === "error")
      .map((event) => event.text);
    steps.push({ cmd, events: result.events, prints, errors });
  }

  const lastRtStep = [...steps].reverse().find((step) => step.cmd.toUpperCase() === "RT");
  const allEvents = steps.flatMap((step) => step.events);

  return {
    state,
    steps,
    allEvents,
    lastRtLines: lastRtStep ? lastRtStep.prints : [],
  };
}

function getStep(steps, cmd) {
  return steps.find((step) => step.cmd.toUpperCase() === cmd.toUpperCase());
}

function getErrorTexts(events) {
  return events.filter((event) => event.type === "error").map((event) => event.text);
}

function assertNoErrors(steps) {
  const errors = steps.flatMap((step) => step.errors);
  assert.deepEqual(errors, []);
}

function getRecordLocator(lines) {
  const erLine = lines.find((line) => line.startsWith("RECORD LOCATOR "));
  if (erLine) {
    const m = erLine.match(/^RECORD LOCATOR ([A-Z]{6})$/);
    return m ? m[1] : null;
  }
  const rtLine = lines.find((line) => /REC LOC [A-Z]{6}/.test(line));
  if (rtLine) {
    const m = rtLine.match(/REC LOC ([A-Z]{6})/);
    return m ? m[1] : null;
  }
  return null;
}

function getRtSegmentLines(lines) {
  return lines.filter((line) =>
    /^\s*\d+\s+[A-Z0-9]{2}\s+\d{4}\s+[A-Z]\s+\d{2}[A-Z]{3}\s+[A-Z]{6}\s+\d{4}\s+\d{4}\s+[A-Z]{2}\d$/.test(
      line
    )
  );
}

function getSegmentStatus(line) {
  const match = line.match(/\s([A-Z]{2})\d$/);
  return match ? match[1] : null;
}

function assertCoreInvariants(state, rtLines) {
  if (!state.activePNR) return;
  const pnr = state.activePNR;
  pnr.elements ||= [];
  const keys = pnr.elements.map((entry) =>
    typeof entry.index === "number" ? `${entry.kind}:${entry.index}` : `${entry.kind}`
  );
  assert.equal(keys.length, new Set(keys).size);

  if (pnr.recordLocator) {
    assert.ok(rtLines.some((line) => line.includes(`REC LOC ${pnr.recordLocator}`)));
  }

  const tickets = pnr.tickets || [];
  const ticketNumbers = tickets.map((ticket) => ticket.ticketNumber);
  assert.equal(ticketNumbers.length, new Set(ticketNumbers).size);
}

describe("global golden/invariant suite", () => {
  const happyPathCommands = [
    "AN26DECALGPAR",
    "SS1Y1",
    "NM1DOE/JOHN MR",
    "AP123456",
    "APE-john.doe@example.com",
    "RFTEST",
    "RMTEST REMARK",
    "OSI YY TEST MESSAGE",
    "SSR DOCS YY HK1/P/FR/1234567890/FR/01JAN90/M/01JAN30/DOE/JOHN",
    "TKTL26DEC",
    "FP CASH",
    "FXP",
    "FXX",
    "TQT",
    "ET",
    "ITR-EML",
    "ER",
    "RT",
  ];

  it("TESTSET 1 - happy path complete has coherent RT/state", async () => {
    const result = await runScenario(happyPathCommands);
    assertNoErrors(result.steps);

    const rt = result.lastRtLines;
    assert.ok(rt.some((line) => line.includes("DOE/JOHN MR")));
    assert.ok(getRtSegmentLines(rt).length >= 1);
    assert.ok(rt.some((line) => line.includes("SSR DOCS")));
    assert.ok(rt.some((line) => line.includes("OSI YY TEST MESSAGE")));
    assert.ok(rt.some((line) => line.includes("RM TEST REMARK")));
    assert.ok(rt.some((line) => line.includes("TKTL/26DEC")));
    assert.ok(rt.some((line) => line.includes("FP CASH")));
    assert.ok(rt.some((line) => line.includes("FA 172-")));
    assert.ok(rt.some((line) => line.includes("FB TST1")));
    assert.ok(rt.some((line) => line.includes("ITR-EML")));
    assert.ok(rt.some((line) => /REC LOC [A-Z]{6}/.test(line)));
    assert.ok(
      rt.some((line) => line.includes("TST 1") && line.includes("STATUS TICKETED"))
    );

    const idxNm = rt.findIndex((line) => line.includes("DOE/JOHN MR"));
    const idxSeg = rt.findIndex((line) => getRtSegmentLines([line]).length === 1);
    const idxSsr = rt.findIndex((line) => line.includes("SSR DOCS"));
    const idxOsi = rt.findIndex((line) => line.includes("OSI YY TEST MESSAGE"));
    const idxRm = rt.findIndex((line) => line.includes("RM TEST REMARK"));
    const idxTktl = rt.findIndex((line) => line.includes("TKTL/26DEC"));
    const idxFp = rt.findIndex((line) => line.includes("FP CASH"));
    const idxFa = rt.findIndex((line) => line.includes("FA 172-"));
    const idxFb = rt.findIndex((line) => line.includes("FB TST1"));
    const idxItr = rt.findIndex((line) => line.includes("ITR-EML"));
    const idxTst = rt.findIndex(
      (line) => line.includes("TST 1") && line.includes("STATUS TICKETED")
    );

    assert.ok(idxNm < idxSeg);
    assert.ok(idxSeg < idxSsr);
    assert.ok(idxSsr < idxOsi);
    assert.ok(idxOsi < idxRm);
    assert.ok(idxRm < idxTktl);
    assert.ok(idxTktl < idxFp);
    assert.ok(idxFp < idxFa);
    assert.ok(idxFa < idxFb);
    assert.ok(idxFb < idxItr);
    assert.ok(idxItr < idxTst);

    assert.equal(result.state.tsts[0].status, "TICKETED");
    assert.equal(result.state.activePNR.tickets.length, 1);
    assert.equal(result.state.activePNR.tickets[0].ticketNumber, "172-0000000001");
    assert.equal(result.state.activePNR.receipts.length, 1);
    assert.equal(
      result.state.activePNR.receipts[0].ticketNumber,
      result.state.activePNR.tickets[0].ticketNumber
    );
    assert.ok(result.state.activePNR.receipts[0].passengerName.includes("DOE/JOHN"));
    assert.ok(result.state.activePNR.receipts[0].segments.length >= 1);
    assertCoreInvariants(result.state, rt);
  });

  it("TESTSET 2 - determinism for RL/ticket/pricing/RT", async () => {
    const run = async () => {
      const scenario = await runScenario(happyPathCommands);
      const erStep = getStep(scenario.steps, "ER");
      const fxpStep = getStep(scenario.steps, "FXP");
      const tqtStep = getStep(scenario.steps, "TQT");
      return {
        locator: getRecordLocator(erStep ? erStep.prints : []),
        ticket: scenario.state.activePNR.tickets[0].ticketNumber,
        fxp: fxpStep ? fxpStep.prints : [],
        tqt: tqtStep ? tqtStep.prints : [],
        rt: scenario.lastRtLines,
      };
    };

    const a = await run();
    const b = await run();
    const c = await run();
    assert.deepEqual(b, a);
    assert.deepEqual(c, a);
  });

  it("TESTSET 3 - IG/IR rollback + IR bad locator + no recorded errors", async () => {
    const igScenario = await runScenario([
      "NM1DOE/JOHN MR",
      "AP123456",
      "RFTEST",
      "RM BASE",
      "ER",
      "RM UNRECORDED",
      "IG",
      "RT",
    ]);
    assertNoErrors(igScenario.steps);
    assert.ok(!igScenario.lastRtLines.some((line) => line.includes("UNRECORDED")));
    assert.ok(igScenario.lastRtLines.some((line) => line.includes("RM BASE")));

    const irScenario = await runScenario([
      "NM1DOE/JOHN MR",
      "AP123456",
      "RFTEST",
      "RM BASE",
      "ER",
      "RM UNRECORDED",
      "IR",
      "RT",
    ]);
    assertNoErrors(irScenario.steps);
    assert.ok(!irScenario.lastRtLines.some((line) => line.includes("UNRECORDED")));
    assert.ok(irScenario.lastRtLines.some((line) => line.includes("RM BASE")));

    const noRecorded = createInitialState();
    const igNoRecorded = await processCommand(noRecorded, "IG", {
      deps: createDeterministicDeps(),
    });
    assert.ok(
      igNoRecorded.events.some(
        (event) => event.type === "error" && event.text === "NO RECORDED PNR"
      )
    );
    const irNoRecorded = await processCommand(createInitialState(), "IR", {
      deps: createDeterministicDeps(),
    });
    assert.ok(
      irNoRecorded.events.some(
        (event) => event.type === "error" && event.text === "NO RECORDED PNR"
      )
    );
    const irBadLocator = await runScenario(["IR ABCDEF"]);
    assert.ok(irBadLocator.steps[0].errors.includes("PNR NOT FOUND"));
  });

  it("TESTSET 4 - XE cancellation semantics + pricing ignores cancelled", async () => {
    const xeOne = await runScenario([
      "AN26DECALGPAR",
      "SS1Y1",
      "SS2Y1",
      "XE1",
      "RT",
      "FXP",
    ]);
    const segments = getRtSegmentLines(xeOne.lastRtLines);
    assert.equal(segments.length, 2);
    assert.ok(["HX", "XX"].includes(getSegmentStatus(segments[0])));
    assert.equal(getSegmentStatus(segments[1]), "HK");
    assert.deepEqual(xeOne.state.tsts[0].segments, [2]);

    const xeAll = await runScenario([
      "AN26DECALGPAR",
      "SS1Y1",
      "SS2Y1",
      "XEALL",
      "FXP",
    ]);
    const fxpStep = getStep(xeAll.steps, "FXP");
    assert.ok(fxpStep.errors.includes("NO ITINERARY"));

    const doubleCancel = await runScenario([
      "AN26DECALGPAR",
      "SS1Y1",
      "SS2Y1",
      "XE1",
      "XE1",
    ]);
    const secondXe = doubleCancel.steps[doubleCancel.steps.length - 1];
    assert.ok(secondXe.errors.includes("NOTHING TO CANCEL"));
  });

  it("TESTSET 5 - pricing invariants/prerequisites", async () => {
    const fxpNoItinerary = await runScenario(["FXP"]);
    assert.ok(fxpNoItinerary.steps[0].errors.includes("NO ITINERARY"));

    const fxxNoTst = await runScenario(["AN26DECALGPAR", "SS1Y1", "FXX"]);
    assert.ok(getStep(fxxNoTst.steps, "FXX").errors.includes("NO TST"));

    const fxrScenario = await runScenario([
      "AN26DECALGPAR",
      "SS1Y1",
      "NM1DOE/JOHN MR",
      "FXP",
    ]);
    const beforeClass = fxrScenario.state.activePNR.itinerary[0].classCode;
    const fxrResult = await processCommand(fxrScenario.state, "FXR", {
      deps: createDeterministicDeps(),
    });
    assert.deepEqual(getErrorTexts(fxrResult.events), []);
    assert.equal(fxrScenario.state.activePNR.itinerary[0].classCode, beforeClass);

    const fxlNoTst = await runScenario(["FXL"]);
    assert.ok(fxlNoTst.steps[0].errors.includes("NO TST"));
    const tqtNoTst = await runScenario(["TQT"]);
    assert.ok(tqtNoTst.steps[0].errors.includes("NO TST"));
    const fqnNoTst = await runScenario(["FQN"]);
    assert.ok(fqnNoTst.steps[0].errors.includes("NO TST"));
  });

  it("TESTSET 6 - ticketing invariants", async () => {
    const etNoTst = await runScenario(["AN26DECALGPAR", "SS1Y1", "NM1DOE/JOHN MR", "ET"]);
    assert.ok(getStep(etNoTst.steps, "ET").errors.includes("NO TST"));
    assert.equal((etNoTst.state.activePNR.tickets || []).length, 0);

    const etNoFp = await runScenario([
      "AN26DECALGPAR",
      "SS1Y1",
      "NM1DOE/JOHN MR",
      "FXP",
      "ET",
    ]);
    assert.ok(getStep(etNoFp.steps, "ET").errors.includes("NO FORM OF PAYMENT"));
    assert.equal((etNoFp.state.activePNR.tickets || []).length, 0);

    const voidNoTicket = await runScenario(["VOID"]);
    assert.ok(voidNoTicket.steps[0].errors.includes("NO TICKET"));

    const voidWithTicket = await runScenario([
      "AN26DECALGPAR",
      "SS1Y1",
      "NM1DOE/JOHN MR",
      "FP CASH",
      "FXP",
      "ET",
      "VOID",
      "RT",
    ]);
    assert.equal(voidWithTicket.state.activePNR.tickets[0].status, "VOID");
    assert.ok(
      voidWithTicket.lastRtLines.some((line) => line.includes("FA 172-0000000001 VOID"))
    );
  });

  it("TESTSET 7 - ITR-EML invariants", async () => {
    const noTicket = await runScenario(["NM1DOE/JOHN MR", "APE-john.doe@example.com", "ITR-EML"]);
    assert.ok(getStep(noTicket.steps, "ITR-EML").errors.includes("NO TICKET"));

    const noEmail = await runScenario([
      "AN26DECALGPAR",
      "SS1Y1",
      "NM1DOE/JOHN MR",
      "FP CASH",
      "FXP",
      "ET",
      "ITR-EML",
    ]);
    assert.ok(getStep(noEmail.steps, "ITR-EML").errors.includes("NO EMAIL ADDRESS"));

    const ok = await runScenario([
      "AN26DECALGPAR",
      "SS1Y1",
      "NM1DOE/JOHN MR",
      "FP CASH",
      "FXP",
      "ET",
      "APE-john.doe@example.com",
      "ITR-EML",
      "RT",
    ]);
    assertNoErrors(ok.steps);
    assert.equal(ok.state.activePNR.receipts.length, 1);
    assert.ok(ok.lastRtLines.some((line) => line.includes("ITR-EML")));
  });

  it("TESTSET 8 - TN/SN outputs, invalids and pagination", async () => {
    const tn = await runScenario(["TN26DECALGPAR"]);
    assert.ok(getStep(tn.steps, "TN26DECALGPAR").prints.length > 0);
    assert.ok(getStep(tn.steps, "TN26DECALGPAR").prints.some((line) => line.includes("PAGE")));

    const sn = await runScenario(["SN26DECALGPAR"]);
    assert.ok(getStep(sn.steps, "SN26DECALGPAR").prints.length > 0);

    const badTn = await runScenario(["TN31FEBALGPAR"]);
    assert.ok(badTn.steps[0].errors.includes("INVALID FORMAT"));

    const badSn = await runScenario(["SNBADINPUT"]);
    assert.ok(badSn.steps[0].errors.includes("INVALID FORMAT"));
  });

  it("TESTSET 9 - HE/HELP", async () => {
    const he = await runScenario(["HE"]);
    assert.ok(he.steps[0].prints.length > 0);

    const heAn = await runScenario(["HE AN"]);
    assert.ok(heAn.steps[0].prints.some((line) => line.includes("ANddMMMXXXYYY")));

    const heUnknown = await runScenario(["HE FOOBAR"]);
    assert.ok(heUnknown.steps[0].errors.includes("HELP NOT FOUND"));

    const help = await runScenario(["HELP"]);
    const lines = help.steps[0].prints;
    assert.ok(lines.some((line) => line.startsWith("AN")));
    assert.ok(lines.some((line) => line.startsWith("SS")));
    assert.ok(lines.some((line) => line.startsWith("NM")));
    assert.ok(lines.some((line) => line.startsWith("ER")));
    assert.ok(lines.some((line) => line.startsWith("RT")));
    assert.ok(lines.some((line) => line.includes("FXP/FXX/FXR/FXB")));
    assert.ok(lines.some((line) => line.includes("ET / TTP")));
  });

  it("TESTSET 10 - queue end-to-end and edge cases", async () => {
    const base = await runScenario([
      "AN26DECALGPAR",
      "SS1Y1",
      "NM1DOE/JOHN MR",
      "AP123456",
      "RFTEST",
      "ER",
      "QP/12C1",
      "QP/12C1",
      "QD/12C1",
      "QE/12C1",
      "QN",
      "RT",
      "QR",
      "QD/12C1",
      "QS",
    ]);
    assertNoErrors(base.steps);
    const erStep = getStep(base.steps, "ER");
    const rl = getRecordLocator(erStep.prints);
    assert.ok(rl);
    const firstQd = getStep(base.steps, "QD/12C1").prints;
    const occurrences = firstQd.filter((line) => line.includes(rl)).length;
    assert.equal(occurrences, 1);
    assert.ok(getStep(base.steps, "QN").prints.includes(`PNR FROM QUEUE 12C1 ${rl}`));
    const secondQd = base.steps[base.steps.length - 2].prints;
    assert.ok(secondQd.includes("QUEUE EMPTY"));

    const qnNoQe = await runScenario(["QN"]);
    assert.ok(qnNoQe.steps[0].errors.includes("NO ACTIVE QUEUE"));
    const qdUnknown = await runScenario(["QD/99C9"]);
    assert.ok(qdUnknown.steps[0].errors.includes("QUEUE NOT FOUND"));
    const qpNoEr = await runScenario(["QP/12C1"]);
    assert.ok(qpNoEr.steps[0].errors.includes("NO RECORDED PNR"));
  });

  it("TESTSET 11 - generic state invariants on happy scenarios", async () => {
    const scenario = await runScenario([
      "AN26DECALGPAR",
      "SS1Y1",
      "NM1DOE/JOHN MR",
      "AP123456",
      "RFTEST",
      "ER",
      "RT",
    ]);
    assertNoErrors(scenario.steps);
    assertCoreInvariants(scenario.state, scenario.lastRtLines);
    const rlBeforeIg = scenario.state.activePNR.recordLocator;

    const igResult = await processCommand(scenario.state, "IG", {
      deps: createDeterministicDeps(),
    });
    assert.deepEqual(getErrorTexts(igResult.events), []);
    assert.equal(scenario.state.activePNR.recordLocator, rlBeforeIg);
  });

  it("TESTSET 12 - fuzz invalid formats (table driven)", async () => {
    const cases = [
      { cmd: "NM1DOE", setup: [] },
      { cmd: "APE-nope", setup: [] },
      { cmd: "TKTL31FEB", setup: [] },
      { cmd: "OP31FEB/CALL", setup: [] },
      { cmd: "SSR DOCS YY", setup: [] },
      { cmd: "QP/", setup: [] },
      { cmd: "IR123", setup: [] },
      { cmd: "XE99", setup: ["NM1DOE/JOHN MR"] },
      { cmd: "FXP", setup: [] },
      { cmd: "FXX", setup: ["AN26DECALGPAR", "SS1Y1"] },
      { cmd: "TQT", setup: [] },
    ];

    for (const item of cases) {
      const state = createInitialState();
      const deps = createDeterministicDeps();
      for (const setupCmd of item.setup) {
        await processCommand(state, setupCmd, { deps });
      }
      const res = await processCommand(state, item.cmd, { deps });
      assert.ok(
        res.events.some((event) => event.type === "error"),
        `expected error for command: ${item.cmd}`
      );
    }
  });
});
