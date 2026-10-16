import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LegalPendingPage from "./LegalPendingPage.jsx";

// L'état par défaut (drapeau à false, "en préparation") est déjà couvert en
// profondeur par apps/web/e2e/legal.spec.js (clic réel en production) --
// pas dupliqué ici. Ce fichier vérifie spécifiquement le chemin "publié"
// (LEGAL_CONTENT_PUBLISHED = true), via un mock du drapeau (hissé par
// vitest au-dessus de l'import ci-dessus), puisque la valeur réelle en
// dépôt reste `false` tant que Massy n'a pas validé les textes (TASKS.md).
vi.mock("./legalContentFlag.js", () => ({ LEGAL_CONTENT_PUBLISHED: true }));

describe("LegalPendingPage -- drapeau LEGAL_CONTENT_PUBLISHED à true", () => {
  it("rend le texte intégral des CGV pour page=\"terms\", sans trace de syntaxe markdown brute", async () => {
    render(<LegalPendingPage page="terms" />);
    expect(await screen.findByRole("heading", { name: "Conditions générales de vente — Orionis Academy" })).toBeTruthy();
    expect(screen.getByText(/Article 1 — Identification du vendeur/)).toBeTruthy();
    expect(screen.getByText(/Dénomination/)).toBeTruthy();
    expect(screen.getByText("Formule")).toBeTruthy(); // en-tête du tableau de prix, article 4
    expect(screen.getByText("École")).toBeTruthy();
    // Cas de gras+code imbriqué (article 1 : "**`.com.dz`**") -- aucun
    // accent grave ne doit fuiter tel quel dans le texte affiché.
    expect(screen.queryByText(/`/)).toBeFalsy();
    expect(screen.getByText(".com.dz")).toBeTruthy();
  });

  it("rend le texte intégral de la politique de remboursement pour page=\"refund\"", async () => {
    render(<LegalPendingPage page="refund" />);
    expect(await screen.findByRole("heading", { name: "Politique de remboursement — Orionis Academy" })).toBeTruthy();
    expect(screen.getByText(/Pourquoi cette page existe/)).toBeTruthy();
    expect(screen.getByText(/Essai gratuit/)).toBeTruthy();
  });
});
