import { test, expect } from "@playwright/test";

// Constat architecte du 15/10/2026 : sur un navigateur configuré en
// anglais, un visiteur recevait (selon le constat) l'accueil en anglais au
// tout premier rendu. Le marché d'Orionis Academy est l'Algérie et le
// contenu est pensé en français -- un visiteur au téléphone configuré en
// anglais (cas très courant) ne doit jamais recevoir le site en anglais
// sans l'avoir demandé.
//
// Diagnostic (avant correctif, comme demandé) : aucune lecture de
// `navigator.language`/`Accept-Language` n'a été trouvée dans
// `useLang.js` ni ailleurs dans le code -- le défaut était déjà
// inconditionnellement "fr". Confirmé aussi côté serveur (curl avec
// `Accept-Language: en-US` sur la prod -> HTML brut en français,
// `cf-cache-status: DYNAMIC`, aucune négociation de contenu côté edge).
// Ces deux tests restent un garde-fou permanent contre toute régression
// future (ex: un jour quelqu'un ajoute une détection navigator par
// "amélioration" sans relire cette règle).
test.describe("Langue par défaut (constat architecte du 15/10/2026)", () => {
  test.use({ locale: "en-US" });

  test("un navigateur configuré en anglais reçoit quand même l'accueil en français", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.getByText("Apprends un métier,")).toBeVisible();
    await expect(page.getByText("pas seulement une théorie.")).toBeVisible();
    // Et surtout pas l'anglais, pour bien distinguer "français par défaut" de
    // "les deux textes sont visibles" (impossible ici, mais explicite).
    await expect(page.getByText("Learn a trade,")).toHaveCount(0);
  });

  test("le choix explicite de l'anglais est respecté et mémorisé après rechargement", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByText("Learn a trade,")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.reload();
    await expect(page.getByText("Learn a trade,")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
