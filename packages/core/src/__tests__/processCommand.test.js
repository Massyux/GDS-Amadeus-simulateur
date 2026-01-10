import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { createInitialState, processCommand } from "../index.js";
import { InMemoryStore, SeedLoader } from "../../../data/src/index.js";

const fixtureUrl = new URL(
  "../../../data/src/__tests__/fixtures/locations.json",
  import.meta.url
);

async function loadFixture() {
  const data = await readFile(fixtureUrl, "utf-8");
  return JSON.parse(data);
}

async function createApi() {
  const store = new InMemoryStore();
  const loader = new SeedLoader(store);
  loader.loadLocations(await loadFixture());
  return { state: createInitialState(), store };
}

async function runCommand(api, cmd) {
  const result = await processCommand(api, cmd);
  return result.events.map((event) => event.text);
}

describe("processCommand", () => {
  it("returns help output", async () => {
    const api = await createApi();
    const lines = await runCommand(api, "HELP");
    assert.equal(lines[0], "AVAILABLE COMMANDS");
    assert.ok(lines.includes("RT                  DISPLAY PNR (same as live)"));
  });

  it("returns a date for JD", async () => {
    const api = await createApi();
    const [line] = await runCommand(api, "JD");
    assert.match(line, /^[A-Z]{3} [A-Z]{3} \d{1,2} \d{4}$/);
  });

  it("creates a PNR and returns it with RT", async () => {
    const api = await createApi();

    await runCommand(api, "NM1DOE/JOHN MR");
    await runCommand(api, "AP123456");
    await runCommand(api, "RFTEST");

    const endLines = await runCommand(api, "ER");
    const locatorLine = endLines.find((line) => line.startsWith("RECORD LOCATOR "));
    assert.match(locatorLine, /^RECORD LOCATOR [A-Z]{6}$/);

    const rtLines = await runCommand(api, "RT");
    assert.ok(rtLines.some((line) => line.includes("DOE/JOHN")));
    assert.ok(rtLines.some((line) => line.includes("REC LOC")));
  });

  it("returns no availability when selling without AN", async () => {
    const api = await createApi();
    const lines = await runCommand(api, "SS1Y1");
    assert.deepEqual(lines, ["NO AVAILABILITY"]);
  });

  it("returns invalid format for a malformed AN", async () => {
    const api = await createApi();
    const lines = await runCommand(api, "ANXYZ");
    assert.deepEqual(lines, ["INVALID FORMAT"]);
  });

  it("integrates with store for DAC", async () => {
    const api = await createApi();
    const lines = await runCommand(api, "DAC ALG");
    assert.equal(lines[0], "DAC ALG");
    assert.ok(lines.some((line) => line.includes("ALGIERS")));
  });
});
