import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  Button,
  Field,
  Card,
  Badge,
  ProgressBar,
  EmptyState,
  Skeleton,
  PlatformLayout,
} from "./index.js";

describe("Button", () => {
  it("fires onClick immediately for non-danger variants", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Valider</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("requires a second click before firing a danger button with confirmLabel", () => {
    const onClick = vi.fn();
    render(
      <Button variant="danger" confirmLabel="Confirmer ?" onClick={onClick}>
        Supprimer
      </Button>
    );
    const btn = screen.getByRole("button", { name: "Supprimer" });
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirmer ?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmer ?" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("fires immediately for a danger button without confirmLabel", () => {
    const onClick = vi.fn();
    render(
      <Button variant="danger" onClick={onClick}>
        Annuler
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled button does not fire onClick", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Désactivé
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: "Désactivé" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Field", () => {
  it("associates a real label with the input", () => {
    render(<Field label="Adresse e-mail" />);
    expect(screen.getByLabelText("Adresse e-mail")).toBeTruthy();
  });

  it("shows an error message describing what to do, wired via aria-describedby", () => {
    render(<Field label="Mot de passe" error="Le mot de passe doit faire au moins 8 caractères." />);
    const input = screen.getByLabelText("Mot de passe");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const error = screen.getByRole("alert");
    expect(error.textContent).toMatch(/au moins 8 caractères/);
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
  });

  it("shows a hint when there is no error", () => {
    render(<Field label="Pseudo" hint="Visible par les autres étudiants." />);
    expect(screen.getByText("Visible par les autres étudiants.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Badge", () => {
  it("defaults to the accent tone with no extra class", () => {
    render(<Badge>Amadeus</Badge>);
    expect(screen.getByText("Amadeus").className).toBe("pf-badge");
  });

  it("applies a tone class for non-default tones", () => {
    render(<Badge tone="danger">Révoquée</Badge>);
    expect(screen.getByText("Révoquée").className).toBe("pf-badge pf-badge--danger");
  });
});

describe("ProgressBar", () => {
  it("exposes progress via ARIA and always renders a text label", () => {
    render(<ProgressBar value={7} max={12} label="7 / 12 leçons" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("7");
    expect(bar.getAttribute("aria-valuemax")).toBe("12");
    expect(screen.getByText("7 / 12 leçons")).toBeTruthy();
  });

  it("clamps the fill between 0 and 1 even for out-of-range values", async () => {
    // Le remplissage part de 0 et rejoint sa valeur réelle via
    // requestAnimationFrame (apparition animée, chantier 4 du 08/10/2026) --
    // il faut laisser la frame passer avant de lire `transform`.
    const { container, rerender } = render(<ProgressBar value={99} max={12} label="trop" />);
    const fill = container.querySelector(".pf-progress-fill");
    await waitFor(() => expect(fill.style.transform).toBe("scaleX(1)"));
    rerender(<ProgressBar value={-5} max={12} label="négatif" />);
    await waitFor(() => expect(fill.style.transform).toBe("scaleX(0)"));
  });
});

describe("EmptyState", () => {
  it("renders the action button only when both actionLabel and onAction are given", () => {
    render(<EmptyState message="Rien ici." />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders and fires the action when provided", () => {
    const onAction = vi.fn();
    render(<EmptyState message="Rien ici." actionLabel="Parcourir" onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Parcourir" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive tech and sized explicitly (anti-CLS)", () => {
    const { container } = render(<Skeleton width="120px" height="20px" />);
    const el = container.firstChild;
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.style.width).toBe("120px");
    expect(el.style.height).toBe("20px");
  });
});

describe("Card", () => {
  it("applies the hoverable class only when requested", () => {
    const { container, rerender } = render(<Card>contenu</Card>);
    expect(container.firstChild.className).toBe("pf-card");
    rerender(<Card hoverable>contenu</Card>);
    expect(container.firstChild.className).toBe("pf-card pf-card--hoverable");
  });
});

describe("PlatformLayout", () => {
  it("renders the brand and toggles the mobile nav without duplicating it when there is no nav", () => {
    render(
      <PlatformLayout>
        <p>Contenu</p>
      </PlatformLayout>
    );
    expect(screen.getByText("Orionis Academy")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /menu/i })).toBeNull();
  });

  it("toggles the mobile nav open/closed when a nav is given", () => {
    render(
      <PlatformLayout nav={<a href="#x">Lien</a>} menuLabels={{ open: "Ouvrir le menu", close: "Fermer le menu" }}>
        <p>Contenu</p>
      </PlatformLayout>
    );
    const toggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(screen.queryByRole("navigation", { name: undefined })).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Fermer le menu" })).toBeTruthy();
  });
});
