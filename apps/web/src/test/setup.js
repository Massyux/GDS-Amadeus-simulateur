import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrollIntoView; Terminal.jsx calls it directly
// (not through rAF) on the bottom-anchor ref for auto-follow scrolling.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Terminal.jsx fetches /data/locations.json (via packages/data's
// InMemoryStore.loadFromUrl) for DAC/DAN and, since Mission 03, for AN/TN/SN
// city-code validation. jsdom/Node fetch can't resolve that relative path,
// so serve the real fixture from disk instead of leaving the store empty
// (which would make every AN/TN/SN fail with NOT IN TABLE in tests).
const dirname = path.dirname(fileURLToPath(import.meta.url));
const locationsPath = path.resolve(
  dirname,
  "../../public/data/locations.json"
);
const locationsFixture = JSON.parse(readFileSync(locationsPath, "utf-8"));

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, ...args) => {
  if (String(url).includes("locations.json")) {
    return new Response(JSON.stringify(locationsFixture), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return realFetch(url, ...args);
};
