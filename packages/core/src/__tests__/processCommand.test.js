import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitialState, processCommand } from "../index.js";

async function runCommand(state, cmd) {
  const result = await processCommand(state, cmd);
  return result.events.map((event) => event.text);
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

  it("supports FXP/FXL/FXB/FXR with multi-pax TST", async () => {
    const state = createInitialState();

    await runCommand(state, "AN26DECALGPAR");
    await runCommand(state, "SS1Y2");
    await runCommand(state, "NM1DOE/JOHN MR");
    await runCommand(state, "NM1DOE/JIM (CHD/10)");
    await runCommand(state, "AP123456");
    await runCommand(state, "RFTEST");

    const fxp = await processCommand(state, "FXP");
    const fxpLines = fxp.events.map((event) => event.text);
    assert.ok(fxpLines.some((line) => line.includes("TST CREATED")));
    assert.ok(fxpLines.some((line) => line.includes("ADT*1")));
    assert.ok(fxp.state.tsts.length >= 1);

    const rt = await processCommand(state, "RT");
    const rtLines = rt.events.map((event) => event.text);
    assert.ok(rtLines.some((line) => line.includes("TST 1")));

    const fxl = await processCommand(state, "FXL");
    const fxlLines = fxl.events.map((event) => event.text);
    assert.ok(fxlLines.some((line) => line.startsWith("TST 1")));

    const fxl1 = await processCommand(state, "FXL1");
    const fxl1Lines = fxl1.events.map((event) => event.text);
    assert.ok(fxl1Lines.some((line) => line.includes("FARE BASIS")));

    const fxb = await processCommand(state, "FXB");
    const fxbLines = fxb.events.map((event) => event.text);
    assert.ok(fxbLines.includes("TST COMMITTED"));

    const fxr = await processCommand(state, "FXR");
    const fxrLines = fxr.events.map((event) => event.text);
    assert.ok(fxrLines.some((line) => line.startsWith("OLD EUR")));
    assert.ok(fxrLines.some((line) => line.startsWith("NEW EUR")));
    assert.ok(fxrLines.some((line) => line.startsWith("DIFF EUR")));
  });
});
