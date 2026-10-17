import { test, expect } from "@playwright/test";

// PROMPT-PASSE-ACCUEIL.md chantier 3 (14/10/2026) : les trois liens du
// pied de page (Contact, Conditions, Remboursement) pointaient vers
// href="#" en production. Contact traité en entier (adresse réelle) ;
// Conditions/Remboursement mènent à de vraies pages avec un état
// d'attente explicite -- le contenu juridique est à écrire par Massy,
// jamais par Claude Code.

test.describe("Pied de page -- liens légaux (chantier 3)", () => {
  test("Contact mène à une vraie adresse e-mail, pas à un lien mort", async ({ page }) => {
    await page.goto("/");
    const contact = page.getByRole("link", { name: "Contact" });
    await expect(contact).toHaveAttribute("href", "mailto:contact@orionisacademy.com");
  });

  test("Conditions -> page dédiée avec un état d'attente explicite, pas de faux texte juridique", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Conditions" }).click();
    await expect(page).toHaveURL(/\/conditions$/);
    await expect(page.getByRole("heading", { name: "Conditions de vente" })).toBeVisible();
    await expect(page.getByText("Page en préparation")).toBeVisible();
  });

  test("Remboursement -> page dédiée avec un état d'attente explicite", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Remboursement" }).click();
    await expect(page).toHaveURL(/\/remboursement$/);
    await expect(page.getByRole("heading", { name: "Politique de remboursement" })).toBeVisible();
    await expect(page.getByText("Page en préparation")).toBeVisible();
  });
});

// PROMPT-PASSE-ACCUEIL.md chantier 1 (17/10/2026) : "jamais retaper une URL
// pour revenir à l'administration" -- un lien discret, même niveau que
// Contact, toujours présent (contrairement au raccourci de barre de
// navigation, qui n'apparaît que si une session admin est déjà ouverte).
test.describe("Pied de page -- accès administration (chantier 1)", () => {
  test("Administration -> écran de connexion admin, jamais un chemin technique affiché", async ({ page }) => {
    await page.goto("/");
    const adminLink = page.getByRole("link", { name: "Administration" });
    await expect(adminLink).toBeVisible();
    await adminLink.click();
    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
    await expect(page.getByLabel("Phrase secrète")).toBeVisible();
  });
});
