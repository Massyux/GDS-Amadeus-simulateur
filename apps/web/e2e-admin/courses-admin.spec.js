import { test, expect } from "@playwright/test";

// Mission 23 Étape 4 (back-office formations) : preuve réelle du critère
// d'acceptation de MISSION-23.md -- "Massy crée une formation de test
// complète (vidéo, PDF, document à télécharger, session live) sans aide et
// sans écrire une ligne de code". Entièrement piloté par l'interface (clics,
// remplissage de champs, sélection de fichiers) -- aucun raccourci API,
// contrairement à functions/__tests__/courses-admin-api.test.js qui
// vérifie la même chose côté serveur.
const TEST_ADMIN_SECRET = "test-admin-secret";

function uniqueTitle(prefix) {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function loginAsAdmin(page) {
  await page.goto("/admin");
  await page.getByLabel("Phrase secrète").fill(TEST_ADMIN_SECRET);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { name: "Licences" })).toBeVisible();
  await page.getByRole("button", { name: "Formations" }).click();
  await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();
}

test.describe("Back-office formations (Mission 23 Étape 4)", () => {
  test("creates a full course (video + pdf + fichier + live), publishes it, entirely through the UI", async ({ page }) => {
    const courseTitle = uniqueTitle("Formation complète UI");
    const slug = `ui-${Date.now()}`;

    await loginAsAdmin(page);

    // Création de la formation.
    await page.getByRole("button", { name: "Nouvelle formation" }).click();
    await page.getByLabel("Identifiant (slug)").fill(slug);
    await page.getByLabel("Titre", { exact: true }).fill(courseTitle);
    await page.getByRole("button", { name: "Créer" }).click();

    // Retombe directement dans l'éditeur de la formation créée.
    await expect(page.getByRole("heading", { name: courseTitle })).toBeVisible();
    await expect(page.getByText("Brouillon")).toBeVisible();

    // Module.
    await page.getByRole("button", { name: "Nouveau module" }).click();
    await page.getByLabel("Titre du module").fill("Module 1");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByRole("heading", { name: "Module 1" })).toBeVisible();

    // Leçon vidéo (URL collée, pas de fichier hébergé -- MISSION-23.md).
    await page.getByRole("button", { name: "Nouvelle leçon" }).click();
    await page.getByLabel("Titre", { exact: true }).last().fill("Vidéo d'intro");
    await page.getByLabel("Type").last().selectOption("video");
    await page.getByLabel("URL (YouTube/Vimeo non répertorié)").fill("https://www.youtube-nocookie.com/embed/x");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText("Vidéo d'intro")).toBeVisible();

    // Leçon PDF (vrai envoi de fichier, pas une URL).
    await page.getByRole("button", { name: "Nouvelle leçon" }).click();
    await page.getByLabel("Titre", { exact: true }).last().fill("Support PDF");
    await page.getByLabel("Type").last().selectOption("pdf");
    await page.getByLabel("Fichier PDF").setInputFiles({
      name: "support.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 contenu de test"),
    });
    await expect(page.getByText("support.pdf ✓")).toBeVisible();
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText("Support PDF")).toBeVisible();

    // Leçon "fichier" (document à télécharger, distinct du PDF intégré).
    await page.getByRole("button", { name: "Nouvelle leçon" }).click();
    await page.getByLabel("Titre", { exact: true }).last().fill("Modèle à remplir");
    await page.getByLabel("Type").last().selectOption("fichier");
    await page.getByLabel("Ajouter un fichier").setInputFiles({
      name: "modele.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("faux contenu docx"),
    });
    await expect(page.getByText("modele.docx")).toBeVisible();
    // Un <input type="file"> est lui-même exposé avec le rôle "button" dans
    // l'arbre d'accessibilité ("Ajouter un fichier" matche "Ajouter" en
    // sous-chaîne) -- exact:true nécessaire pour cibler le vrai bouton de
    // soumission du formulaire, pas l'input de fichier.
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByText("Modèle à remplir")).toBeVisible();

    // Leçon "live" (date, heure, durée, lien).
    await page.getByRole("button", { name: "Nouvelle leçon" }).click();
    await page.getByLabel("Titre", { exact: true }).last().fill("Session de lancement");
    await page.getByLabel("Type").last().selectOption("live");
    await page.getByLabel("Titre de la session").fill("Lancement");
    await page.getByLabel("Date et heure").fill("2026-12-15T10:00");
    await page.getByLabel("Durée (minutes)").fill("60");
    await page.getByLabel("Lien (Zoom/Meet/Teams)").fill("https://meet.example.com/lancement");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText("Session de lancement")).toBeVisible();

    // Publication.
    await page.getByRole("button", { name: "Publier" }).click();
    await expect(page.getByText("Publiée", { exact: true })).toBeVisible();

    // Retour à la liste : la formation apparaît publiée, avec 4 leçons.
    await page.getByRole("button", { name: "Retour aux formations" }).click();
    const row = page.locator("tr", { hasText: courseTitle });
    await expect(row.getByText("publiée")).toBeVisible();
    await expect(row).toContainText("4");
  });

  test("reorders lessons with the up/down buttons and deletes one", async ({ page }) => {
    await loginAsAdmin(page);
    const courseTitle = uniqueTitle("Réordonnancement");
    await page.getByRole("button", { name: "Nouvelle formation" }).click();
    await page.getByLabel("Identifiant (slug)").fill(`reorder-${Date.now()}`);
    await page.getByLabel("Titre", { exact: true }).fill(courseTitle);
    await page.getByRole("button", { name: "Créer" }).click();

    await page.getByRole("button", { name: "Nouveau module" }).click();
    await page.getByLabel("Titre du module").fill("Module");
    await page.getByRole("button", { name: "Ajouter" }).click();

    for (const title of ["Leçon A", "Leçon B"]) {
      await page.getByRole("button", { name: "Nouvelle leçon" }).click();
      await page.getByLabel("Titre", { exact: true }).last().fill(title);
      await page.getByRole("button", { name: "Ajouter" }).click();
      await expect(page.getByText(title)).toBeVisible();
    }

    const lessonRows = page.locator(".admin-lesson-row");
    await expect(lessonRows).toHaveCount(2);
    await expect(lessonRows.nth(0)).toContainText("Leçon A");

    await lessonRows.nth(0).getByRole("button", { name: "Descendre la leçon" }).click();
    await expect(lessonRows.nth(0)).toContainText("Leçon B");
    await expect(lessonRows.nth(1)).toContainText("Leçon A");

    page.once("dialog", (dialog) => dialog.accept());
    await lessonRows.nth(1).getByRole("button", { name: "Supprimer" }).click();
    await expect(page.locator(".admin-lesson-row")).toHaveCount(1);
  });
});
