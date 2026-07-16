import { test, expect } from "@playwright/test";

// GDS-TEST-0001's hash is injected as VITE_FALLBACK_KEY_HASHES for the e2e
// build (see .github/workflows/ci.yml and README.md "Tests").
const TEST_KEY = "GDS-TEST-0001";

test.describe("Pilot readiness (missions/MISSION-07.md Partie A)", () => {
  test("quick start guide and feedback button are reachable from the homepage", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Feedback" })).toBeVisible();

    await page
      .getByRole("button", { name: "Guide de démarrage rapide" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText("NM1DOE/JOHN MR", { exact: true })
    ).toBeVisible();

    await page.getByRole("button", { name: "Fermer" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("quick start guide and feedback button are reachable from the terminal", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "J'ai une clé d'accès" }).click();
    await page.getByLabel("Clé d'accès").fill(TEST_KEY);
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.locator(".prompt-input")).toBeVisible();

    await expect(page.getByRole("link", { name: "Feedback" })).toBeVisible();

    await page
      .getByRole("button", { name: "Guide de démarrage rapide" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("RFMM", { exact: true })).toBeVisible();
  });
});
