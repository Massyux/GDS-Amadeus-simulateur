import { useState } from "react";
import { Button, Field, Card, PlatformLayout } from "./ui/index.js";
import { authApi } from "./api.js";
import { TerminalDemo } from "./TerminalDemo.jsx";
import { useTheme } from "./useTheme.js";
import { ThemeToggle } from "./ThemeToggle.jsx";

/**
 * Connexion / inscription / mot de passe oublié (docs/MAQUETTES.md §2 :
 * "Pas de barre de navigation ici" -- PlatformLayout sans `nav` ne rend que
 * la marque). Terminal de démonstration très atténué en fond de page --
 * décoratif, `aria-hidden`, jamais lu par un lecteur d'écran. Réponses
 * anti-énumération du backend affichées telles quelles -- jamais de logique
 * côté client qui tenterait de deviner "compte existant ou pas".
 */
export default function AuthScreen({ t, onAuthenticated, initialMode = "login" }) {
  const [theme, toggleTheme] = useTheme();
  const [mode, setMode] = useState(initialMode); // "login" | "register" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const tp = t.platform.auth;

  async function handleLogin(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const { data } = await authApi.login(email, password);
    setSubmitting(false);
    if (!data.ok) {
      setError(data.error || t.platform.errors.genericRetry);
      return;
    }
    const me = await authApi.me();
    onAuthenticated(me.data.user, me.data.csrfToken);
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const { data } = await authApi.register(email, password, firstName, lastName);
    setSubmitting(false);
    if (!data.ok) {
      setError(data.error || t.platform.errors.genericRetry);
      return;
    }
    const me = await authApi.me();
    if (me.data.user) {
      onAuthenticated(me.data.user, me.data.csrfToken);
    } else {
      // Anti-énumération : une collision sur un e-mail déjà pris renvoie la
      // même forme {ok:true} mais ne crée aucune session
      // (functions/api/auth/register.js) -- la réponse HTTP reste donc
      // identique dans les deux cas, rien n'est révélé à un script qui ne
      // regarderait que /register. Mais une bascule muette vers "connexion",
      // sans un mot, laissait une vraie personne devant un écran changé sans
      // explication (bug trouvé en production le 11/10/2026) : message
      // conditionnel, qui ne révèle toujours rien ("si un compte existe
      // déjà..."), au lieu du silence.
      setMode("login");
      setError(tp.possibleExistingAccount);
    }
  }

  async function handleForgot(event) {
    event.preventDefault();
    setSubmitting(true);
    await authApi.forgotPassword(email);
    setSubmitting(false);
    setForgotSent(true);
  }

  return (
    <PlatformLayout
      menuLabels={{ open: t.platform.nav.openMenu, close: t.platform.nav.closeMenu }}
      nav={<ThemeToggle theme={theme} onToggle={toggleTheme} label={t.platform.nav.toggleTheme} />}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.08,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div style={{ width: "min(640px, 90vw)" }}>
          <TerminalDemo label="" />
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, paddingTop: "var(--space-8)" }}>
        <Card style={{ maxWidth: "420px", margin: "0 auto" }}>
          {mode === "forgot" ? (
            <form onSubmit={handleForgot}>
              <h1 style={{ fontSize: "var(--text-xl)" }}>{tp.forgotTitle}</h1>
              {forgotSent ? (
                <p>{tp.forgotEmailSent}</p>
              ) : (
                <>
                  <Field label={tp.email} type="email" value={email} required
                    onChange={(e) => setEmail(e.target.value)} />
                  <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-3)" }}>
                    <Button variant="primary" type="submit" disabled={submitting}>
                      {tp.forgotSubmit}
                    </Button>
                  </div>
                </>
              )}
              <Button variant="discreet" type="button" onClick={() => { setMode("login"); setForgotSent(false); }} style={{ marginTop: "var(--space-3)" }}>
                {tp.forgotBack}
              </Button>
            </form>
          ) : (
            <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
              <h1 style={{ fontSize: "var(--text-xl)" }}>
                {mode === "login" ? tp.loginTitle : tp.registerTitle}
              </h1>
              {mode === "register" && (
                <>
                  <Field label={tp.firstName} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  <Field label={tp.lastName} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </>
              )}
              <Field label={tp.email} type="email" value={email} required
                onChange={(e) => setEmail(e.target.value)} />
              <Field label={tp.password} type="password" value={password} required
                error={error || undefined}
                onChange={(e) => setPassword(e.target.value)} />
              <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-3)" }}>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {mode === "login" ? tp.loginSubmit : tp.registerSubmit}
                </Button>
              </div>
              {mode === "login" && (
                <Button variant="discreet" type="button" onClick={() => setMode("forgot")} style={{ marginTop: "var(--space-3)" }}>
                  {tp.forgotLink}
                </Button>
              )}
              <div>
                <Button
                  variant="discreet"
                  type="button"
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                >
                  {mode === "login" ? tp.toggleToRegister : tp.toggleToLogin}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </PlatformLayout>
  );
}
