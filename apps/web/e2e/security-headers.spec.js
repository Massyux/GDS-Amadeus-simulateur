import { test, expect } from "@playwright/test";

// docs/SECURITE.md §4 + §9 checklist: "les en-têtes de sécurité sont bien
// servis". Runs against the real `wrangler pages dev` serving apps/web/dist
// (see playwright.config.js) -- the closest local proxy to production for
// Cloudflare Pages' `_headers` file (apps/web/public/_headers), short of an
// actual deployment (which Mission 23's mode autonome explicitly forbids
// for now).

test.describe("Security headers (docs/SECURITE.md §4)", () => {
  test("the homepage response carries every required header", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response.headers();

    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["strict-transport-security"]).toContain("max-age=31536000");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });

  test("the styleguide route carries the same headers (applies to every path)", async ({
    page,
  }) => {
    const response = await page.goto("/styleguide");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});
