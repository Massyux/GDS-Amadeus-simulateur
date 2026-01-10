import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { InMemoryStore, SeedLoader } from "../index.js";

const fixtureUrl = new URL("./fixtures/locations.json", import.meta.url);

async function loadFixture() {
  const data = await readFile(fixtureUrl, "utf-8");
  return JSON.parse(data);
}

describe("InMemoryStore", () => {
  it("decodes a known IATA", async () => {
    const store = new InMemoryStore();
    const loader = new SeedLoader(store);
    loader.loadLocations(await loadFixture());

    const lines = store.decodeIata("ALG");
    assert.equal(lines[0], "DAC ALG");
    assert.ok(lines.some((line) => line.includes("ALGIERS")));
  });

  it("encodes a city search", async () => {
    const store = new InMemoryStore();
    const loader = new SeedLoader(store);
    loader.loadLocations(await loadFixture());

    const lines = store.encodeCity("paris");
    assert.equal(lines[0], "DAN PARIS");
    assert.ok(lines.some((line) => line.includes("CDG")));
  });
});

describe("SeedLoader", () => {
  it("loads locations from a fetcher", async () => {
    const store = new InMemoryStore();
    const loader = new SeedLoader(store);
    const payload = await loadFixture();

    const result = await loader.loadFromUrl("http://example.test/locations.json", async () => ({
      ok: true,
      json: async () => payload,
    }));

    assert.equal(result.locationsCount, payload.length);
    assert.equal(store.locations.length, payload.length);
  });
});
