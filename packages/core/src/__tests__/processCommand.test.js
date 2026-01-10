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
});
