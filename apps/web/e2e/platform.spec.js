import { test, expect } from "@playwright/test";

// Mission 23 Étape 2: golden path through the whole student-facing space --
// register -> catalogue -> course -> enroll -> play every lesson type ->
// mark one completed -> account shows progress -> logout -> login again ->
// progress survived. scripts/seed-dev-course.sql provides the fixture
// course (seeded by playwright.config.js's webServer before this suite
// runs); the pdf/fichier lessons reference R2 keys that need actual bytes,
// seeded once here via the dev-only endpoint (functions/api/dev/seed-file.js,
// MAIL_DEV_ECHO-gated, never reachable in production).

test.beforeAll(async ({ baseURL }) => {
  await fetch(`${baseURL}/api/dev/seed-file`, {
    method: "POST",
    headers: { "X-Seed-Key": "support.pdf" },
    body: "%PDF-1.4 fixture",
  });
  await fetch(`${baseURL}/api/dev/seed-file`, {
    method: "POST",
    headers: { "X-Seed-Key": "fiche1.txt" },
    body: "fiche 1",
  });
  await fetch(`${baseURL}/api/dev/seed-file`, {
    method: "POST",
    headers: { "X-Seed-Key": "fiche2.txt" },
    body: "fiche 2",
  });
});

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

test.describe("Espace étudiant (Mission 23 Étape 2)", () => {
  test("register, enroll, play every lesson type, track progress, survive a logout/login", async ({
    page,
  }) => {
    const email = uniqueEmail();
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/app");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Se connecter" }).click();
    // Unknown email -> generic error, then switch to register.
    await expect(page.getByRole("alert")).toBeVisible();
    await page.getByRole("button", { name: "Pas encore de compte ? Créer un compte" }).click();
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();
    await expect(page.getByText("Amadeus — Niveau 1")).toBeVisible();

    await page.getByText("Amadeus — Niveau 1").click();
    await expect(page.getByRole("heading", { name: "Amadeus — Niveau 1" })).toBeVisible();
    await page.getByRole("button", { name: "S'inscrire" }).click();
    await expect(page.getByText("Tu es inscrit à cette formation.")).toBeVisible();

    await page.getByRole("link", { name: "Bienvenue" }).click();
    await expect(page.getByText("Ceci est une leçon de démonstration")).toBeVisible();

    // Plus de bouton "Suivant" générique (nouvelle direction artistique) --
    // navigation par le sommaire latéral, toujours visible en desktop.
    await page.getByRole("link", { name: "Vidéo de présentation" }).click();
    await expect(page.locator("iframe[title='video']")).toBeVisible();

    await page.getByRole("link", { name: "Session live de lancement" }).click();
    await expect(page.getByText("À venir")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ajouter à mon agenda" })).toBeVisible();

    await page.getByRole("link", { name: "Support de cours" }).click();
    await expect(page.getByRole("link", { name: "Télécharger le PDF" })).toBeVisible();
    // The PDF preview is a same-origin <iframe src="/api/files/download?...">
    // -- regression check for the CSP frame-src fix (needs 'self', which
    // frame-src does NOT inherit from default-src unlike most directives).
    await expect(page.locator("iframe[title='support.pdf']")).toBeVisible();
    expect(consoleErrors.some((e) => /Content Security Policy|frame-src/i.test(e))).toBe(false);

    await page.getByRole("link", { name: "Fiches mémo" }).click();
    await expect(page.getByRole("link", { name: "fiche1.txt" })).toBeVisible();

    // Retour à la leçon 1 par le sommaire, marquer comme terminé -- pas la
    // dernière du module, donc enchaîne directement sur la leçon 2.
    await page.getByRole("link", { name: "Bienvenue" }).click();
    await expect(page.getByText("Ceci est une leçon de démonstration")).toBeVisible();
    await page.getByRole("button", { name: "Marquer comme terminé et continuer" }).click();
    await expect(page.locator("iframe[title='video']")).toBeVisible();

    // Le lecteur de leçon n'a pas la barre de navigation complète
    // (docs/MAQUETTES.md §5 : "le contenu règne") -- il faut repasser par la
    // page de formation pour atteindre "Mon compte".
    await page.getByRole("link", { name: "Retour à la formation" }).click();
    await page.getByRole("link", { name: "Mon compte" }).click();
    await expect(page.getByText("1 / 5")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continuer" })).toBeVisible();

    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();

    await page.goto("/app/compte");
    await expect(page.getByText("1 / 5")).toBeVisible();
  });

  test("a logged-out visit to any /app/* path shows the auth screen, never the content", async ({
    page,
  }) => {
    await page.goto("/app/compte");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});
