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

// All 10 exercises shipped by Mission 08 (missions/MISSION-08.md Etape 4:
// "verifier que les 10 exercices sont jouables de bout en bout en
// production"), each solved with its primary verified command sequence
// (same sequences proved against the real engine in
// packages/exercises/src/__tests__/content.test.js -- this suite is the
// real-browser confirmation that the UI wires them up correctly end to end,
// not a re-proof of the business logic itself).
const ALL_EXERCISES = [
  { titre: "Lire une disponibilité", commands: ["AN26DECALGPAR", "SS2Y1"] },
  {
    titre: "Décoder ville, pays et compagnie",
    commands: ["AN26DECALGPAR", "SS3Y1"],
  },
  { titre: "Première vente", commands: ["AN26DECALGPAR", "SS1Y1"] },
  {
    titre: "Un dossier complet",
    commands: [
      "AN26DECALGPAR",
      "SS1Y1",
      "NM1DOE/JOHN MR",
      "AP1234567890",
      "RFMM",
      "TKTL/20DEC",
      "ER",
    ],
  },
  {
    titre: "Vente directe sans disponibilité",
    commands: ["SSPC4773Y26DECALGPAR1"],
  },
  {
    titre: "Retrouver et modifier un dossier",
    commands: ["RT ABCDEF", "SBM2", "ER"],
  },
  { titre: "Corriger des erreurs", commands: ["IG"] },
  {
    titre: "Tarifer et émettre",
    commands: [
      "AN26DECALGPAR",
      "SS1Y1",
      "NM1DOE/JOHN MR",
      "AP1234567890",
      "RFMM",
      "ER",
      "FXP",
      "FPCASH",
      "TTP",
    ],
  },
  {
    titre: "Liste d'attente",
    commands: [
      "AN26DECALGPAR",
      "SS2D1PE",
      "NM1DOE/JOHN MR",
      "AP1234567890",
      "RFMM",
      "2/KL",
      "ETK",
    ],
  },
  {
    titre: "Dossier complet de A à Z",
    commands: [
      "AN26DECALGPAR",
      "SS1Y1",
      "NM1DOE/JOHN MR",
      "AP1234567890",
      "RFMM",
      "TKTL/20DEC",
      "ER",
      "FXP",
      "FPCASH",
      "TTP",
    ],
  },
];

test.describe("Exercise mode -- all 10 exercises playable end to end", () => {
  for (const { titre, commands } of ALL_EXERCISES) {
    test(`"${titre}" passes with its verified solution`, async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Mode exercices" }).click();
      await page.getByLabel("Clé d'accès").fill(TEST_KEY);
      await page.getByRole("button", { name: "Valider" }).click();
      await expect(
        page.getByRole("heading", { name: "Choisissez un exercice" })
      ).toBeVisible();

      await page.getByText(titre, { exact: true }).click();
      await expect(page.getByText("AMADEUS SELLING PLATFORM")).toBeVisible();

      for (const cmd of commands) {
        await runCommand(page, cmd);
      }

      await page.getByRole("button", { name: "Vérifier" }).click();
      await expect(page.getByText("Exercice réussi")).toBeVisible();
    });
  }
});
