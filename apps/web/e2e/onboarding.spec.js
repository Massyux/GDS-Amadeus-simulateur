import { test, expect } from "@playwright/test";

// GDS-TEST-0001 is a fixture license seeded into the local D1 before this
// suite runs (see scripts/seed-e2e-test-license.sql and
// playwright.config.js's webServer command) -- not a real pilot key.
// Mission 14 Etape 3: this suite runs against a real `wrangler pages dev` +
// D1 now, exercising the actual /api/license/activate Function, not a
// client-side fallback.
const TEST_KEY = "GDS-TEST-0001";

test.describe("Onboarding", () => {
  test("shows the marketing homepage on first visit, terminal stays hidden", async ({
    page,
  }) => {
    await page.goto("/simulateur");
    await expect(
      page.getByRole("heading", { name: "Simulateur Amadeus GDS" })
    ).toBeVisible();
    await expect(page.locator(".prompt-input")).toHaveCount(0);
    await expect(page.getByText(">AN15DECALGPAR")).toBeVisible();
  });

  test("toggles to English", async ({ page }) => {
    await page.goto("/simulateur");
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
    await page.goto("/simulateur");
    await page.getByRole("button", { name: "J'ai une clé d'accès" }).click();
    await page.getByLabel("Clé d'accès").fill("GDS-0000-0000");
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByText("Clé invalide.")).toBeVisible();
    await expect(page.locator(".prompt-input")).toHaveCount(0);
  });

  test("accepts a valid access key and persists after reload", async ({
    page,
  }) => {
    await page.goto("/simulateur");
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
