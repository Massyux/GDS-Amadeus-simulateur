import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInMemoryStore, createLocationProvider } from "../index.js";

describe("InMemoryStore", () => {
  it("loads from array and cmdDAC/cmdDAN work", async () => {
    const store = createInMemoryStore();
    await store.loadFromArray([
      { iata: "ABC", city: "CITYA", name: "NAMEA", country: "X" },
      { iata: "DEF", city: "CITYD", name: "NAMED", country: "Y" },
    ]);
    const dac = await store.cmdDAC("ABC");
    assert.ok(dac.some((l) => l.startsWith("DAC ABC")));
    const dan = await store.cmdDAN("CITY");
    assert.ok(Array.isArray(dan));
    const found = await store.findByIata("DEF");
    assert.equal(found.iata, "DEF");
  });

  it("exposes a core-compatible location provider adapter", async () => {
    const store = createInMemoryStore();
    await store.loadFromArray([
      { iata: "ALG", city: "ALGIERS", name: "HOUARI", country: "DZ" },
    ]);
    const provider = createLocationProvider(store);
    const dac = await provider.decodeIata("ALG");
    const dan = await provider.searchByText("ALGIERS");
    assert.ok(dac.some((line) => line.startsWith("DAC ALG")));
    assert.ok(dan.some((line) => line.startsWith("DAN ALGIERS")));
  });
});
