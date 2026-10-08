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
  // Ce fichier enregistre plusieurs comptes (1 par test) contre
  // /api/auth/register, qui partage un seul compteur de rate-limit
  // (5/15min) pour toute l'"IP" factice locale (functions/_lib/rateLimit.js)
  // -- et ce compteur vit dans le D1 persisté sur disque, donc survit à
  // chaque relance de `npm run test:e2e` dans la même fenêtre de 15 minutes
  // (playwright.config.js réutilise même le process serveur existant,
  // `reuseExistingServer`). Sans ce reset, quelques exécutions rapprochées
  // de ce fichier pendant une session de dev suffisent à épuiser le quota
  // et à faire échouer l'inscription pour de vrai -- constaté en Étape 3.
  await fetch(`${baseURL}/api/dev/reset-rate-limits`, { method: "POST" });
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
    await expect(page.getByText("1 / 16")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continuer" })).toBeVisible();

    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();

    await page.goto("/app/compte");
    await expect(page.getByText("1 / 16")).toBeVisible();
  });

  test("a logged-out visit to any /app/* path shows the auth screen, never the content", async ({
    page,
  }) => {
    await page.goto("/app/compte");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});

// Mission 23 Étape 3: navigation (fil d'Ariane, retour à l'accueil par la
// marque, bouton précédent du navigateur) + intégration réelle du
// simulateur dans une leçon. La contrainte la plus stricte de cette étape --
// "le terminal doit rester strictement identique au mode libre" -- est
// vérifiée ici structurellement : le vrai .terminal (apps/web/src/Terminal.jsx)
// ne doit JAMAIS se retrouver sous .platform-root (sinon il hériterait des
// couleurs/polices de platform.css, voir LessonSimulatorView.jsx).
test.describe("Navigation et simulateur intégré (Mission 23 Étape 3)", () => {
  test("breadcrumb, explicit back links, and the browser back button all work", async ({ page }) => {
    const email = uniqueEmail();
    await page.goto("/app");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Pas encore de compte ? Créer un compte" }).click();
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();

    await page.getByText("Amadeus — Niveau 1").click();
    await expect(page.getByRole("heading", { name: "Amadeus — Niveau 1" })).toBeVisible();

    const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
    await expect(breadcrumb.getByRole("link", { name: "Accueil" })).toBeVisible();
    await expect(breadcrumb.getByRole("link", { name: "Formations" })).toBeVisible();
    await expect(breadcrumb.getByText("Amadeus — Niveau 1")).toBeVisible();

    await page.getByRole("button", { name: "S'inscrire" }).click();
    await page.getByRole("link", { name: "Bienvenue" }).click();
    await expect(page.getByText("Ceci est une leçon de démonstration")).toBeVisible();
    // Le fil d'Ariane d'une leçon va jusqu'à son propre titre.
    await expect(breadcrumb.getByText("Bienvenue")).toBeVisible();

    // Bouton précédent du navigateur : leçon -> formation, sans état cassé.
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Amadeus — Niveau 1" })).toBeVisible();

    // Le nom du produit ramène au catalogue pour un visiteur connecté.
    await page.getByText("Orionis Academy").click();
    await expect(page.getByRole("heading", { name: "Formations" })).toBeVisible();
  });

  test("an exercice lesson runs the real terminal (not nested under .platform-root) and reports completion", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/app");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Pas encore de compte ? Créer un compte" }).click();
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await page.getByText("Amadeus — Niveau 1").click();
    await page.getByRole("button", { name: "S'inscrire" }).click();

    await page.getByRole("link", { name: "Lire une disponibilité" }).click();
    await expect(page.getByRole("button", { name: "Commencer l'exercice" })).toBeVisible();
    await page.getByRole("button", { name: "Commencer l'exercice" }).click();

    await expect(page.getByText("AMADEUS SELLING PLATFORM")).toBeVisible();
    await expect(page.locator(".platform-root .terminal")).toHaveCount(0);
    await expect(page.locator(".terminal")).toHaveCount(1);

    const input = page.locator(".prompt-input");
    await input.fill("AN26DECALGPAR");
    await input.press("Enter");
    await expect(page.getByText(/AMADEUS AVAILABILITY - AN/)).toBeVisible();
    await input.fill("SS2Y1");
    await input.press("Enter");

    await page.getByRole("button", { name: "Vérifier" }).click();
    await expect(page.getByText("Exercice réussi")).toBeVisible();

    // Le résultat est une modale (fond plein écran) : le bouton de sortie
    // réellement cliquable est celui de la modale, pas celui de la barre
    // d'outils qu'elle recouvre -- les deux portent le même libellé "Retour
    // à la leçon" (ExercisePanel.jsx, `backToHomeLabel`/`abandonLabel`).
    await page.getByRole("dialog").getByRole("button", { name: "Retour à la leçon" }).click();
    await expect(page.getByRole("button", { name: "Commencer l'exercice" })).toBeVisible();
    await expect(page.locator(".terminal")).toHaveCount(0);
  });

  test("a simulateur lesson opens the free terminal full-screen with an explicit exit", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/app");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Pas encore de compte ? Créer un compte" }).click();
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("un-mot-de-passe-bien-trop-simple-a-deviner");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await page.getByText("Amadeus — Niveau 1").click();
    await page.getByRole("button", { name: "S'inscrire" }).click();

    await page.getByRole("link", { name: "Terminal libre" }).click();
    await expect(page.getByRole("button", { name: "Ouvrir le terminal" })).toBeVisible();
    await page.getByRole("button", { name: "Ouvrir le terminal" }).click();

    await expect(page.getByText("AMADEUS SELLING PLATFORM")).toBeVisible();
    await expect(page.locator(".platform-root .terminal")).toHaveCount(0);

    await page.getByRole("button", { name: "Retour à la leçon" }).click();
    await expect(page.getByRole("button", { name: "Ouvrir le terminal" })).toBeVisible();
  });
});
