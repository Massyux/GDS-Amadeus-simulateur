import { test, expect } from "@playwright/test";

test.describe("Onboarding", () => {
  test("shows on first visit and leads into the terminal", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Simulateur Amadeus GDS" })
    ).toBeVisible();
    await expect(page.locator(".prompt-input")).toHaveCount(0);

    await page.getByRole("button", { name: "Entrer dans le terminal" }).click();
    await expect(page.locator(".prompt-input")).toBeVisible();
  });

  test("is skipped on the next visit once entered", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Entrer dans le terminal" }).click();
    await expect(page.locator(".prompt-input")).toBeVisible();

    await page.reload();
    await expect(page.locator(".prompt-input")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Simulateur Amadeus GDS" })
    ).toHaveCount(0);
  });
});
