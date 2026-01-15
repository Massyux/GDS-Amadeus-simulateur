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

describe("processCommand", () => {
  it("returns help output", async () => {
    const state = createInitialState();
    const lines = await runCommand(state, "HELP");
    assert.equal(lines[0], "AVAILABLE COMMANDS");
    assert.ok(lines.includes("RT                  DISPLAY PNR (same as live)"));
  });

  it("returns a date for JD", async () => {
    const state = createInitialState();
    const [line] = await runCommand(state, "JD");
    assert.match(line, /^[A-Z]{3} [A-Z]{3} \d{1,2} \d{4}$/);
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

  it("returns sorted offline AN availability", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "AN26DECALGPAR", {});
    const results = result.state.lastAN?.results || [];
    assert.ok(results.length >= 8);
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i - 1].depTime <= results[i].depTime);
    }
  });

  it("filters AN availability by airline", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "AN26DECALGPAR/AF", {});
    const lines = result.events.map((event) => event.text);
    const rows = lines.filter((line) => /^\s*\d{1,2}\s+[A-Z0-9]{2}\s+\d{3,4}\b/.test(line));
    if (rows.length === 0) {
      assert.ok(lines.includes("NO FLIGHTS"));
      return;
    }
    rows.forEach((line) => {
      const match = line.match(/^\s*\d{1,2}\s+([A-Z0-9]{2})\s+/);
      assert.equal(match[1], "AF");
    });
  });

  it("prints NO FLIGHTS when filter yields no results", async () => {
    const state = createInitialState();
    const result = await processCommand(state, "AN26DECALGPAR/ZZ", {});
    const lines = result.events.map((event) => event.text);
    assert.ok(lines.includes("NO FLIGHTS"));
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
});
