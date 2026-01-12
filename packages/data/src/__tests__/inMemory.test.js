import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInMemoryStore } from "../index.js";

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
});
