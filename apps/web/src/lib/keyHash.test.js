import { describe, it, expect } from "vitest";
import { normalizeKey, sha256Hex } from "./keyHash.js";

describe("normalizeKey", () => {
  it("trims whitespace and uppercases", () => {
    expect(normalizeKey("  gds-test-0001  ")).toBe("GDS-TEST-0001");
  });

  it("returns an empty string for non-string input", () => {
    expect(normalizeKey(undefined)).toBe("");
    expect(normalizeKey(null)).toBe("");
  });
});

describe("sha256Hex", () => {
  it("produces the known SHA-256 hex digest of a normalized key", async () => {
    // Cross-checked against `node -e "require('crypto').createHash('sha256')
    // .update('GDS-TEST-0001').digest('hex')"` and scripts/generate-keys.mjs.
    const hash = await sha256Hex("GDS-TEST-0001");
    expect(hash).toBe(
      "f422821e3d707a6557c0b112a856927c754b5ca0842cb44503e6e028aa539a16"
    );
  });

  it("is sensitive to any character difference", async () => {
    const a = await sha256Hex("GDS-TEST-0001");
    const b = await sha256Hex("GDS-TEST-0002");
    expect(a).not.toBe(b);
  });
});
