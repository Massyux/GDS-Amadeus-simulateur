import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitialState, processCommand } from "../index.js";

async function runCommand(state, cmd) {
  const result = await processCommand(state, cmd);
  return result.events.map((event) => event.text);
}

function getMoney(lines, label) {
  const line = lines.find((l) => l.startsWith(label));
  if (!line) return null;
  const match = line.match(/EUR\s+(\d+\.\d{2})/);
  return match ? Number.parseFloat(match[1]) : null;
}

function getRecordLocator(lines) {
  const locatorLine = lines.find((line) => line.startsWith("RECORD LOCATOR "));
  if (!locatorLine) return null;
  const match = locatorLine.match(/^RECORD LOCATOR ([A-Z]{6})$/);
  return match ? match[1] : null;
}

describe("processCommand", () => {
  it("returns help output", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "HELP");
    assert.equal(lines[0], "AVAILABLE COMMANDS");
    assert.ok(lines.includes("RT                  DISPLAY PNR (same as live)"));
  });

  it("emits error event for an invalid command", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "ZZZ");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "INVALID FORMAT"
      )
    );
  });

  it("uses deps.locations provider for DAC/DAN", async () => {
    const state = createInitialState();
    const provider = {
      decodeIata: async (code) => [`DAC ${code}`, "PROVIDER OK"],
      searchByText: async (text) => [`DAN ${text.toUpperCase()}`, "PROVIDER OK"],
    };
    const dac = await processCommand(state, "DAC ALG", {
      deps: { locations: provider },
    });
    const dan = await processCommand(state, "DAN PARIS", {
      deps: { locations: provider },
    });
    const dacLines = dac.events.map((event) => event.text);
    const danLines = dan.events.map((event) => event.text);
    assert.ok(dacLines.includes("PROVIDER OK"));
    assert.ok(danLines.includes("PROVIDER OK"));
  });

  it("returns explicit error when DAC/DAN provider is missing", async () => {
    const state = createInitialState();
    const dac = await processCommand(state, "DAC ALG");
    const dan = await processCommand(state, "DAN PARIS");
    assert.ok(
      dac.events.some(
        (event) =>
          event.type === "error" &&
          event.text === "LOCATION PROVIDER NOT CONFIGURED"
      )
    );
    assert.ok(
      dan.events.some(
        (event) =>
          event.type === "error" &&
          event.text === "LOCATION PROVIDER NOT CONFIGURED"
      )
    );
  });

  it("keeps backward compatibility with legacy options.locations cmdDAC/cmdDAN", async () => {
    const state = createInitialState();
    const legacyLocations = {
      cmdDAC: async (code) => [`DAC ${code}`, "LEGACY PROVIDER"],
      cmdDAN: async (text) => [`DAN ${text.toUpperCase()}`, "LEGACY PROVIDER"],
    };
    const dac = await processCommand(state, "DAC ALG", {
      locations: legacyLocations,
    });
    const lines = dac.events.map((event) => event.text);
    assert.ok(lines.includes("LEGACY PROVIDER"));
  });

  it("returns a date for JD", async () => {
    const state = createInitialState();
    const [line] = await runCommand(state, "JD");
    assert.match(line, /^[A-Z]{3} [A-Z]{3} \d{1,2} \d{4}$/);
  });

  it("uses deps.clock.now for JD output", async () => {
    const state = createInitialState();
    const fixed = new Date(2030, 0, 2, 12, 0, 0);
    const result = await processCommand(state, "JD", {
      deps: {
        clock: {
          now: () => fixed,
        },
      },
    });
    const line = result.events.map((event) => event.text)[0];
    assert.equal(line, fixed.toDateString().toUpperCase());
  });

  it("creates a PNR and returns it with RT", async () => {
    const state = createInitialState();

    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");

    const endLines = await runCommand(state, "ER");
    const locatorLine = endLines.find((line) => line.startsWith("RECORD LOCATOR "));
    assert.match(locatorLine, /^RECORD LOCATOR [A-Z]{6}$/);

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes("DOE/JOHN")));
    assert.ok(rtLines.some((line) => line.includes("REC LOC")));
  });

  it("supports NM2 with two adult passengers", async () => {
    const state = createInitialState();
    const nmLines = await runCommand(state, "NM2DOE/JOHN SMITH/JANE");
    assert.ok(nmLines.some((line) => line.includes("DOE/JOHN")));
    assert.ok(nmLines.some((line) => line.includes("SMITH/JANE")));

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes("DOE/JOHN")));
    assert.ok(rtLines.some((line) => line.includes("SMITH/JANE")));
  });

  it("returns error event for invalid NM format", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "NM1DOE");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "INVALID FORMAT"
      )
    );
  });

  it("stores RF value and displays it in RT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const rfLines = await runCommand(state, "RF M.MASSI");
    assert.equal(state.activePNR.rf, "M.MASSI");
    assert.ok(rfLines.some((line) => line.includes("RF M.MASSI")));

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes("RF M.MASSI")));
  });

  it("returns error event when RF is empty", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "RF");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "INVALID FORMAT"
      )
    );
  });

  it("keeps the same record locator on repeated ER", async () => {
    const state = createInitialState();

    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");

    const er1Lines = await runCommand(state, "ER");
    const locator1 = getRecordLocator(er1Lines);
    assert.ok(locator1);

    const er2Lines = await runCommand(state, "ER");
    const locator2 = getRecordLocator(er2Lines);
    assert.ok(locator2);
    assert.equal(locator2, locator1);
  });

  it("generates deterministic but distinct record locators for different PNR content", async () => {
    const stateA = createInitialState();
    await runCommand(stateA, "NM1DOE/JOHN MR");
    await runCommand(stateA, "AP111111");
    await runCommand(stateA, "RFTEST");
    const erALines = await runCommand(stateA, "ER");
    const locatorA = getRecordLocator(erALines);
    assert.ok(locatorA);

    const stateB = createInitialState();
    await runCommand(stateB, "NM1DOE/JANE MRS");
    await runCommand(stateB, "AP111111");
    await runCommand(stateB, "RFTEST");
    const erBLines = await runCommand(stateB, "ER");
    const locatorB = getRecordLocator(erBLines);
    assert.ok(locatorB);

    assert.notEqual(locatorA, locatorB);
  });

  it("generates the same record locator for identical PNR content", async () => {
    const createAndRecord = async () => {
      const state = createInitialState();
      await runCommand(state, "NM1DOE/JOHN MR");
      await runCommand(state, "AP123456");
      await runCommand(state, "RFTEST");
      const erLines = await runCommand(state, "ER");
      return getRecordLocator(erLines);
    };

    const locator1 = await createAndRecord();
    const locator2 = await createAndRecord();
    assert.ok(locator1);
    assert.equal(locator1, locator2);
  });

  it("returns no availability when selling without AN", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "SS1Y1");
    assert.deepEqual(lines, ["NO AVAILABILITY"]);
  });

  it("returns invalid format for a malformed AN", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "ANXYZ");
    assert.deepEqual(lines, ["INVALID FORMAT"]);
  });

  it("rejects AN with invalid date rollover", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "AN31FEBALGPAR");
    assert.deepEqual(lines, ["INVALID FORMAT"]);
  });

  it("rejects AN alternate format with invalid date rollover", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "ANALGPAR/31FEB");
    assert.deepEqual(lines, ["INVALID FORMAT"]);
  });

  it("returns sorted offline AN availability", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "AN26DECALGPAR", {});
    const results = result.state.lastAN?.results || [];
    assert.ok(results.length >= 8);
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i - 1].depTime <= results[i].depTime);
    }
  });

  it("uses deps.clock for AN date-year parsing", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "AN29FEBALGPAR", {
      deps: {
        clock: {
          now: () => new Date(2024, 0, 1, 10, 0, 0),
        },
      },
    });
    const lines = result.events.map((event) => event.text);
    assert.ok(!lines.includes("INVALID FORMAT"));
    assert.equal(result.state.lastAN?.query?.ddmmm, "29FEB");
  });

  it("uses a custom availability provider passed via deps", async () => {
    const state = createInitialState();
    const customAvailability = [
      {
        lineNo: 1,
        airline: "ZZ",
        flightNo: 9999,
        from: "ALG",
        to: "PAR",
        dateDDMMM: "26DEC",
        dow: "TH",
        depTime: "1010",
        arrTime: "1210",
        bookingClasses: [{ code: "Y", seats: 9 }],
      },
    ];
    const result = await processCommand(state, "AN26DECALGPAR", {
      deps: {
        availability: {
          searchAvailability: async () => customAvailability,
        },
      },
    });
    assert.equal(result.state.lastAN.results[0].airline, "ZZ");
    const output = result.events.map((event) => event.text);
    assert.ok(output.some((line) => line.includes("ZZ 9999")));
  });

  it("FXP creates TST and keeps classes unchanged", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    const beforeClass = state.activePNR.itinerary[0].classCode;

    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "NM1DOE/JANE (CHD/10)");

    const fxp = await processCommand(state, "FXP");
    const fxpLines = fxp.events.map((event) => event.text);
    assert.equal(state.activePNR.itinerary[0].classCode, beforeClass);
    assert.ok(fxpLines[0] === "FXP");
    assert.ok(fxpLines.some((line) => line.includes("TST CREATED")));
    assert.ok(fxpLines.some((line) => line.includes("STATUS: CREATED")));
    assert.ok(fxpLines.some((line) => line.includes("DZ")));
    assert.ok(fxpLines.some((line) => line.includes("FR")));
    assert.ok(fxpLines.some((line) => line.includes("YQ")));
    assert.ok(fxpLines.some((line) => line.includes("XT")));

    const tqt = await processCommand(state, "TQT");
    const tqtLines = tqt.events.map((event) => event.text);
    assert.ok(tqtLines.some((line) => line.startsWith("TQT1")));
    assert.ok(tqtLines.some((line) => line.includes("FARE BASIS:")));
    assert.ok(tqtLines.some((line) => line.trim().startsWith("DZ")));

    await processCommand(state, "AP123456");
    await processCommand(state, "RFTEST");
    await processCommand(state, "ER");
    const rt = await processCommand(state, "RT");
    const rtLines = rt.events.map((event) => event.text);
    assert.ok(rtLines.some((line) => line.includes("STATUS VALIDATED")));
  });

  it("FXX does not create TST", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    const fxx = await processCommand(state, "FXX");
    const fxxLines = fxx.events.map((event) => event.text);
    assert.ok(fxxLines.some((line) => line.includes("NO TST CREATED")));
    assert.equal(state.tsts.length, 0);
  });

  it("FXR changes classes and does not create TST", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    const beforeClass = state.activePNR.itinerary[0].classCode;
    const fxr = await processCommand(state, "FXR");
    const fxrLines = fxr.events.map((event) => event.text);
    assert.ok(fxrLines[0] === "FXR");
    assert.notEqual(state.activePNR.itinerary[0].classCode, beforeClass);
    assert.equal(state.tsts.length, 0);

    const stateFxP = createInitialState();
    await processCommand(stateFxP, "AN26DECALGPAR");
    await processCommand(stateFxP, "SS1Y2");
    const fxp = await processCommand(stateFxP, "FXP");
    const fxpLines = fxp.events.map((event) => event.text);
    const fxpTotal = getMoney(fxpLines, "TOTAL");
    const fxrTotal = getMoney(fxrLines, "NEW TOTAL");
    assert.ok(fxpTotal !== null && fxrTotal !== null);
    assert.ok(fxrTotal < fxpTotal);
  });

  it("FXB changes classes, creates TST, and is cheaper or equal to FXP", async () => {
    const baseState = createInitialState();
    await processCommand(baseState, "AN26DECALGPAR");
    await processCommand(baseState, "SS1Y2");
    const fxp = await processCommand(baseState, "FXP");
    const fxpLines = fxp.events.map((event) => event.text);
    const fxpTotal = getMoney(fxpLines, "TOTAL");

    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    const beforeClass = state.activePNR.itinerary[0].classCode;
    const fxb = await processCommand(state, "FXB");
    const fxbLines = fxb.events.map((event) => event.text);
    const fxbTotal = getMoney(fxbLines, "TOTAL");
    assert.ok(fxbLines[0] === "FXB");
    assert.ok(state.tsts.length === 1);
    assert.notEqual(state.activePNR.itinerary[0].classCode, beforeClass);
    assert.ok(fxpTotal !== null && fxbTotal !== null);
    assert.ok(fxbTotal <= fxpTotal);
  });

  it("FXL lists options and invalid variants are rejected", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    const beforeClass = state.activePNR.itinerary[0].classCode;
    const fxl = await processCommand(state, "FXL");
    const fxlLines = fxl.events.map((event) => event.text);
    assert.ok(fxlLines[0] === "FXL");
    assert.ok(fxlLines.some((line) => line.startsWith("OPTION 1")));
    assert.ok(fxlLines.some((line) => line.startsWith("OPTION 2")));
    assert.ok(fxlLines.some((line) => line.startsWith("OPTION 3")));
    assert.equal(state.activePNR.itinerary[0].classCode, beforeClass);

    const fxlBad = await processCommand(state, "FXL/ABC");
    const fxlBadLines = fxlBad.events.map((event) => event.text);
    assert.deepEqual(fxlBadLines, ["FXL", "FUNCTION NOT APPLICABLE"]);
  });

  it("IG clears the active PNR", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");

    const igLines = await runCommand(state, "IG");
    assert.ok(igLines.includes("IGNORED"));

    const rtLines = await runCommand(state, "RT");
    assert.deepEqual(rtLines, ["NO ACTIVE PNR"]);
  });

  it("IR retrieves a recorded PNR", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const recordLocator = getRecordLocator(erLines);
    assert.ok(recordLocator);

    await runCommand(state, "IG");
    const irLines = await runCommand(state, `IR${recordLocator}`);
    assert.ok(irLines.includes("RETRIEVED"));

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes(`REC LOC ${recordLocator}`)));
    assert.ok(rtLines.some((line) => line.includes("DOE/JOHN")));
  });

  it("XI cancels PNR on ER and removes it from the store", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const recordLocator = getRecordLocator(erLines);
    assert.ok(recordLocator);

    const xiLines = await runCommand(state, "XI");
    assert.ok(xiLines.includes("PNR CANCELLED - SIGN/ER REQUIRED"));

    const erCancelLines = await runCommand(state, "ER");
    assert.ok(erCancelLines.includes("PNR CANCELLED"));
    assert.ok(erCancelLines.includes("NO ACTIVE PNR"));

    const irLines = await runCommand(state, `IR${recordLocator}`);
    assert.deepEqual(irLines, ["PNR NOT FOUND"]);
  });

  it("XE rejects missing parameters", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const xeMissing = await runCommand(state, "XE");
    assert.deepEqual(xeMissing, ["INVALID FORMAT"]);
  });

  it("XE returns element not found when index is out of range", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const xeMissing = await runCommand(state, "XE99");
    assert.deepEqual(xeMissing, ["ELEMENT NOT FOUND"]);
  });

  it("XE cancels a segment by RT element number", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const rtLines = await runCommand(state, "RT");
    const segMatch = rtLines
      .map((line) =>
        line.match(
          /^\s*(\d+)\s+[A-Z0-9]{2}\s+\d{4}\s+[A-Z]\s+\d{2}[A-Z]{3}\s+[A-Z]{6}\s+\d{4}\s+\d{4}\s+[A-Z]{2}\d$/
        )
      )
      .find(Boolean);
    assert.ok(segMatch);
    const segmentElementNo = segMatch[1];

    const xeLines = await runCommand(state, `XE${segmentElementNo}`);
    assert.equal(xeLines[0], "OK");
    assert.equal(xeLines[1], "ELEMENT CANCELLED");

    const rtAfter = await runCommand(state, "RT");
    const segCancelled = rtAfter.some((line) =>
      new RegExp(`^\\s*${segmentElementNo}\\s+.*\\sXX\\d$`).test(line)
    );
    assert.ok(segCancelled);
  });

  it("XEALL marks all segments as cancelled", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "SS2Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const segmentCount = state.activePNR.itinerary.length;

    const xeAll = await runCommand(state, "XEALL");
    assert.equal(xeAll[0], "OK");
    assert.equal(xeAll[1], "ITINERARY CANCELLED");

    const rtLines = await runCommand(state, "RT");
    const cancelledSegments = rtLines.filter((line) =>
      /^\s*\d+\s+[A-Z0-9]{2}\s+\d{4}\s+[A-Z]\s+\d{2}[A-Z]{3}\s+[A-Z]{6}\s+\d{4}\s+\d{4}\s+XX\d$/.test(
        line
      )
    );
    assert.equal(cancelledSegments.length, segmentCount);
  });
});
