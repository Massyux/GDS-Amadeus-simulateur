import { test, expect } from "@playwright/test";

// PROMPT-PASSE-ACCUEIL.md chantier 1 (14/10/2026) : démonstration limitée du
// vrai terminal depuis l'accueil, sans compte ni clé. Le critère le plus
// important de ce fichier : Terminal.jsx ne doit jamais changer de
// comportement -- terminal.spec.js (mode libre) et exercises.spec.js
// (mode cours) restent la vraie garantie de non-régression ; ces tests-ci
// vérifient seulement ce que /demo ajoute PAR-DESSUS, jamais à l'intérieur.

test.describe("Démo publique du terminal (/demo)", () => {
  test("accueil -> terminal du héros (clic réel) -> vrai terminal monté, pas une image", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Essayer le vrai terminal/i }).click({ force: true });
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.locator(".prompt-input")).toBeVisible();
    await expect(page.getByText("AMADEUS SELLING PLATFORM")).toBeVisible();
  });

  test("bouton de secours « Essayer le terminal » depuis le héros mène aussi à /demo", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Essayer le terminal" }).click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.locator(".prompt-input")).toBeVisible();
  });

  test("trois commandes d'exemple cliquables insèrent le texte exact dans le vrai prompt", async ({ page }) => {
    await page.goto("/demo");
    const chips = page.locator(".demo-hint-chip");
    await expect(chips).toHaveCount(3);
    const firstChipText = await chips.first().textContent();
    await chips.first().click();
    await expect(page.locator(".prompt-input")).toHaveValue(firstChipText);
  });

  test("parcours complet jusqu'au PNR : carte de fin par-dessus, transcript toujours visible", async ({ page }) => {
    await page.goto("/demo");

    async function clickNextHintAndSubmit() {
      const chip = page.locator(".demo-hint-chip").first();
      await chip.click();
      await page.locator(".prompt-input").press("Enter");
    }

    for (let i = 0; i < 6; i += 1) {
      await clickNextHintAndSubmit();
    }

    await expect(page.getByRole("heading", { name: "Tu viens de créer ton premier PNR !" })).toBeVisible();
    // La carte est une superposition, pas un effacement -- le transcript
    // reste dans le DOM derrière elle (le défilement automatique du
    // terminal, lui, continue de centrer la ligne de prompt -- inchangé --
    // donc la ligne "PNR RECORDED" peut être hors champ sans que la carte
    // l'ait masquée).
    await expect(page.locator(".screen")).toContainText("PNR RECORDED");

    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page).toHaveURL(/\/app\/inscription$/);
  });

  test("15 commandes sans PNR affichent aussi la carte de fin", async ({ page }) => {
    await page.goto("/demo");
    for (let i = 0; i < 15; i += 1) {
      await page.locator(".prompt-input").fill("HE");
      await page.locator(".prompt-input").press("Enter");
    }
    await expect(page.getByRole("heading", { name: "Tu viens de créer ton premier PNR !" })).toBeVisible();
  });

  test("le compteur vit en localStorage (pas un dispositif anti-fraude) : persiste au rafraîchissement, repart à zéro si on vide le navigateur", async ({
    page,
  }) => {
    await page.goto("/demo");
    for (let i = 0; i < 15; i += 1) {
      await page.locator(".prompt-input").fill("HE");
      await page.locator(".prompt-input").press("Enter");
    }
    await expect(page.getByRole("heading", { name: "Tu viens de créer ton premier PNR !" })).toBeVisible();

    await page.reload();
    // La limite est déjà atteinte : la carte apparaît sans qu'il faille rien taper.
    await expect(page.getByRole("heading", { name: "Tu viens de créer ton premier PNR !" })).toBeVisible();
    // Le terminal reste affiché et utilisable derrière -- pas de verrou dur.
    await expect(page.locator(".prompt-input")).toBeVisible();

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole("heading", { name: "Tu viens de créer ton premier PNR !" })).not.toBeVisible();
  });
});
