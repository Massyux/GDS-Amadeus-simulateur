import { test, expect } from "@playwright/test";

// 🔴 Régression critique du 11/10/2026 : main.jsx ne lisait window.location
// qu'UNE FOIS, à l'import -- navigate() (platform/useRoute.js) changeait bien
// l'URL (history.pushState + popstate) mais rien n'écoutait cet événement au
// sommet de l'app, donc le composant monté ne changeait jamais. Cliquer
// "Commencer" sur l'accueil changeait l'URL vers /app sans jamais afficher
// la plateforme -- un cul-de-sac depuis la toute première page du site.
//
// La leçon de cette régression, et la règle de ce fichier : toute la suite
// e2e historique entre par `page.goto()` DIRECTEMENT dans la zone testée --
// jamais en cliquant depuis l'endroit où un vrai visiteur commence. C'est
// pour ça qu'un site injouable dès l'accueil est passé en production avec
// toutes les suites vertes. Les tests ci-dessous font l'inverse : ils
// commencent où un visiteur commence, et cliquent. `goto()` n'apparaît ici
// que pour les cas où c'est le comportement réel d'un visiteur (rafraîchir,
// coller un lien, taper une URL qui n'existe pas) -- jamais comme raccourci.

function uniqueEmail() {
  return `nav-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

test.beforeAll(async ({ baseURL }) => {
  // Même motif que platform.spec.js : un seul compteur de rate-limit pour
  // toute l'"IP" factice locale, partagé entre tous les fichiers e2e de
  // cette session.
  await fetch(`${baseURL}/api/dev/reset-rate-limits`, { method: "POST" });
});

async function registerByClicking(page, email) {
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
}

test.describe("Navigation -- cul-de-sac depuis l'accueil (régression du 11/10/2026)", () => {
  // PROMPT-PASSE-ACCUEIL.md chantier 2 (14/10/2026) : ces boutons mènent
  // désormais à l'inscription, pas à la connexion -- un visiteur qui
  // clique "Commencer"/"Essayer gratuitement" n'a pas de compte.
  test("accueil -> bouton « Commencer » de la barre de navigation -> écran d'inscription", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Essayer gratuitement" }).first()).toBeVisible();
    await page.getByRole("navigation").getByRole("button", { name: "Commencer" }).click();
    await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/app/inscription");
  });

  test("accueil -> bouton « Essayer gratuitement » du héros -> écran d'inscription", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Essayer gratuitement" }).first().click();
    await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
  });

  test("accueil -> CTA final de bas de page -> écran d'inscription", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Essayer gratuitement" }).last().click();
    await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
  });

  test("accueil -> lien « Connexion » de la barre de navigation -> écran de connexion", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Connexion" }).click();
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/app");
  });

  test("accueil, menu mobile (390px) -> « Commencer » -> écran d'inscription", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.locator("#pf-home-mobile-nav").getByRole("button", { name: "Commencer" }).click();
    await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
  });

  test("accueil -> carte d'une vraie formation -> écran de connexion (formation protégée)", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Réservation aérienne").click();
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test(
    "parcours complet par clic depuis l'accueil : inscription -> catalogue -> formation -> leçon " +
      "-> retour navigateur -> fil d'Ariane -> Mon compte -> déconnexion -> retour à l'accueil",
    async ({ page }) => {
      const email = uniqueEmail();

      await page.goto("/");
      // "Commencer" ouvre directement l'inscription depuis le chantier 2
      // (14/10/2026) -- plus besoin de basculer depuis l'écran de connexion.
      await page.getByRole("navigation").getByRole("button", { name: "Commencer" }).click();
      await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
      await registerByClicking(page, email);
      await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();

      await page.getByText("Amadeus — Niveau 1").click();
      await expect(page.getByRole("heading", { name: "Amadeus — Niveau 1" })).toBeVisible();

      await page.getByRole("button", { name: "S'inscrire" }).click();
      await page.getByRole("link", { name: "Bienvenue" }).click();
      await expect(page.getByText("Ceci est une leçon de démonstration")).toBeVisible();

      // Retour navigateur : leçon -> formation.
      await page.goBack();
      await expect(page.getByRole("heading", { name: "Amadeus — Niveau 1" })).toBeVisible();

      // Fil d'Ariane depuis la formation : "Accueil" doit ramener à la
      // VRAIE page d'accueil publique, pas au catalogue étudiant -- c'est
      // exactement ce que la régression cassait (CoursePage.jsx/
      // LessonPlayerPage.jsx utilisent déjà ce lien depuis l'Étape 3 ; seul
      // main.jsx empêchait qu'il mène quelque part).
      await page.locator('nav[aria-label="breadcrumb"]').getByRole("link", { name: "Accueil" }).click();
      await expect(page.getByRole("button", { name: "Essayer gratuitement" }).first()).toBeVisible();
      expect(new URL(page.url()).pathname).toBe("/");

      // Retour vers la plateforme pour la suite du parcours (toujours par
      // clic, jamais par goto).
      await page.getByRole("navigation").getByRole("button", { name: "Commencer" }).click();
      await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();

      await page.getByRole("link", { name: "Mon compte" }).click();
      await expect(page.getByRole("heading", { name: "Mon compte" })).toBeVisible();

      await page.getByRole("button", { name: "Se déconnecter" }).click();
      await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    }
  );

  test("écran de connexion -> logo -> vraie page d'accueil (pas un cul-de-sac dans l'autre sens)", async ({
    page,
  }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    // Logo officiel (12/10/2026) : une image, plus du texte -- voir Brand.jsx.
    await page.getByAltText("Orionis Academy").click();
    await expect(page.getByRole("button", { name: "Essayer gratuitement" }).first()).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("bouton suivant du navigateur après un retour ramène en avant", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("button", { name: "Commencer" }).click();
    await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole("button", { name: "Essayer gratuitement" }).first()).toBeVisible();

    await page.goForward();
    await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
  });

  test("rafraîchir une URL profonde atteinte par clic ne casse rien", async ({ page }) => {
    const email = uniqueEmail();
    await page.goto("/app");
    await page.getByRole("button", { name: "Pas encore de compte ? Créer un compte" }).click();
    await registerByClicking(page, email);
    await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();

    await page.getByRole("link", { name: "Mon compte" }).click();
    await expect(page.getByRole("heading", { name: "Mon compte" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Mon compte" })).toBeVisible();
  });

  test("une sous-route inconnue sous /app affiche « introuvable », jamais le catalogue en silence", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/app");
    await page.getByRole("button", { name: "Pas encore de compte ? Créer un compte" }).click();
    await registerByClicking(page, email);
    await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();

    // Simule un lien cassé/une faute de frappe -- jamais atteint par un
    // clic réel, donc goto() est légitime ici.
    await page.goto("/app/nimportequoi");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Formations" })).not.toBeVisible();
  });

  test("une URL totalement inconnue affiche « introuvable », avec un retour qui fonctionne", async ({ page }) => {
    // Personne ne clique vers une URL qui n'existe pas -- goto() est le
    // comportement réel ici (faute de frappe, lien mort externe).
    await page.goto("/xyz-ne-existe-pas");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();

    await page.getByRole("link", { name: "Retour à l'accueil" }).click();
    await expect(page.getByRole("button", { name: "Essayer gratuitement" }).first()).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("un lien profond collé dans un onglet neuf fonctionne sans navigation préalable", async ({ page }) => {
    // Simule un visiteur qui reçoit un lien direct ou l'a mis en favori --
    // aucune navigation en amont dans ce test, goto() est la seule façon
    // honnête de le reproduire.
    await page.goto("/app/compte");
    // Pas de session : la page protégée doit montrer la connexion, jamais
    // une page vide ni une erreur.
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});
