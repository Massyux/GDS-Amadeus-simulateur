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

  it("adds RM remark and shows it in RT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const rmLines = await runCommand(state, "RM VIP CUSTOMER");
    assert.deepEqual(state.activePNR.remarks, ["VIP CUSTOMER"]);
    assert.ok(rmLines.some((line) => line.includes("RM VIP CUSTOMER")));

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes("RM VIP CUSTOMER")));
  });

  it("returns error event when RM is empty", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "RM");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "INVALID FORMAT"
      )
    );
  });

  it("adds OSI and shows it in RT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const osiLines = await runCommand(state, "OSI YY VIP CUSTOMER");
    assert.deepEqual(state.activePNR.osi, ["YY VIP CUSTOMER"]);
    assert.ok(osiLines.some((line) => line.includes("OSI YY VIP CUSTOMER")));

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes("OSI YY VIP CUSTOMER")));
  });

  it("returns error event for invalid OSI format", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "OSI YY");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "INVALID FORMAT"
      )
    );
  });

  it("adds SSR and shows it in RT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const ssrLines = await runCommand(state, "SSR WCHR YY NEED WHEELCHAIR");
    assert.deepEqual(state.activePNR.ssr, ["WCHR YY NEED WHEELCHAIR"]);
    assert.ok(
      ssrLines.some((line) => line.includes("SSR WCHR YY NEED WHEELCHAIR"))
    );

    const rtLines = await runCommand(state, "RT");
    assert.ok(
      rtLines.some((line) => line.includes("SSR WCHR YY NEED WHEELCHAIR"))
    );
  });

  it("returns error event for invalid SSR format", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "SSR WCHR YY");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "INVALID FORMAT"
      )
    );
  });

  it("sets TKTL with a valid date and shows it in RT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const tktlLines = await runCommand(state, "TKTL/26DEC");
    assert.equal(state.activePNR.tktl, "26DEC");
    assert.ok(tktlLines.some((line) => line.includes("TKTL/26DEC")));

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes("TKTL/26DEC")));
  });

  it("returns error event when TKTL date is invalid", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "TKTL31FEB");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "INVALID FORMAT"
      )
    );
  });

  it("sets FP CASH and shows it in RT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const fpLines = await runCommand(state, "FP CASH");
    assert.equal(state.activePNR.fp, "CASH");
    assert.ok(fpLines.some((line) => line.includes("FP CASH")));

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes("FP CASH")));
  });

  it("returns error event when FP is empty", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "FP");
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
    const createdTst = state.tsts[0];
    assert.equal(createdTst.currency, "EUR");
    assert.equal(createdTst.pricingStatus, "CREATED");
    assert.equal(createdTst.totals.total, createdTst.total);
    assert.equal(createdTst.totals.taxTotal, createdTst.taxTotal);
    assert.deepEqual(createdTst.totals.taxes, createdTst.taxes);
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

  it("FXX creates or updates TST as STORED", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    await processCommand(state, "NM1DOE/JOHN MR");
    const fxx = await processCommand(state, "FXX");
    const fxxLines = fxx.events.map((event) => event.text);
    assert.ok(fxxLines.some((line) => line.includes("STATUS: STORED")));
    assert.equal(state.tsts.length, 1);
    assert.equal(state.tsts[0].status, "STORED");
    assert.equal(state.tsts[0].pricingStatus, "STORED");
  });

  it("FXX works after ER and keeps TST in STORED status", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "AP123456");
    await processCommand(state, "RFTEST");
    await processCommand(state, "ER");

    const fxx = await processCommand(state, "FXX");
    const fxxLines = fxx.events.map((event) => event.text);
    assert.ok(fxxLines.some((line) => line.includes("STATUS: STORED")));
    assert.equal(state.tsts.length, 1);
    assert.equal(state.tsts[0].status, "STORED");
  });

  it("FXR reprices and keeps TST linked to segments without rebook", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    const beforeClass = state.activePNR.itinerary[0].classCode;
    const fxr = await processCommand(state, "FXR");
    const fxrLines = fxr.events.map((event) => event.text);
    assert.ok(fxrLines[0] === "FXR");
    assert.equal(state.activePNR.itinerary[0].classCode, beforeClass);
    assert.equal(state.tsts.length, 1);
    assert.equal(state.tsts[0].status, "REPRICED");
    assert.equal(state.tsts[0].segments.length, 1);
    assert.equal(state.tsts[0].segments[0], 1);

    const stateFxP = createInitialState();
    await processCommand(stateFxP, "AN26DECALGPAR");
    await processCommand(stateFxP, "SS1Y2");
    const fxp = await processCommand(stateFxP, "FXP");
    const fxpLines = fxp.events.map((event) => event.text);
    const fxpTotal = getMoney(fxpLines, "TOTAL");
    const fxrTotal = getMoney(fxrLines, "NEW TOTAL");
    assert.ok(fxpTotal !== null && fxrTotal !== null);
    assert.ok(fxrTotal > 0);
  });

  it("FXB creates final TST without rebooking classes", async () => {
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
    assert.equal(state.activePNR.itinerary[0].classCode, beforeClass);
    assert.equal(state.tsts[0].status, "READY_TO_TICKET");
    assert.ok(fxpTotal !== null && fxbTotal !== null);
    assert.ok(fxbTotal > 0);
  });

  it("FXB works after ER and keeps a ticket-ready TST", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "AP123456");
    await processCommand(state, "RFTEST");
    await processCommand(state, "ER");

    const fxb = await processCommand(state, "FXB");
    const fxbLines = fxb.events.map((event) => event.text);
    assert.ok(fxbLines.some((line) => line.includes("READY_TO_TICKET")));
    assert.equal(state.tsts.length, 1);
    assert.equal(state.tsts[0].status, "READY_TO_TICKET");
  });

  it("FXL displays existing TST and invalid variants are rejected", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FXP");
    const fxl = await processCommand(state, "FXL");
    const fxlLines = fxl.events.map((event) => event.text);
    assert.ok(fxlLines[0] === "FXL");
    assert.ok(fxlLines.some((line) => line.includes("PRICING DISPLAY - STORED TST")));
    assert.ok(fxlLines.some((line) => line.startsWith("TST ")));
    assert.ok(fxlLines.some((line) => line.startsWith("TOTAL")));

    const fxlBad = await processCommand(state, "FXL/ABC");
    const fxlBadLines = fxlBad.events.map((event) => event.text);
    assert.deepEqual(fxlBadLines, ["FXL", "FUNCTION NOT APPLICABLE"]);
  });

  it("FXL without TST returns NO TST", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    const fxl = await processCommand(state, "FXL");
    assert.ok(
      fxl.events.some(
        (event) => event.type === "error" && event.text === "NO TST"
      )
    );
  });

  it("TQT displays detailed TST view after FXP", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FXP");

    const tqt = await processCommand(state, "TQT");
    const lines = tqt.events.map((event) => event.text);
    assert.ok(lines.some((line) => line.startsWith("TQT1")));
    assert.ok(lines.includes("SEGMENTS:"));
    assert.ok(lines.includes("FARE BASIS:"));
    assert.ok(lines.some((line) => line.startsWith("TOTAL    EUR ")));
  });

  it("FQN is stable for the same TST context", async () => {
    const runFqn = async () => {
      const state = createInitialState();
      await processCommand(state, "AN26DECALGPAR");
      await processCommand(state, "SS1Y2");
      await processCommand(state, "NM1DOE/JOHN MR");
      await processCommand(state, "FXP");
      const fqn = await processCommand(state, "FQN1");
      return fqn.events.map((event) => event.text);
    };
    const linesA = await runFqn();
    const linesB = await runFqn();
    assert.deepEqual(linesA, linesB);
  });

  it("FQN without TST returns NO TST", async () => {
    const state = createInitialState();
    const fqn = await processCommand(state, "FQN1");
    assert.ok(
      fqn.events.some(
        (event) => event.type === "error" && event.text === "NO TST"
      )
    );
  });

  it("ET issues ticket and RT shows FA line", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FP CASH");
    await processCommand(state, "FXP");

    const et = await processCommand(state, "ET");
    const etLines = et.events.map((event) => event.text);
    assert.ok(etLines.some((line) => line.includes("TICKET ISSUED")));
    assert.equal(state.activePNR.tickets.length, 1);
    assert.equal(state.activePNR.tickets[0].status, "ISSUED");
    assert.equal(state.tsts[0].status, "TICKETED");

    const rt = await processCommand(state, "RT");
    const rtLines = rt.events.map((event) => event.text);
    assert.ok(rtLines.some((line) => line.includes("FA 172-0000000001 ISSUED")));
    assert.ok(rtLines.some((line) => line.includes("FB TST1 172-0000000001")));
  });

  it("ET without TST returns NO TST", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FP CASH");
    const et = await processCommand(state, "ET");
    assert.ok(
      et.events.some((event) => event.type === "error" && event.text === "NO TST")
    );
  });

  it("TTP without FP returns NO FORM OF PAYMENT", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FXP");
    const ttp = await processCommand(state, "TTP");
    assert.ok(
      ttp.events.some(
        (event) => event.type === "error" && event.text === "NO FORM OF PAYMENT"
      )
    );
  });

  it("VOID marks ticket as void and RT reflects it", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FP CASH");
    await processCommand(state, "FXP");
    await processCommand(state, "ET");

    const voidResult = await processCommand(state, "VOID");
    const voidLines = voidResult.events.map((event) => event.text);
    assert.ok(voidLines.some((line) => line.includes("TICKET VOIDED")));
    assert.equal(state.activePNR.tickets[0].status, "VOID");

    const rt = await processCommand(state, "RT");
    const rtLines = rt.events.map((event) => event.text);
    assert.ok(rtLines.some((line) => line.includes("FA 172-0000000001 VOID")));
  });

  it("VOID without ticket returns NO TICKET", async () => {
    const state = createInitialState();
    const voidResult = await processCommand(state, "VOID");
    assert.ok(
      voidResult.events.some(
        (event) => event.type === "error" && event.text === "NO TICKET"
      )
    );
  });

  it("FXP creates deterministic normalized TST totals for same inputs", async () => {
    const createTstTotals = async () => {
      const state = createInitialState();
      await processCommand(state, "AN26DECALGPAR");
      await processCommand(state, "SS1Y2");
      await processCommand(state, "NM1DOE/JOHN MR");
      await processCommand(state, "FXP");
      return state.tsts[0].totals;
    };
    const totalsA = await createTstTotals();
    const totalsB = await createTstTotals();
    assert.deepEqual(totalsA, totalsB);
  });

  it("FXP returns error when no active segment remains", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM2DOE/JOHN SMITH/JANE");
    await processCommand(state, "XEALL");
    const fxp = await processCommand(state, "FXP");
    assert.ok(
      fxp.events.some(
        (event) => event.type === "error" && event.text === "NO ITINERARY"
      )
    );
  });

  it("returns error for IG when no recorded PNR is available", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");

    const result = await processCommand(state, "IG");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "NO RECORDED PNR"
      )
    );
  });

  it("IR retrieves a recorded PNR", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const recordLocator = getRecordLocator(erLines);
    assert.ok(recordLocator);

    await runCommand(state, "RM TEMP CHANGE");
    const irLines = await runCommand(state, `IR${recordLocator}`);
    assert.ok(irLines.includes("RETRIEVED"));

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes(`REC LOC ${recordLocator}`)));
    assert.ok(rtLines.some((line) => line.includes("DOE/JOHN")));
  });

  it("IR restores the recorded snapshot and drops unrecorded RM changes", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const recordLocator = getRecordLocator(erLines);
    assert.ok(recordLocator);

    await runCommand(state, "RM TEMP CHANGE");
    const rtWithChange = await runCommand(state, "RT");
    assert.ok(rtWithChange.some((line) => line.includes("RM TEMP CHANGE")));

    await runCommand(state, `IR${recordLocator}`);
    const rtAfterIr = await runCommand(state, "RT");
    assert.ok(!rtAfterIr.some((line) => line.includes("RM TEMP CHANGE")));
  });

  it("IG restores the recorded snapshot when PNR was already recorded", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    await runCommand(state, "ER");

    await runCommand(state, "RM TEMP CHANGE");
    const rtWithChange = await runCommand(state, "RT");
    assert.ok(rtWithChange.some((line) => line.includes("RM TEMP CHANGE")));

    await runCommand(state, "IG");
    const rtAfterIg = await runCommand(state, "RT");
    assert.ok(!rtAfterIg.some((line) => line.includes("RM TEMP CHANGE")));
    assert.ok(rtAfterIg.some((line) => line.includes("REC LOC")));
  });

  it("IG returns RT exactly to last recorded view", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    await runCommand(state, "ER");
    const rtAfterEr = await runCommand(state, "RT");

    await runCommand(state, "RM CHANGED AFTER ER");
    await runCommand(state, "IG");
    const rtAfterIg = await runCommand(state, "RT");

    assert.deepEqual(rtAfterIg, rtAfterEr);
  });

  it("IR returns RT exactly to last recorded view", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const recordLocator = getRecordLocator(erLines);
    assert.ok(recordLocator);
    const rtAfterEr = await runCommand(state, "RT");

    await runCommand(state, "RM CHANGED AFTER ER");
    await runCommand(state, `IR${recordLocator}`);
    const rtAfterIr = await runCommand(state, "RT");

    assert.deepEqual(rtAfterIr, rtAfterEr);
  });

  it("IG restores exact recorded state and removes unrecorded OSI", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "RM BASE REMARK");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    await runCommand(state, "ER");
    const rtAfterEr = await runCommand(state, "RT");

    await runCommand(state, "OSI YY TEMP CHANGE");
    const rtWithOsi = await runCommand(state, "RT");
    assert.ok(rtWithOsi.some((line) => line.includes("OSI YY TEMP CHANGE")));

    await runCommand(state, "IG");
    const rtAfterIg = await runCommand(state, "RT");
    assert.ok(!rtAfterIg.some((line) => line.includes("OSI YY TEMP CHANGE")));
    assert.deepEqual(rtAfterIg, rtAfterEr);
  });

  it("IR restores exact recorded state and removes unrecorded OSI", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "RM BASE REMARK");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    await runCommand(state, "ER");
    const rtAfterEr = await runCommand(state, "RT");

    await runCommand(state, "OSI YY TEMP CHANGE");
    const rtWithOsi = await runCommand(state, "RT");
    assert.ok(rtWithOsi.some((line) => line.includes("OSI YY TEMP CHANGE")));

    await runCommand(state, "IR");
    const rtAfterIr = await runCommand(state, "RT");
    assert.ok(!rtAfterIr.some((line) => line.includes("OSI YY TEMP CHANGE")));
    assert.deepEqual(rtAfterIr, rtAfterEr);
  });

  it("XI clears active PNR but keeps recorded PNR in store", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const recordLocator = getRecordLocator(erLines);
    assert.ok(recordLocator);

    const xiLines = await runCommand(state, "XI");
    assert.deepEqual(xiLines, ["OK", "PNR CANCELLED", "NO ACTIVE PNR"]);
    assert.equal(state.activePNR, null);

    const irLines = await runCommand(state, `IR${recordLocator}`);
    assert.ok(irLines.includes("RETRIEVED"));
  });

  it("returns error for unsupported XI element syntax", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "XI1");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "INVALID FORMAT"
      )
    );
  });

  it("returns error for IR when no recorded PNR is available", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "IR");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "NO RECORDED PNR"
      )
    );
  });

  it("ER/RT keeps full PNR content with ordered PNR elements", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "SSR WCHR YY NEED WHEELCHAIR");
    await runCommand(state, "OSI YY VIP CUSTOMER");
    await runCommand(state, "RM VIP REMARK");
    await runCommand(state, "TKTL/26DEC");
    await runCommand(state, "FP CASH");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const recordLocator = getRecordLocator(erLines);
    assert.ok(recordLocator);

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes(`REC LOC ${recordLocator}`)));

    const nmIndex = rtLines.findIndex((line) => line.includes("DOE/JOHN"));
    const segIndex = rtLines.findIndex((line) =>
      /^\s*\d+\s+[A-Z0-9]{2}\s+\d{4}\s+[A-Z]\s+\d{2}[A-Z]{3}\s+[A-Z]{6}\s+\d{4}\s+\d{4}\s+[A-Z]{2}\d$/.test(
        line
      )
    );
    const ssrIndex = rtLines.findIndex((line) =>
      line.includes("SSR WCHR YY NEED WHEELCHAIR")
    );
    const osiIndex = rtLines.findIndex((line) =>
      line.includes("OSI YY VIP CUSTOMER")
    );
    const rmIndex = rtLines.findIndex((line) => line.includes("RM VIP REMARK"));
    const tktlIndex = rtLines.findIndex((line) => line.includes("TKTL/26DEC"));
    const fpIndex = rtLines.findIndex((line) => line.includes("FP CASH"));

    assert.ok(nmIndex > -1);
    assert.ok(segIndex > -1);
    assert.ok(ssrIndex > -1);
    assert.ok(osiIndex > -1);
    assert.ok(rmIndex > -1);
    assert.ok(tktlIndex > -1);
    assert.ok(fpIndex > -1);
    assert.ok(nmIndex < segIndex);
    assert.ok(segIndex < ssrIndex);
    assert.ok(ssrIndex < osiIndex);
    assert.ok(osiIndex < rmIndex);
    assert.ok(rmIndex < tktlIndex);
    assert.ok(tktlIndex < fpIndex);
  });

  it("RT renders FA line when ticket model exists in PNR", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    state.activePNR.tickets.push({
      ticketNumber: "172-0000000001",
      status: "ISSUED",
    });
    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes("FA 172-0000000001 ISSUED")));
  });

  it("RT end-to-end keeps pricing and ticketing blocks in coherent order", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "RFTEST");
    await runCommand(state, "FP CASH");
    await runCommand(state, "FXP");
    await runCommand(state, "FXX");
    const tqt = await runCommand(state, "TQT");
    assert.ok(tqt.some((line) => line.startsWith("TQT1")));
    await runCommand(state, "ET");

    const rtLines = await runCommand(state, "RT");
    const segmentIndex = rtLines.findIndex((line) =>
      /^\s*\d+\s+[A-Z0-9]{2}\s+\d{4}\s+[A-Z]\s+\d{2}[A-Z]{3}\s+[A-Z]{6}\s+\d{4}\s+\d{4}\s+[A-Z]{2}\d$/.test(
        line
      )
    );
    const fpIndex = rtLines.findIndex((line) => line.includes("FP CASH"));
    const faIndex = rtLines.findIndex((line) => line.includes("FA 172-0000000001"));
    const fbIndex = rtLines.findIndex((line) => line.includes("FB TST1 172-0000000001"));
    const tstSummaryIndex = rtLines.findIndex((line) =>
      line.includes("TST 1") && line.includes("STATUS TICKETED")
    );

    assert.ok(segmentIndex > -1);
    assert.ok(fpIndex > -1);
    assert.ok(faIndex > -1);
    assert.ok(fbIndex > -1);
    assert.ok(tstSummaryIndex > -1);
    assert.ok(segmentIndex < fpIndex);
    assert.ok(fpIndex < faIndex);
    assert.ok(faIndex < fbIndex);
    assert.ok(fbIndex < tstSummaryIndex);
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
    await runCommand(state, "SS2Y1");
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
    assert.equal(xeLines[1], "SEGMENT CANCELLED");

    const rtAfter = await runCommand(state, "RT");
    const segments = getRtSegmentLines(rtAfter);
    assert.equal(segments.length, 2);
    const cancelledStatus = getSegmentStatus(segments[0]);
    assert.ok(cancelledStatus === "HX" || cancelledStatus === "XX");
  });

  it("XE1 cancels first segment and keeps second active", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "SS2Y1");

    const xeLines = await runCommand(state, "XE1");
    assert.equal(xeLines[0], "OK");

    const rtAfter = await runCommand(state, "RT");
    const segments = getRtSegmentLines(rtAfter);
    assert.equal(segments.length, 2);
    const firstStatus = getSegmentStatus(segments[0]);
    assert.ok(firstStatus === "HX" || firstStatus === "XX");
    assert.equal(getSegmentStatus(segments[1]), "HK");
  });

  it("XE1-2 marks both segments as cancelled", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "SS2Y1");

    const xeRange = await runCommand(state, "XE1-2");
    assert.equal(xeRange[0], "OK");
    assert.equal(xeRange[1], "ELEMENTS CANCELLED");

    const rtAfter = await runCommand(state, "RT");
    const segments = getRtSegmentLines(rtAfter);
    assert.equal(segments.length, 2);
    for (const segmentLine of segments) {
      const status = getSegmentStatus(segmentLine);
      assert.ok(status === "HX" || status === "XX");
    }
  });

  it("XEALL marks all segments as cancelled", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "SS2Y1");
    await runCommand(state, "NM2DOE/JOHN SMITH/JANE");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const segmentCount = state.activePNR.itinerary.length;

    const xeAll = await runCommand(state, "XEALL");
    assert.equal(xeAll[0], "OK");
    assert.equal(xeAll[1], "ITINERARY CANCELLED");

    const rtLines = await runCommand(state, "RT");
    const remainingSegments = getRtSegmentLines(rtLines);
    assert.equal(remainingSegments.length, segmentCount);
    for (const segmentLine of remainingSegments) {
      const status = getSegmentStatus(segmentLine);
      assert.ok(status === "HX" || status === "XX");
    }
  });

  it("XEALL returns error when no segment exists", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const xeAll = await runCommand(state, "XEALL");
    assert.deepEqual(xeAll, ["NO SEGMENTS"]);
  });

  it("XEALL returns error when all segments are already cancelled", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "SS2Y1");
    await runCommand(state, "NM2DOE/JOHN SMITH/JANE");

    const firstXeAll = await runCommand(state, "XEALL");
    assert.equal(firstXeAll[0], "OK");

    const secondXeAll = await runCommand(state, "XEALL");
    assert.deepEqual(secondXeAll, ["NO SEGMENTS"]);
  });

  it("XE blocks cancellation when segment is linked to TST", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "FXP");

    const xeOne = await runCommand(state, "XE1");
    assert.deepEqual(xeOne, ["NOT ALLOWED - TST SEGMENT"]);

    const rtLines = await runCommand(state, "RT");
    const segments = getRtSegmentLines(rtLines);
    assert.equal(segments.length, 1);
    assert.equal(getSegmentStatus(segments[0]), "HK");
  });

  it("XE blocks deleting the last segment when PNR has a single name", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    const rtLines = await runCommand(state, "RT");
    const segMatch = rtLines
      .map((line) =>
        line.match(
          /^\s*(\d+)\s+[A-Z0-9]{2}\s+\d{4}\s+[A-Z]\s+\d{2}[A-Z]{3}\s+[A-Z]{6}\s+\d{4}\s+\d{4}\s+[A-Z]{2}\d$/
        )
      )
      .find(Boolean);
    assert.ok(segMatch);

    const xeOne = await runCommand(state, `XE${segMatch[1]}`);
    assert.deepEqual(xeOne, ["NOT ALLOWED - LAST SEGMENT"]);
  });
});
