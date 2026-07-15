import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createInMemoryStore,
  createLocationProvider,
  createCountryProvider,
  createAirlineProvider,
} from "../index.js";

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

  it("provider.findByIata resolves known codes and returns null for unknown ones", async () => {
    const store = createInMemoryStore();
    await store.loadFromArray([
      { iata: "ALG", city: "ALGIERS", name: "HOUARI", country: "DZ" },
    ]);
    const provider = createLocationProvider(store);
    const known = await provider.findByIata("alg");
    assert.equal(known.iata, "ALG");
    const unknown = await provider.findByIata("ZZZ");
    assert.equal(unknown, null);
  });

  it("loads countries from array and cmdDC decodes a code or encodes a text search", async () => {
    const store = createInMemoryStore();
    await store.loadCountriesFromArray([
      { code: "FR", name: "FRANCE", nationality: "FRENCH" },
      { code: "GB", name: "UNITED KINGDOM", nationality: "BRITISH" },
    ]);
    const decoded = await store.cmdDC("GB");
    assert.ok(decoded.some((line) => line.includes("UNITED KINGDOM / BRITISH")));
    const encoded = await store.cmdDC("FRANCE");
    assert.ok(encoded.some((line) => line.includes("FR    FRANCE / FRENCH")));
  });

  it("cmdDC returns NO MATCH for an unknown code or text", async () => {
    const store = createInMemoryStore();
    await store.loadCountriesFromArray([
      { code: "FR", name: "FRANCE", nationality: "FRENCH" },
    ]);
    const unknownCode = await store.cmdDC("ZZ");
    assert.ok(unknownCode.includes("NO MATCH"));
    const unknownText = await store.cmdDC("NOWHERE");
    assert.ok(unknownText.includes("NO MATCH"));
  });

  it("exposes a core-compatible country provider adapter", async () => {
    const store = createInMemoryStore();
    await store.loadCountriesFromArray([
      { code: "DZ", name: "ALGERIA", nationality: "ALGERIAN" },
    ]);
    const provider = createCountryProvider(store);
    const lines = await provider.lookup("DZ");
    assert.ok(lines.some((line) => line.includes("ALGERIA / ALGERIAN")));
  });

  it("loads airlines from array and cmdDNA resolves by code, numeric or text", async () => {
    const store = createInMemoryStore();
    await store.loadAirlinesFromArray([
      { code: "AF", numeric: "057", name: "AIR FRANCE" },
      { code: "AH", numeric: "124", name: "AIR ALGERIE" },
    ]);
    const byCode = await store.cmdDNA("AF");
    assert.ok(byCode.some((line) => line.includes("AIR FRANCE")));
    const byNumeric = await store.cmdDNA("057");
    assert.ok(byNumeric.some((line) => line.includes("AIR FRANCE")));
    const byText = await store.cmdDNA("ALGERIE");
    assert.ok(byText.some((line) => line.includes("AH")));
  });

  it("cmdDNA returns NO MATCH for an unknown code, numeric or text", async () => {
    const store = createInMemoryStore();
    await store.loadAirlinesFromArray([
      { code: "AF", numeric: "057", name: "AIR FRANCE" },
    ]);
    assert.ok((await store.cmdDNA("ZZ")).includes("NO MATCH"));
    assert.ok((await store.cmdDNA("999")).includes("NO MATCH"));
    assert.ok((await store.cmdDNA("NOWHERE")).includes("NO MATCH"));
  });

  it("exposes a core-compatible airline provider adapter", async () => {
    const store = createInMemoryStore();
    await store.loadAirlinesFromArray([
      { code: "AT", numeric: "147", name: "ROYAL AIR MAROC" },
    ]);
    const provider = createAirlineProvider(store);
    const lines = await provider.lookup("AT");
    assert.ok(lines.some((line) => line.includes("ROYAL AIR MAROC")));
  });
});
