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

function findElementNo(rtLines, substring) {
  const line = rtLines.find((l) => l.includes(substring));
  assert.ok(line, `expected a line containing "${substring}"`);
  const match = line.trim().match(/^(\d+)\s+/);
  return parseInt(match[1], 10);
}

describe("processCommand", () => {
  it("returns help output", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "HELP");
    assert.equal(lines[0], "AVAILABLE COMMANDS");
    assert.ok(lines.includes("RT                  DISPLAY PNR (same as live)"));
  });

  it("HELP index contains core command families", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "HELP");
    assert.ok(lines.some((line) => line.startsWith("AN")));
    assert.ok(lines.some((line) => line.startsWith("SS")));
    assert.ok(lines.some((line) => line.startsWith("NM")));
    assert.ok(lines.some((line) => line.startsWith("ER")));
    assert.ok(lines.some((line) => line.startsWith("RT")));
    assert.ok(lines.some((line) => line.includes("FXP/FXX/FXR/FXB")));
    assert.ok(lines.some((line) => line.includes("TTP")));
  });

  it("HE returns generic help", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "HE");
    assert.ok(lines.length > 0);
    assert.equal(lines[0], "HELP - AVAILABLE COMMANDS");
  });

  it("HE AN returns command specific help", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "HE AN");
    assert.ok(lines.includes("HE AN"));
    assert.ok(lines.some((line) => line.includes("ANddMMMXXXYYY")));
  });

  it("HE unknown command returns HELP NOT FOUND error", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "HE FOOBAR");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "HELP NOT FOUND"
      )
    );
  });

  it("emits error event for an invalid command", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "ZZZ");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
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

  it("accepts names with an apostrophe or a hyphen", async () => {
    const state = createInitialState();
    const nmLines = await runCommand(state, "NM1O'BRIEN/JOHN MR");
    assert.ok(nmLines.some((line) => line.includes("O'BRIEN/JOHN")));

    const state2 = createInitialState();
    const nmLines2 = await runCommand(
      state2,
      "NM1SAINT-JEAN/MARIE-CLAIRE MRS"
    );
    assert.ok(
      nmLines2.some((line) => line.includes("SAINT-JEAN/MARIE-CLAIRE"))
    );

    const state3 = createInitialState();
    const nmLines3 = await runCommand(state3, "NM1MARTIN/JEAN-PIERRE(CHD/8)");
    assert.ok(nmLines3.some((line) => line.includes("MARTIN/JEAN-PIERRE")));
  });

  it("returns error event for invalid NM format", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "NM1DOE");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
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
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
      )
    );
  });

  it("adds APE email and shows it in RT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const apeLines = await runCommand(state, "APE-john.doe@example.com");
    assert.deepEqual(state.activePNR.emails, ["JOHN.DOE@EXAMPLE.COM"]);
    assert.ok(apeLines.some((line) => line.includes("APE JOHN.DOE@EXAMPLE.COM")));

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes("APE JOHN.DOE@EXAMPLE.COM")));
  });

  it("returns error event for invalid APE format", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "APE-not-an-email");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
      )
    );
  });

  it("adds AP contact and shows it in RT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const apLines = await runCommand(state, "AP ALG 123456");
    assert.deepEqual(state.activePNR.contacts, ["AP ALG 123456"]);
    assert.ok(apLines.some((line) => line.includes("AP ALG 123456")));
  });

  it("returns error event when AP is empty", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "AP");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
      )
    );
    assert.deepEqual(state.activePNR.contacts, []);
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
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
      )
    );
  });

  it("adds OP option and shows it in RT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const opLines = await runCommand(state, "OP26DEC/CALL CUSTOMER");
    assert.deepEqual(state.activePNR.options, [
      { date: "26DEC", text: "CALL CUSTOMER" },
    ]);
    assert.ok(opLines.some((line) => line.includes("OP26DEC/CALL CUSTOMER")));

    const rtLines = await runCommand(state, "RT");
    assert.ok(rtLines.some((line) => line.includes("OP26DEC/CALL CUSTOMER")));
  });

  it("returns error event when OP date is invalid", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "OP31FEB/CALL CUSTOMER");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "CHECK DATE"
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
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
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
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
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
        (event) => event.type === "error" && event.text === "CHECK DATE"
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
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
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

  it("returns NOT IN TABLE when selling a line number absent from the last AN", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    const lines = await runCommand(state, "SS99Y1");
    assert.deepEqual(lines, ["NOT IN TABLE"]);
  });

  it("returns CHECK CLASS OF SERVICE when the class code isn't offered on the flight", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    // G is not one of the booking classes generated by buildOfflineAvailability.
    const lines = await runCommand(state, "SS1G1");
    assert.deepEqual(lines, ["CHECK CLASS OF SERVICE"]);
  });

  it("SS decrements available seats so the same class cannot be oversold indefinitely", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    const item = state.lastAN.results.find((r) => r.lineNo === 1);
    const cls = item.bookingClasses.find((c) => c.code === "Y");
    const initialSeats = cls.seats;

    for (let i = 0; i < initialSeats; i++) {
      const lines = await runCommand(state, "SS1Y1");
      assert.equal(lines[0], "OK");
    }
    assert.equal(cls.seats, 0);
    assert.equal(state.activePNR.itinerary.length, initialSeats);

    // Selling once more must fail instead of creating an extra duplicate segment.
    const overLines = await runCommand(state, "SS1Y1");
    assert.deepEqual(overLines, ["NO SEATS"]);
    assert.equal(state.activePNR.itinerary.length, initialSeats);
  });

  it("SS long sell (SS<airline><flight><class><date><from><to><pax>) sells directly without a prior AN", async () => {
    const probeState = createInitialState();
    await runCommand(probeState, "AN26DECALGPAR");
    const item = probeState.lastAN.results[0];
    const cls = item.bookingClasses.find((c) => c.code === "Y");
    assert.ok(cls.seats > 0);

    const state = createInitialState();
    assert.equal(state.lastAN, null);
    const lines = await runCommand(
      state,
      `SS${item.airline}${item.flightNo}Y26DECALGPAR1`
    );
    assert.equal(lines[0], "OK");
    assert.equal(state.activePNR.itinerary.length, 1);
    const seg = state.activePNR.itinerary[0];
    assert.equal(seg.status, "HK");
    assert.equal(seg.airline, item.airline);
    assert.equal(seg.flightNo, item.flightNo);
    assert.equal(seg.classCode, "Y");
    assert.equal(seg.from, "ALG");
    assert.equal(seg.to, "PAR");
    // The implicit lookup behaves like a real AN: addressable afterwards.
    assert.ok(state.lastAN);
    assert.equal(state.lastAN.results.find((r) => r.lineNo === item.lineNo).bookingClasses.find((c) => c.code === "Y").seats, cls.seats - 1);
  });

  it("SS long sell rejects an unknown flight number with NOT IN TABLE", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "SSZZ9999Y26DECALGPAR1");
    assert.deepEqual(lines, ["NOT IN TABLE"]);
  });

  it("SS long sell rejects an unknown city code with NOT IN TABLE", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "SSAF950Y26DECALGZZZ1", {
      deps: { locations: fakeLocationsProvider(["ALG"]) },
    });
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "NOT IN TABLE"
      )
    );
  });

  it("SS long sell rejects an invalid date with CHECK DATE", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "SSAF950Y30FEBALGPAR1");
    assert.deepEqual(lines, ["CHECK DATE"]);
  });

  it("SS long sell rejects malformed input with CHECK FORMAT", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "SSAF950Y26DECALG1");
    assert.deepEqual(lines, ["CHECK FORMAT"]);
  });

  it("SS long sell rejects a class not offered on the flight", async () => {
    const probeState = createInitialState();
    await runCommand(probeState, "AN26DECALGPAR");
    const item = probeState.lastAN.results[0];

    const state = createInitialState();
    const lines = await runCommand(
      state,
      `SS${item.airline}${item.flightNo}G26DECALGPAR1`
    );
    assert.deepEqual(lines, ["CHECK CLASS OF SERVICE"]);
  });

  it("SS long sell shares depleted inventory with a later numeric SS on the same implicit AN", async () => {
    const probeState = createInitialState();
    await runCommand(probeState, "AN26DECALGPAR");
    const item = probeState.lastAN.results[0];
    const initialSeats = item.bookingClasses.find((c) => c.code === "Y").seats;

    const state = createInitialState();
    await runCommand(state, `SS${item.airline}${item.flightNo}Y26DECALGPAR1`);
    const numericLines = await runCommand(state, `SS${item.lineNo}Y${initialSeats}`);
    // Only initialSeats - 1 remained after the long sell -- requesting all
    // of the original inventory again must fail, not oversell.
    assert.deepEqual(numericLines, ["NOT ENOUGH SEATS"]);
  });

  it("IG on a never-recorded PNR restores inventory sold via a long sell (same family as numeric SS)", async () => {
    const probeState = createInitialState();
    await runCommand(probeState, "AN26DECALGPAR");
    const item = probeState.lastAN.results[0];
    const initialSeats = item.bookingClasses.find((c) => c.code === "Y").seats;

    const state = createInitialState();
    await runCommand(state, `SS${item.airline}${item.flightNo}Y26DECALGPAR1`);
    const cls = state.lastAN.results
      .find((r) => r.lineNo === item.lineNo)
      .bookingClasses.find((c) => c.code === "Y");
    assert.equal(cls.seats, initialSeats - 1);

    await runCommand(state, "IG");
    assert.equal(cls.seats, initialSeats);
  });

  it("SB rebooks a segment's class (SB<class><segment>), releasing the old seat and selling the new one", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    const item = state.lastAN.results.find((r) => r.lineNo === 1);
    const ySeats = item.bookingClasses.find((c) => c.code === "Y").seats;
    const mSeats = item.bookingClasses.find((c) => c.code === "M").seats;

    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    const rtBefore = await runCommand(state, "RT");
    const segLine = getRtSegmentLines(rtBefore)[0];
    const segNo = parseInt(segLine.trim().split(/\s+/)[0], 10);

    const sbLines = await runCommand(state, `SBM${segNo}`);
    assert.equal(sbLines[0], "OK");

    const cls = state.lastAN.results.find((r) => r.lineNo === 1).bookingClasses;
    assert.equal(cls.find((c) => c.code === "Y").seats, ySeats);
    assert.equal(cls.find((c) => c.code === "M").seats, mSeats - 1);

    assert.equal(state.activePNR.itinerary.length, 2);
    assert.equal(state.activePNR.itinerary[0].status, "HX");
    assert.equal(state.activePNR.itinerary[1].status, "HK");
    assert.equal(state.activePNR.itinerary[1].classCode, "M");
  });

  it("SB rebooks a segment's date (SB<date><segment>)", async () => {
    // The offline generator re-randomizes flight numbers per date, so a
    // real cross-date same-flight rebook isn't guaranteed to exist there.
    // A custom provider that echoes back whichever date is queried lets
    // this test verify the rebook mechanics deterministically instead.
    const fakeDeps = {
      deps: {
        availability: {
          searchAvailability: async ({ ddmmm }) => [
            {
              lineNo: 1,
              airline: "ZZ",
              flightNo: 9999,
              from: "ALG",
              to: "PAR",
              dateDDMMM: ddmmm,
              dow: "TH",
              depTime: "1010",
              arrTime: "1210",
              bookingClasses: [{ code: "Y", seats: 9 }],
            },
          ],
        },
      },
    };

    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR", fakeDeps);
    await processCommand(state, "SS1Y1", fakeDeps);
    await processCommand(state, "NM1DOE/JOHN MR", fakeDeps);
    const rt = await processCommand(state, "RT", fakeDeps);
    const rtLines = rt.events.map((event) => event.text);
    const segNo = parseInt(
      getRtSegmentLines(rtLines)[0].trim().split(/\s+/)[0],
      10
    );

    const sbResult = await processCommand(state, `SB27DEC${segNo}`, fakeDeps);
    const sbLines = sbResult.events.map((event) => event.text);
    assert.equal(sbLines[0], "OK");
    assert.equal(state.activePNR.itinerary[1].dateDDMMM, "27DEC");
    assert.equal(state.activePNR.itinerary[1].classCode, "Y");
    assert.equal(state.activePNR.itinerary[1].airline, "ZZ");
    assert.equal(state.activePNR.itinerary[0].status, "HX");
    assert.equal(state.activePNR.itinerary[1].status, "HK");
  });

  it("SB rebooks a segment's flight (SB<airline><flight>*<segment>)", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    const original = state.lastAN.results.find((r) => r.lineNo === 1);
    const another = state.lastAN.results.find(
      (r) => r.lineNo !== 1 && r.airline !== original.airline
    );
    assert.ok(another);

    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    const rtBefore = await runCommand(state, "RT");
    const segNo = parseInt(
      getRtSegmentLines(rtBefore)[0].trim().split(/\s+/)[0],
      10
    );

    const sbLines = await runCommand(
      state,
      `SB${another.airline}${another.flightNo}*${segNo}`
    );
    assert.equal(sbLines[0], "OK");
    assert.equal(state.activePNR.itinerary[1].airline, another.airline);
    assert.equal(state.activePNR.itinerary[1].flightNo, another.flightNo);
    assert.equal(state.activePNR.itinerary[1].classCode, "Y");
  });

  it("SB rejects malformed input with CHECK FORMAT", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    const lines = await runCommand(state, "SBXYZ");
    assert.deepEqual(lines, ["CHECK FORMAT"]);
  });

  it("SB returns NO ACTIVE PNR without a PNR", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "SBY1");
    assert.deepEqual(lines, ["NO ACTIVE PNR"]);
  });

  it("SB returns ELEMENT NOT FOUND for an out-of-range or non-segment element", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");

    const outOfRange = await runCommand(state, "SBY99");
    assert.deepEqual(outOfRange, ["ELEMENT NOT FOUND"]);

    // Element 1 is the passenger name, not a segment.
    const wrongKind = await runCommand(state, "SBY1");
    assert.deepEqual(wrongKind, ["ELEMENT NOT FOUND"]);
  });

  it("SB blocks rebooking a segment locked by a TST", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "FXP");

    const rt = await runCommand(state, "RT");
    const segNo = parseInt(getRtSegmentLines(rt)[0].trim().split(/\s+/)[0], 10);

    const sbLines = await runCommand(state, `SBM${segNo}`);
    assert.deepEqual(sbLines, ["NOT ALLOWED - TST SEGMENT"]);
  });

  it("<n>/<text> modifies an RM remark in place", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "RM OLD REMARK");
    const rt = await runCommand(state, "RT");
    const n = findElementNo(rt, "RM OLD REMARK");

    const lines = await runCommand(state, `${n}/NEW REMARK`);
    assert.equal(lines[0], "OK");
    assert.ok(lines.some((l) => l.includes("RM NEW REMARK")));
    assert.ok(!lines.some((l) => l.includes("OLD REMARK")));
  });

  it("<n>/<text> modifies an OSI element in place", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "OSI YY OLD TEXT");
    const rt = await runCommand(state, "RT");
    const n = findElementNo(rt, "OSI YY OLD TEXT");

    const lines = await runCommand(state, `${n}/YY NEW TEXT`);
    assert.equal(lines[0], "OK");
    assert.ok(lines.some((l) => l.includes("OSI YY NEW TEXT")));
  });

  it("<n>/<text> modifies an SSR element in place", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "SSR WCHR YY NEED WHEELCHAIR");
    const rt = await runCommand(state, "RT");
    const n = findElementNo(rt, "SSR WCHR YY NEED WHEELCHAIR");

    const lines = await runCommand(state, `${n}/WCHR YY NO LONGER NEEDED`);
    assert.equal(lines[0], "OK");
    assert.ok(lines.some((l) => l.includes("SSR WCHR YY NO LONGER NEEDED")));
  });

  it("<n>/<ddMMM> modifies an OP element's date, keeping its text", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "OP26DEC/CALL CLIENT");
    const rt = await runCommand(state, "RT");
    const n = findElementNo(rt, "CALL CLIENT");

    const lines = await runCommand(state, `${n}/12JUL`);
    assert.equal(lines[0], "OK");
    assert.ok(lines.some((l) => l.includes("OP12JUL/CALL CLIENT")));
  });

  it("<n>/<text> modifies an OP element's text, keeping its date", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "OP26DEC/CALL CLIENT");
    const rt = await runCommand(state, "RT");
    const n = findElementNo(rt, "CALL CLIENT");

    const lines = await runCommand(state, `${n}/EMAIL CLIENT INSTEAD`);
    assert.equal(lines[0], "OK");
    assert.ok(lines.some((l) => l.includes("OP26DEC/EMAIL CLIENT INSTEAD")));
  });

  it("<n>/<ddMMM> modifies a TKTL date", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "TKTL/26DEC");
    const rt = await runCommand(state, "RT");
    const n = findElementNo(rt, "TKTL/26DEC");

    const lines = await runCommand(state, `${n}/27DEC`);
    assert.equal(lines[0], "OK");
    assert.ok(lines.some((l) => l.includes("TKTL/27DEC")));
  });

  it("<n>/<ddMMM> returns CHECK DATE for an invalid TKTL date", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "TKTL/26DEC");
    const rt = await runCommand(state, "RT");
    const n = findElementNo(rt, "TKTL/26DEC");

    const lines = await runCommand(state, `${n}/30FEB`);
    assert.deepEqual(lines, ["CHECK DATE"]);
  });

  it("<n>/<text> returns ELEMENT NOT FOUND for an out-of-range number", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const lines = await runCommand(state, "99/NEW TEXT");
    assert.deepEqual(lines, ["ELEMENT NOT FOUND"]);
  });

  it("<n>/<text> returns NOT ALLOWED for an element kind that isn't plain text/date (PAX)", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const rt = await runCommand(state, "RT");
    const n = findElementNo(rt, "DOE/JOHN");

    const lines = await runCommand(state, `${n}/SMITH/JANE`);
    assert.deepEqual(lines, ["NOT ALLOWED"]);
  });

  it("<n>/<text> returns NOT ALLOWED for a segment element (use SB instead)", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    const rt = await runCommand(state, "RT");
    const segNo = parseInt(getRtSegmentLines(rt)[0].trim().split(/\s+/)[0], 10);

    const lines = await runCommand(state, `${segNo}/M`);
    assert.deepEqual(lines, ["NOT ALLOWED"]);
  });

  it("<n>/<text> returns NO ACTIVE PNR without a PNR", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "1/TEXT");
    assert.deepEqual(lines, ["NO ACTIVE PNR"]);
  });

  it("<n>/ with an empty value returns CHECK FORMAT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const lines = await runCommand(state, "1/");
    assert.deepEqual(lines, ["CHECK FORMAT"]);
  });

  it("NU corrects a passenger's name (NU<pos>/<pos><LAST>/<FIRST> TITLE)", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");

    const lines = await runCommand(state, "NU1/1SMITH/JANE MRS");
    assert.equal(lines[0], "OK");
    assert.equal(state.activePNR.passengers[0].lastName, "SMITH");
    assert.equal(state.activePNR.passengers[0].firstName, "JANE");
    assert.equal(state.activePNR.passengers[0].title, "MRS");
    assert.ok(lines.some((l) => l.includes("SMITH/JANE MRS")));
    assert.ok(!lines.some((l) => l.includes("DOE/JOHN")));
  });

  it("NU rejects mismatched position numbers with CHECK FORMAT", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const lines = await runCommand(state, "NU1/2SMITH/JANE MRS");
    assert.deepEqual(lines, ["CHECK FORMAT"]);
  });

  it("NU returns ELEMENT NOT FOUND for a passenger position that doesn't exist", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    const lines = await runCommand(state, "NU2/2SMITH/JANE MRS");
    assert.deepEqual(lines, ["ELEMENT NOT FOUND"]);
  });

  it("NU returns NO ACTIVE PNR without a PNR", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "NU1/1SMITH/JANE MRS");
    assert.deepEqual(lines, ["NO ACTIVE PNR"]);
  });

  it("NU is blocked once a ticket has been issued on the PNR", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "FP CASH");
    await runCommand(state, "FXP");
    await runCommand(state, "ET");

    const lines = await runCommand(state, "NU1/1SMITH/JANE MRS");
    assert.deepEqual(lines, ["NOT ALLOWED"]);
    assert.equal(state.activePNR.passengers[0].lastName, "DOE");
  });

  it("TN returns timetable lines and keeps results sellable", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "TN26DECALGPAR");
    assert.ok(lines.some((line) => line.startsWith("TN26DECALGPAR")));
    assert.ok(lines.some((line) => /^\d+\s+[A-Z0-9]{2}\s+\d{4}/.test(line)));

    const ss = await runCommand(state, "SS1Y1");
    assert.equal(ss[0], "OK");
  });

  it("TN rejects invalid date with error event", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "TN31FEBALGPAR");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "CHECK DATE"
      )
    );
  });

  it("SN returns schedule lines", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "SN26DECALGPAR");
    assert.ok(lines.some((line) => line.startsWith("SN26DECALGPAR")));
    assert.ok(lines.some((line) => line.includes("AMADEUS SCHEDULE - SN")));
  });

  it("SN rejects invalid format with error event", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "SNBADINPUT");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
      )
    );
  });

  it("TN shows pagination when results exceed one page", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "TN26DECALGPAR");
    assert.ok(lines.some((line) => line.startsWith("PAGE 1/")));
    assert.ok(lines.some((line) => line.startsWith("PAGE 2/")));
  });

  it("returns invalid format for a malformed AN", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "ANXYZ");
    assert.deepEqual(lines, ["CHECK FORMAT"]);
  });

  it("rejects AN with invalid date rollover", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "AN31FEBALGPAR");
    assert.deepEqual(lines, ["CHECK DATE"]);
  });

  it("rejects AN alternate format with invalid date rollover", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "ANALGPAR/31FEB");
    assert.deepEqual(lines, ["CHECK DATE"]);
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
    assert.ok(!lines.includes("CHECK DATE"));
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

  function fakeLocationsProvider(knownCodes) {
    return {
      findByIata: async (code) =>
        knownCodes.includes(String(code).toUpperCase())
          ? { iata: String(code).toUpperCase() }
          : null,
    };
  }

  it("AN/TN/SN skip city validation when no locations provider is configured", async () => {
    const state = createInitialState();
    const an = await processCommand(state, "AN26DECZZZXXX");
    assert.ok(an.events.some((event) => event.type === "print"));
  });

  for (const cmd of ["AN26DECALGXXX", "TN26DECALGXXX", "SN26DECALGXXX"]) {
    it(`${cmd} returns NOT IN TABLE for an unknown city code when locations is configured`, async () => {
      const state = createInitialState();
      const result = await processCommand(state, cmd, {
        deps: { locations: fakeLocationsProvider(["ALG"]) },
      });
      assert.deepEqual(
        result.events.map((event) => event.text),
        ["NOT IN TABLE"]
      );
    });
  }

  for (const cmd of ["an26decalgpar", "AN26DECALGPAR"]) {
    it(`${cmd} succeeds (case-insensitive) when both city codes are known`, async () => {
      const state = createInitialState();
      const result = await processCommand(state, cmd, {
        deps: { locations: fakeLocationsProvider(["ALG", "PAR"]) },
      });
      assert.ok(
        result.events.some(
          (event) => event.type === "print" && event.text.startsWith("AN")
        )
      );
      assert.ok(!result.events.some((event) => event.type === "error"));
    });
  }

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

  it("FXX stores existing TST as STORED", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FXP");
    const fxx = await processCommand(state, "FXX");
    const fxxLines = fxx.events.map((event) => event.text);
    assert.ok(fxxLines.some((line) => line.includes("TST STORED")));
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
    await processCommand(state, "FXP");

    const fxx = await processCommand(state, "FXX");
    const fxxLines = fxx.events.map((event) => event.text);
    assert.ok(fxxLines.some((line) => line.includes("TST STORED")));
    assert.equal(state.tsts.length, 1);
    assert.equal(state.tsts[0].status, "STORED");
  });

  it("FXX without TST returns NO TST", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    await processCommand(state, "NM1DOE/JOHN MR");
    const fxx = await processCommand(state, "FXX");
    assert.ok(
      fxx.events.some((event) => event.type === "error" && event.text === "NO TST")
    );
  });

  it("FXR reprices and keeps TST linked to segments without rebook", async () => {
    // Unlike FXP/FXB, FXR does not require a name in the PNR.
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
    await processCommand(stateFxP, "NM1DOE/JOHN MR");
    const fxp = await processCommand(stateFxP, "FXP");
    const fxpLines = fxp.events.map((event) => event.text);
    const fxpTotal = getMoney(fxpLines, "TOTAL");
    const fxrTotal = getMoney(fxrLines, "NEW TOTAL");
    assert.ok(fxpTotal !== null && fxrTotal !== null);
    assert.ok(fxrTotal > 0);
  });

  it("FXR does not mutate itinerary fields", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "SS2Y1");
    await processCommand(state, "NM2DOE/JOHN SMITH/JANE");
    await processCommand(state, "XE1");
    const before = JSON.parse(JSON.stringify(state.activePNR.itinerary));

    await processCommand(state, "FXR");
    const after = state.activePNR.itinerary;
    assert.deepEqual(after, before);
    assert.equal(state.tsts.length, 1);
    assert.equal(state.tsts[0].status, "REPRICED");
  });

  it("FXB creates final TST without rebooking classes", async () => {
    const baseState = createInitialState();
    await processCommand(baseState, "AN26DECALGPAR");
    await processCommand(baseState, "SS1Y2");
    await processCommand(baseState, "NM1DOE/JOHN MR");
    const fxp = await processCommand(baseState, "FXP");
    const fxpLines = fxp.events.map((event) => event.text);
    const fxpTotal = getMoney(fxpLines, "TOTAL");

    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y2");
    await processCommand(state, "NM1DOE/JOHN MR");
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

  it("ET rejects duplicate issue on the same TST", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FP CASH");
    await processCommand(state, "FXP");
    await processCommand(state, "ET");

    const secondEt = await processCommand(state, "ET");
    assert.ok(
      secondEt.events.some(
        (event) =>
          event.type === "error" && event.text === "TICKET ALREADY ISSUED"
      )
    );
    assert.equal(state.activePNR.tickets.length, 1);
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

  it("TWX marks ticket as void and RT reflects it", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FP CASH");
    await processCommand(state, "FXP");
    await processCommand(state, "ET");

    const twxResult = await processCommand(state, "TWX");
    const twxLines = twxResult.events.map((event) => event.text);
    assert.ok(twxLines.some((line) => line.includes("TICKET VOIDED")));
    assert.equal(state.activePNR.tickets[0].status, "VOID");
    assert.equal(state.tsts[0].status, "VOID");

    const rt = await processCommand(state, "RT");
    const rtLines = rt.events.map((event) => event.text);
    assert.ok(rtLines.some((line) => line.includes("FA 172-0000000001 VOID")));
    assert.ok(
      rtLines.some(
        (line) => line.includes("TST 1") && line.includes("STATUS VOID")
      )
    );
  });

  it("TWX without ticket returns NO TICKET", async () => {
    const state = createInitialState();
    const twxResult = await processCommand(state, "TWX");
    assert.ok(
      twxResult.events.some(
        (event) => event.type === "error" && event.text === "NO TICKET"
      )
    );
  });

  it("TWX rejects re-voiding an already-void ticket referenced by its number", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FP CASH");
    await processCommand(state, "FXP");
    await processCommand(state, "ET");
    await processCommand(state, "TWX");
    const ticketNumber = state.activePNR.tickets[0].ticketNumber;

    const secondTwx = await processCommand(state, `TWX ${ticketNumber}`);
    assert.ok(
      secondTwx.events.some(
        (event) => event.type === "error" && event.text === "NOTHING TO CANCEL"
      )
    );
    assert.equal(state.activePNR.tickets[0].status, "VOID");
  });

  it("TWD displays the ticket without voiding it", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FP CASH");
    await processCommand(state, "FXP");
    await processCommand(state, "ET");

    const twdResult = await processCommand(state, "TWD");
    const twdLines = twdResult.events.map((event) => event.text);
    assert.ok(twdLines.some((line) => line.includes("FA 172-0000000001 ISSUED")));
    assert.equal(state.activePNR.tickets[0].status, "ISSUED");

    const twxResult = await processCommand(state, "TWX");
    assert.ok(
      twxResult.events.some((event) => event.text.includes("TICKET VOIDED"))
    );
  });

  it("TWD without ticket returns NO TICKET", async () => {
    const state = createInitialState();
    const twdResult = await processCommand(state, "TWD");
    assert.ok(
      twdResult.events.some(
        (event) => event.type === "error" && event.text === "NO TICKET"
      )
    );
  });

  it("ITR-EML sends itinerary receipt and adds receipt element in RT", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FP CASH");
    await processCommand(state, "FXP");
    await processCommand(state, "FXX");
    await processCommand(state, "ET");
    await processCommand(state, "APE-john.doe@example.com");

    const itr = await processCommand(state, "ITR-EML");
    const itrLines = itr.events.map((event) => event.text);
    assert.ok(itrLines.includes("ITINERARY RECEIPT SENT"));
    assert.equal(state.activePNR.receipts.length, 1);
    assert.equal(state.activePNR.receipts[0].type, "ITR-EML");

    const rt = await processCommand(state, "RT");
    const rtLines = rt.events.map((event) => event.text);
    assert.ok(rtLines.some((line) => line.includes("ITR-EML JOHN.DOE@EXAMPLE.COM")));
  });

  it("ITR-EML without ticket returns NO TICKET", async () => {
    const state = createInitialState();
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "APE-john.doe@example.com");
    const itr = await processCommand(state, "ITR-EML");
    assert.ok(
      itr.events.some((event) => event.type === "error" && event.text === "NO TICKET")
    );
  });

  it("ITR-EML without email returns NO EMAIL ADDRESS", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    await processCommand(state, "FP CASH");
    await processCommand(state, "FXP");
    await processCommand(state, "ET");
    const itr = await processCommand(state, "ITR-EML");
    assert.ok(
      itr.events.some(
        (event) => event.type === "error" && event.text === "NO EMAIL ADDRESS"
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

  it("FXP ignores cancelled segments and prices only active ones", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "SS2Y1");
    await processCommand(state, "NM1DOE/JOHN MR");
    // Element order is PAX first, then SEG: with a passenger now present,
    // element 2 is the first segment (element 1 is the passenger).
    await processCommand(state, "XE2");
    const fxp = await processCommand(state, "FXP");
    const fxpLines = fxp.events.map((event) => event.text);
    assert.ok(fxpLines.some((line) => line.startsWith("FXP")));
    assert.equal(state.tsts.length, 1);
    assert.deepEqual(state.tsts[0].segments, [2]);
  });

  it("FXP returns NO ITINERARY when the only segment is cancelled with XE1", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    await processCommand(state, "NM2DOE/JOHN SMITH/JANE");
    const rtBeforeXe = await processCommand(state, "RT");
    const rtLines = rtBeforeXe.events.map((event) => event.text);
    const segmentElement = rtLines
      .map((line) =>
        line.match(
          /^\s*(\d+)\s+[A-Z0-9]{2}\s+\d{4}\s+[A-Z]\s+\d{2}[A-Z]{3}\s+[A-Z]{6}\s+\d{4}\s+\d{4}\s+[A-Z]{2}\d$/
        )
      )
      .find(Boolean);
    assert.ok(segmentElement);
    await processCommand(state, `XE${segmentElement[1]}`);
    const fxp = await processCommand(state, "FXP");
    assert.ok(
      fxp.events.some(
        (event) => event.type === "error" && event.text === "NO ITINERARY"
      )
    );
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

  for (const cmd of ["FXP", "FXB"]) {
    it(`${cmd} returns NO NAME when the PNR has an itinerary but no NM`, async () => {
      const state = createInitialState();
      await processCommand(state, "AN26DECALGPAR");
      await processCommand(state, "SS1Y1");
      const result = await processCommand(state, cmd);
      assert.deepEqual(
        result.events.map((event) => event.text),
        ["NO NAME"]
      );
      assert.equal(state.tsts.length, 0);
    });
  }

  it("FXR does not require a name in the PNR (confirmed by Massy, unlike FXP/FXB)", async () => {
    const state = createInitialState();
    await processCommand(state, "AN26DECALGPAR");
    await processCommand(state, "SS1Y1");
    const result = await processCommand(state, "FXR");
    assert.ok(
      result.events.some(
        (event) => event.type === "print" && event.text === "FXR"
      )
    );
    assert.equal(state.tsts.length, 1);
  });

  it("clears an in-memory PNR on IG when it was never recorded (ER)", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");

    // Matches the existing XI convention (see "XI clears active PNR..."
    // below): clearing activePNR makes the trailing renderPNRLiveView
    // report NO ACTIVE PNR, same as XI already does.
    const igLines = await runCommand(state, "IG");
    assert.deepEqual(igLines, ["IGNORED", "NO ACTIVE PNR"]);
    assert.equal(state.activePNR, null);
  });

  it("returns error for IG when there is no PNR at all", async () => {
    const state = createInitialState();
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

  it("IG on a never-recorded PNR does not resurrect an unrelated earlier recorded PNR (stale locator bug reported by Massy)", async () => {
    const state = createInitialState();
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const firstLocator = getRecordLocator(erLines);
    assert.ok(firstLocator);

    // Fully exit the first PNR's working context (it stays recorded in the
    // store, see "XI clears active PNR but keeps recorded PNR in store").
    await runCommand(state, "XI");

    // Start a brand new PNR that is never recorded (no ER).
    await runCommand(state, "NM1SMITH/ANNA MR");
    await runCommand(state, "AP654321");
    await runCommand(state, "RFTEST2");

    const igLines = await runCommand(state, "IG");
    // Must discard the new, never-recorded PNR entirely -- not resurrect the
    // unrelated first PNR via a stale "last recorded locator" pointer.
    assert.ok(!igLines.some((line) => line.includes("SMITH")));
    assert.ok(!igLines.some((line) => line.includes(firstLocator)));
    assert.equal(state.activePNR, null);

    const rtLines = await runCommand(state, "RT");
    assert.deepEqual(rtLines, ["NO ACTIVE PNR"]);
  });

  it("IG on a never-recorded PNR restores the seat inventory sold via SS (zero phantom state)", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    const item = state.lastAN.results.find((r) => r.lineNo === 1);
    const cls = item.bookingClasses.find((c) => c.code === "Y");
    const initialSeats = cls.seats;

    await runCommand(state, "SS1Y1");
    assert.equal(cls.seats, initialSeats - 1);

    await runCommand(state, "IG");
    assert.equal(cls.seats, initialSeats);
    assert.equal(state.activePNR, null);
  });

  it("IG on an already-recorded PNR releases inventory only for segments added after ER (the recorded segment stays sold)", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    const item = state.lastAN.results.find((r) => r.lineNo === 1);
    const cls = item.bookingClasses.find((c) => c.code === "Y");
    const initialSeats = cls.seats;

    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    await runCommand(state, "ER");
    assert.equal(cls.seats, initialSeats - 1);

    // Sell a second seat on the same class after the PNR is already recorded.
    await runCommand(state, "SS1Y1");
    assert.equal(cls.seats, initialSeats - 2);

    await runCommand(state, "IG");
    // The recorded segment (sold before ER) stays sold; only the unrecorded
    // second sale is released.
    assert.equal(cls.seats, initialSeats - 1);
    assert.equal(state.activePNR.itinerary.length, 1);
  });

  it("XI releases the seat inventory of a never-recorded PNR's itinerary", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    const item = state.lastAN.results.find((r) => r.lineNo === 1);
    const cls = item.bookingClasses.find((c) => c.code === "Y");
    const initialSeats = cls.seats;

    await runCommand(state, "SS1Y1");
    assert.equal(cls.seats, initialSeats - 1);

    await runCommand(state, "XI");
    assert.equal(cls.seats, initialSeats);
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
        (event) => event.type === "error" && event.text === "CHECK FORMAT"
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

  it("QP places recorded locator into queue", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const locator = getRecordLocator(erLines);
    assert.ok(locator);

    const qpLines = await runCommand(state, "QP/12C1");
    assert.ok(qpLines.includes("PLACED IN QUEUE 12C1"));
    assert.deepEqual(state.queueStore["12C1"], [locator]);
  });

  it("QP without recorded PNR returns NO RECORDED PNR", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "QP/12C1");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "NO RECORDED PNR"
      )
    );
  });

  it("QD displays queue content with locator", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const locator = getRecordLocator(erLines);
    assert.ok(locator);
    await runCommand(state, "QP/12C1");

    const qdLines = await runCommand(state, "QD/12C1");
    assert.ok(qdLines.includes("QUEUE 12C1"));
    assert.ok(qdLines.some((line) => line.includes(locator)));
  });

  it("QD on unknown queue returns QUEUE NOT FOUND", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "QD/99C9");
    assert.ok(
      result.events.some(
        (event) => event.type === "error" && event.text === "QUEUE NOT FOUND"
      )
    );
  });

  it("QE opens queue context and sets activeQueue", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    await runCommand(state, "ER");
    await runCommand(state, "QP/12C1");

    const qeLines = await runCommand(state, "QE/12C1");
    assert.ok(qeLines.includes("QUEUE 12C1 OPEN"));
    assert.equal(state.activeQueue, "12C1");
    assert.equal(state.currentQueueItem, null);
  });

  it("QN loads next PNR from active queue", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const locator = getRecordLocator(erLines);
    assert.ok(locator);
    await runCommand(state, "QP/12C1");
    await runCommand(state, "QE/12C1");

    const qnLines = await runCommand(state, "QN");
    assert.ok(qnLines.includes(`PNR FROM QUEUE 12C1 ${locator}`));
    assert.equal(state.currentQueueItem, locator);
    assert.equal(state.activePNR.recordLocator, locator);
  });

  it("QR removes current queue item from queue", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    const erLines = await runCommand(state, "ER");
    const locator = getRecordLocator(erLines);
    assert.ok(locator);
    await runCommand(state, "QP/12C1");
    await runCommand(state, "QE/12C1");
    await runCommand(state, "QN");

    const qrLines = await runCommand(state, "QR");
    assert.ok(qrLines.includes(`REMOVED FROM QUEUE 12C1 ${locator}`));
    assert.equal(state.currentQueueItem, null);

    const qdLines = await runCommand(state, "QD/12C1");
    assert.ok(qdLines.includes("QUEUE EMPTY"));
    assert.ok(!qdLines.some((line) => line.includes(locator)));
  });

  it("QS closes queue context", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    await runCommand(state, "ER");
    await runCommand(state, "QP/12C1");
    await runCommand(state, "QE/12C1");

    const qsLines = await runCommand(state, "QS");
    assert.ok(qsLines.includes("QUEUE CLOSED"));
    assert.equal(state.activeQueue, null);
    assert.equal(state.currentQueueItem, null);
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
    assert.deepEqual(xeMissing, ["CHECK FORMAT"]);
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

  it("XE cancels AP line correctly when FA/FB ticket lines exist", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");
    await runCommand(state, "FP CASH");
    await runCommand(state, "FXP");
    await runCommand(state, "ET");

    const rtBefore = await runCommand(state, "RT");
    const apLine = rtBefore.find((line) => line.includes("AP123456"));
    assert.ok(apLine);
    const apElementNo = apLine.match(/^\s*(\d+)/);
    assert.ok(apElementNo);

    const xeAp = await runCommand(state, `XE${apElementNo[1]}`);
    assert.equal(xeAp[0], "OK");
    assert.equal(xeAp[1], "ELEMENT CANCELLED");
    assert.equal(state.activePNR.contacts.length, 0);
    assert.equal(state.activePNR.rf, "TEST");

    const rtAfter = await runCommand(state, "RT");
    assert.ok(!rtAfter.some((line) => line.includes("AP123456")));
    assert.ok(rtAfter.some((line) => line.includes("RF TEST")));
  });

  it("XE returns NOT ALLOWED when targeting FA/FB ticket lines", async () => {
    const state = createInitialState();
    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y1");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "FP CASH");
    await runCommand(state, "FXP");
    await runCommand(state, "ET");

    const rtBefore = await runCommand(state, "RT");
    const faLine = rtBefore.find((line) => line.includes("FA 172-0000000001"));
    assert.ok(faLine);
    const faElementNo = faLine.match(/^\s*(\d+)/);
    assert.ok(faElementNo);

    const xeFa = await runCommand(state, `XE${faElementNo[1]}`);
    assert.deepEqual(xeFa, ["NOT ALLOWED"]);
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
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "FXP");

    // Element 1 is the passenger, element 2 is the segment.
    const xeOne = await runCommand(state, "XE2");
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
