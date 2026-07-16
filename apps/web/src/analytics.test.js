import { afterEach, describe, it, expect, vi } from "vitest";
import { initAnalytics } from "./analytics.js";

afterEach(() => {
  vi.unstubAllEnvs();
  document
    .querySelectorAll("script[data-cf-beacon]")
    .forEach((el) => el.remove());
});

describe("initAnalytics", () => {
  it("does nothing when VITE_CF_BEACON_TOKEN is not configured", () => {
    initAnalytics();
    expect(document.querySelector("script[data-cf-beacon]")).toBeNull();
  });

  it("injects the Cloudflare beacon script when a token is configured", () => {
    vi.stubEnv("VITE_CF_BEACON_TOKEN", "abc123");
    initAnalytics();
    const script = document.querySelector("script[data-cf-beacon]");
    expect(script).not.toBeNull();
    expect(script.src).toBe(
      "https://static.cloudflareinsights.com/beacon.min.js"
    );
    expect(script.getAttribute("data-cf-beacon")).toBe(
      JSON.stringify({ token: "abc123" })
    );
  });

  it("does not inject a second script if one already exists", () => {
    vi.stubEnv("VITE_CF_BEACON_TOKEN", "abc123");
    initAnalytics();
    initAnalytics();
    expect(document.querySelectorAll("script[data-cf-beacon]").length).toBe(1);
  });
});
