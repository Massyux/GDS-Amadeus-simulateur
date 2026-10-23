import { test, expect } from "@playwright/test";

// PROMPT-MOBILE.md (22/10/2026) : "aucun débordement horizontal de la page
// sur l'ensemble du site -- document.documentElement.scrollWidth ne dépasse
// pas clientWidth." Garde-fou permanent demandé explicitement par
// l'architecte, pas une vérification ponctuelle -- seule garantie que la
// prochaine fonctionnalité ne réintroduira pas le défaut qui a nécessité
// cette passe (terminal/administration sans aucune règle mobile).
//
// Playwright `setViewportSize` émule une vraie largeur de viewport CSS --
// contrairement au redimensionnement manuel d'une fenêtre Chrome maximisée
// (qui a failli faire manquer le défaut à l'architecte), ce n'est pas un
// raccourci approximatif.
async function assertNoHorizontalOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.describe("Aucun débordement horizontal de page à 390px (PROMPT-MOBILE.md)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("accueil public", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Essayer gratuitement" }).first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("démo du terminal (/demo)", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.locator(".prompt-input")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("écran de connexion étudiant (/app)", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("écran de connexion admin (/admin)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("pages légales (/conditions, /remboursement)", async ({ page }) => {
    await page.goto("/conditions");
    await assertNoHorizontalOverflow(page);
    await page.goto("/remboursement");
    await assertNoHorizontalOverflow(page);
  });

  test("mode libre (/simulateur) -- la page ne défile pas horizontalement même après un AN", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("simulateur-amadeus:skip-onboarding", "1");
      localStorage.setItem("simulateur-amadeus:access-key-valid", "1");
    });
    await page.goto("/simulateur");
    await expect(page.getByText("AMADEUS SELLING PLATFORM")).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const input = page.locator(".prompt-input");
    await input.fill("AN15DECALGPAR");
    await input.press("Enter");
    await expect(page.getByText(/AMADEUS AVAILABILITY - AN/)).toBeVisible();

    // La page ne défile jamais horizontalement -- c'est .screen, à
    // l'intérieur, qui le fait à sa place (vérifié séparément ci-dessous).
    await assertNoHorizontalOverflow(page);

    const screen = page.locator(".screen");
    const overflow = await screen.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
  });

  // Trouvé PAR ce garde-fou, pas par une relecture visuelle : .pf-termglow
  // (le halo décoratif derrière le mock-terminal du héros, inset:-28px)
  // dépassait de 12px à droite -- l'accueil public n'était donc PAS
  // correctement adaptatif comme l'affirmait le constat initial de
  // PROMPT-MOBILE.md. Corrigé en bornant le débordement décoratif à
  // .platform-root (voir platform.css) -- rendu visuellement inchangé,
  // seul le défilement fantôme disparaît. Les pages authentifiées suivent
  // la même correction (commune à .platform-root) ; vérifiées ici aussi
  // pour ne pas supposer que "ça doit aller" sans l'avoir constaté.
  test("catalogue, compte et fiche de formation (espace étudiant connecté)", async ({ page, baseURL }) => {
    await fetch(`${baseURL}/api/dev/reset-rate-limits`, { method: "POST" });
    const email = `overflow-${Date.now()}@example.com`;
    await page.goto("/app");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Pas encore de compte ? Créer un compte" }).click();
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    // Sous 767px, la navigation vit derrière le menu ☰ (platform.css) --
    // "Mon compte" n'est pas dans le DOM visible tant qu'il n'est pas ouvert.
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.getByRole("link", { name: "Mon compte" }).click();
    await expect(page.getByRole("heading", { name: "Mon compte" })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.goto("/app/cours/amadeus-niveau-1");
    await expect(page.getByRole("heading", { name: "Amadeus — Niveau 1" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
