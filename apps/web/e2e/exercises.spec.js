import { test, expect } from "@playwright/test";

// GDS-TEST-0001's hash is injected as VITE_FALLBACK_KEY_HASHES for the e2e
// build (see onboarding.spec.js). Exercise mode reuses the same key gate as
// free mode (App.test.jsx covers that routing decision directly) -- these
// e2e tests go through the real onboarding -> key -> picker flow once to
// confirm it works end to end in a real browser.
const TEST_KEY = "GDS-TEST-0001";

async function runCommand(page, cmd) {
  const input = page.locator(".prompt-input");
  await input.fill(cmd);
  await input.press("Enter");
}

test.describe("Exercise mode", () => {
  test("a valid solution passes the exercise with per-objectif feedback", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Mode exercices" }).click();
    await page.getByLabel("Clé d'accès").fill(TEST_KEY);
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(
      page.getByRole("heading", { name: "Choisissez un exercice" })
    ).toBeVisible();

    await page.getByText("Première vente").click();
    await expect(page.getByText("AMADEUS SELLING PLATFORM")).toBeVisible();

    await runCommand(page, "AN26DECALGPAR");
    await expect(page.getByText(/AMADEUS AVAILABILITY - AN/)).toBeVisible();
    await runCommand(page, "SS1Y1");
    await expect(page.getByText("OK")).toBeVisible();

    await page.getByRole("button", { name: "Vérifier" }).click();
    await expect(page.getByText("Exercice réussi")).toBeVisible();
    await expect(page.getByText("Segment ALG→PAR confirmé")).toBeVisible();
  });

  test("an incomplete attempt fails the exercise with a precise objectif failure", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Mode exercices" }).click();
    await page.getByLabel("Clé d'accès").fill(TEST_KEY);
    await page.getByRole("button", { name: "Valider" }).click();
    await page.getByText("Première vente").click();
    await expect(page.getByText("AMADEUS SELLING PLATFORM")).toBeVisible();

    // Only display availability, never sell anything.
    await runCommand(page, "AN26DECALGPAR");
    await expect(page.getByText(/AMADEUS AVAILABILITY - AN/)).toBeVisible();

    await page.getByRole("button", { name: "Vérifier" }).click();
    await expect(page.getByText("Pas encore réussi")).toBeVisible();
    const objectifLine = page.getByText("Segment ALG→PAR confirmé");
    await expect(objectifLine).toBeVisible();
    await expect(
      page.locator("li.exercise-objectif-failed", { hasText: "Segment ALG→PAR confirmé" })
    ).toBeVisible();
  });
});
