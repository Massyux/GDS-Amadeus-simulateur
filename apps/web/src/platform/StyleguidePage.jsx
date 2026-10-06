import { useState } from "react";
import {
  Button,
  Field,
  Card,
  Badge,
  ProgressBar,
  EmptyState,
  Skeleton,
  PlatformLayout,
} from "./ui/index.js";

/**
 * Internal-only page (Mission 23, Étape 0): every platform component in
 * every state, so a future screen can be built by composing what's here
 * rather than inventing new markup/CSS. Not linked from any visitor-facing
 * screen; reached only by typing /styleguide directly (same convention as
 * /admin — see apps/web/src/main.jsx).
 */
export default function StyleguidePage() {
  const [fieldValue, setFieldValue] = useState("");
  const [showEmptyWithAction, setShowEmptyWithAction] = useState(true);

  const nav = (
    <>
      <a href="#boutons" className="pf-btn pf-btn--discreet">
        Boutons
      </a>
      <a href="#champs" className="pf-btn pf-btn--discreet">
        Champs
      </a>
      <a href="#cartes" className="pf-btn pf-btn--discreet">
        Cartes
      </a>
    </>
  );

  return (
    <PlatformLayout logoLabel="Styleguide — interne" nav={nav}>
      <h1 style={{ fontSize: "var(--text-3xl)" }}>Styleguide de la plateforme</h1>
      <p className="pf-field-hint">
        Mission 23, Étape 0. Valeurs figées dans docs/DESIGN-SYSTEM.md — page interne, jamais
        liée depuis l'accueil.
      </p>

      <section id="boutons" style={{ marginTop: "var(--space-6)" }}>
        <h2>Boutons</h2>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary">Primaire</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="discreet">Discret</Button>
          <Button variant="danger" confirmLabel="Confirmer la suppression ?">
            Supprimer
          </Button>
          <Button variant="primary" disabled>
            Primaire désactivé
          </Button>
          <Button variant="primary" compact>
            Primaire compact
          </Button>
        </div>
      </section>

      <section id="champs" style={{ marginTop: "var(--space-6)" }}>
        <h2>Champs de saisie</h2>
        <div style={{ display: "grid", gap: "var(--space-4)", maxWidth: "360px" }}>
          <Field
            label="Adresse e-mail"
            type="email"
            value={fieldValue}
            onChange={(event) => setFieldValue(event.target.value)}
            hint="Utilisée pour te reconnecter."
          />
          <Field
            label="Mot de passe"
            type="password"
            error="Le mot de passe doit faire au moins 8 caractères."
          />
          <Field label="Champ désactivé" value="Valeur fixe" disabled readOnly />
        </div>
      </section>

      <section id="cartes" style={{ marginTop: "var(--space-6)" }}>
        <h2>Cartes, badges, progression</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          <Card hoverable>
            <Badge>Amadeus niveau 1</Badge>
            <h3 style={{ marginTop: "var(--space-3)" }}>Formation Amadeus</h3>
            <ProgressBar value={7} max={12} label="7 / 12 leçons" />
          </Card>
          <Card>
            <Badge tone="warning">En attente</Badge>
            <h3 style={{ marginTop: "var(--space-3)" }}>Session live</h3>
            <ProgressBar value={0} max={12} label="0 / 12 leçons" />
          </Card>
          <Card>
            <Badge tone="info">Nouveau</Badge>
            <h3 style={{ marginTop: "var(--space-3)" }}>Deuxième formation</h3>
            <ProgressBar value={12} max={12} label="12 / 12 leçons" />
          </Card>
          <Card>
            <Badge tone="danger">Révoquée</Badge>
            <h3 style={{ marginTop: "var(--space-3)" }}>Licence expirée</h3>
          </Card>
          <Card>
            <Badge tone="neutral">Brouillon</Badge>
            <h3 style={{ marginTop: "var(--space-3)" }}>Formation non publiée</h3>
          </Card>
        </div>
      </section>

      <section style={{ marginTop: "var(--space-6)" }}>
        <h2>État vide</h2>
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <Card style={{ flex: "1 1 320px" }}>
            {showEmptyWithAction ? (
              <EmptyState
                message="Aucune formation en cours."
                actionLabel="Parcourir le catalogue"
                onAction={() => setShowEmptyWithAction(false)}
              />
            ) : (
              <EmptyState message="Catalogue vide pour l'instant." />
            )}
          </Card>
        </div>
      </section>

      <section style={{ marginTop: "var(--space-6)", marginBottom: "var(--space-8)" }}>
        <h2>Squelette de chargement</h2>
        <Card style={{ maxWidth: "360px", display: "grid", gap: "var(--space-3)" }}>
          <Skeleton height="20px" width="60%" />
          <Skeleton height="14px" />
          <Skeleton height="14px" width="85%" />
          <Skeleton height="6px" radius="var(--radius-sm)" />
        </Card>
      </section>
    </PlatformLayout>
  );
}
