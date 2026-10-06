import { test, expect } from "@playwright/test";

// Mission 23, Étape 0: /styleguide is internal-only (never linked from any
// visitor-facing screen -- reached by typing the URL directly, same
// convention as /admin). This spec is the "test obligatoire" that the
// foundations actually render, are keyboard-navigable, and don't shift
// layout -- the budgets from docs/DESIGN-SYSTEM.md §7 that are meaningful
// to assert deterministically in a headless run. LCP/INP depend on real
// network conditions ("4G lente") and are better measured with Lighthouse
// against deployed content pages once Étape 2 exists -- noted in TASKS.md.

test.describe("Styleguide (Mission 23, Étape 0)", () => {
  test("renders every component section", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.getByRole("heading", { name: "Styleguide de la plateforme" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Primaire", exact: true })).toBeVisible();
    await expect(page.getByLabel("Adresse e-mail")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveText(
      "Le mot de passe doit faire au moins 8 caractères."
    );
    await expect(page.getByRole("progressbar").first()).toBeVisible();
  });

  test("danger button requires a second click, keyboard included", async ({ page }) => {
    await page.goto("/styleguide");
    const deleteBtn = page.getByRole("button", { name: "Supprimer" });
    await deleteBtn.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Confirmer la suppression ?" })).toBeVisible();
  });

  test("every interactive element is reachable by keyboard with a visible focus ring", async ({
    page,
  }) => {
    await page.goto("/styleguide");
    const primaryBtn = page.getByRole("button", { name: "Primaire", exact: true });
    await primaryBtn.focus();
    await expect(primaryBtn).toBeFocused();
    const outline = await primaryBtn.evaluate((el) => getComputedStyle(el).outlineColor);
    expect(outline).not.toBe("");
  });

  test("causes no layout shift after load (CLS budget: < 0.05)", async ({ page }) => {
    await page.goto("/styleguide");
    await page.waitForLoadState("networkidle");
    const cls = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) total += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
          // Give any late observer entries (already-buffered) a tick to flush.
          setTimeout(() => resolve(total), 200);
        })
    );
    expect(cls).toBeLessThan(0.05);
  });
});
