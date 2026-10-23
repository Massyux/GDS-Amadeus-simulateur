import { test, expect } from "@playwright/test";

// Real end-to-end coverage of /admin (missions/MISSION-14.md Etape 4),
// against REAL Cloudflare Pages Functions + a REAL local D1 (see
// playwright.admin.config.js -- wrangler pages dev, not vite preview).
// The test secret matches .dev.vars' ADMIN_SECRET_HASH (see
// functions/__tests__/testServer.js for where that hash comes from).
const TEST_ADMIN_SECRET = "test-admin-secret";

test.describe("Admin (Mission 14 -- espace admin + licences)", () => {
  test("rejects a wrong passphrase and never reaches the dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();

    await page.getByLabel("Phrase secrète").fill("wrong-secret");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page.getByRole("alert")).toHaveText("Phrase secrète invalide.");
    await expect(page.getByRole("heading", { name: "Licences" })).toHaveCount(0);
  });

  test("logs in, creates a license, and shows it in the table", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Phrase secrète").fill(TEST_ADMIN_SECRET);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page.getByRole("heading", { name: "Licences" })).toBeVisible();

    await page.getByRole("button", { name: "Nouvelle clé" }).click();
    await page.getByPlaceholder("Nom du client").fill("Client E2E");
    await page.getByRole("button", { name: "Générer" }).click();

    await expect(page.getByText(/GDS-[A-Z0-9]{4}-[A-Z0-9]{4}/)).toBeVisible();
    await expect(page.getByText("Client E2E")).toBeVisible();
  });

  test("revokes a license from the table", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Phrase secrète").fill(TEST_ADMIN_SECRET);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await page.getByRole("button", { name: "Nouvelle clé" }).click();
    await page.getByPlaceholder("Nom du client").fill("Client Revoke E2E");
    await page.getByRole("button", { name: "Générer" }).click();
    await page.getByRole("button", { name: "OK" }).click();

    const row = page.locator("tr", { hasText: "Client Revoke E2E" });
    await row.getByRole("button", { name: "Révoquer" }).click();

    await expect(row.getByText("révoquée")).toBeVisible();
    await expect(row.getByRole("button", { name: "Réactiver" })).toBeVisible();
  });

  test("persists the admin session across a reload (sessionStorage)", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Phrase secrète").fill(TEST_ADMIN_SECRET);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("heading", { name: "Licences" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Licences" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Administration" })).toHaveCount(0);
  });

  // PROMPT-MOBILE.md (22/10/2026) : le tableau des licences mesurait
  // ~1287px sans aucune règle mobile -- il défile désormais dans son
  // propre conteneur (.admin-table-scroll), jamais la page entière, et
  // sans perdre de colonne.
  test("at 390px, the licenses table scrolls within its own container, never the page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");
    await page.getByLabel("Phrase secrète").fill(TEST_ADMIN_SECRET);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("heading", { name: "Licences" })).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    const table = page.locator(".admin-table-scroll table");
    await expect(table.locator("th", { hasText: "Dernière activité" })).toBeVisible();
    const overflow = await page.locator(".admin-table-scroll").evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
  });
});
