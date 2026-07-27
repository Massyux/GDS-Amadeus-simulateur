import { describe, it, expect } from "vitest";
import { getDeviceFingerprint } from "./deviceFingerprint.js";

describe("getDeviceFingerprint", () => {
  it("returns a stable 64-char hex hash across calls", async () => {
    const first = await getDeviceFingerprint();
    const second = await getDeviceFingerprint();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);
  });
});
