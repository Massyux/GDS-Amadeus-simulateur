import { test, expect } from "@playwright/test";

// GDS-TEST-0001's hash is injected as VITE_FALLBACK_KEY_HASHES for the e2e
// build (see .github/workflows/ci.yml and README.md "Tests"). It is not a
// real access key — Cloudflare Pages Functions don't run under `vite
// preview`, so this exercises the documented client-side fallback path.
const TEST_KEY = "GDS-TEST-0001";

test.describe("Onboarding", () => {
  test("shows the marketing homepage on first visit, terminal stays hidden", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Simulateur Amadeus GDS" })
    ).toBeVisible();
    await expect(page.locator(".prompt-input")).toHaveCount(0);
    await expect(page.getByText(">AN15DECALGPAR")).toBeVisible();
  });

  test("toggles to English", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "EN" }).click();
    await expect(
      page.getByRole("heading", { name: "Amadeus GDS Simulator" })
    ).toBeVisible();
  });
});

test.describe("Access gate", () => {
  test("rejects an invalid access key and keeps the terminal hidden", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "J'ai une clé d'accès" }).click();
    await page.getByLabel("Clé d'accès").fill("GDS-0000-0000");
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByText("Clé invalide.")).toBeVisible();
    await expect(page.locator(".prompt-input")).toHaveCount(0);
  });

  test("accepts a valid access key and persists after reload", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "J'ai une clé d'accès" }).click();
    await page.getByLabel("Clé d'accès").fill(TEST_KEY);
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.locator(".prompt-input")).toBeVisible();

    await page.reload();
    await expect(page.locator(".prompt-input")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Simulateur Amadeus GDS" })
    ).toHaveCount(0);
  });
});
