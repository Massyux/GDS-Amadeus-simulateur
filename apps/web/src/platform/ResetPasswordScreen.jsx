import { useState } from "react";
import { Button, Field, Card, PlatformLayout } from "./ui/index.js";
import { authApi } from "./api.js";
import { navigate } from "./useRoute.js";
import { useTheme } from "./useTheme.js";

/**
 * Atteinte via le lien envoyé par e-mail (token en query string) -- Mission
 * 23 Étape 1's forgot-password / reset-password Functions. Pas besoin
 * d'être connecté.
 */
export default function ResetPasswordScreen({ t, token }) {
  useTheme();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const tp = t.platform.auth;

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const { data } = await authApi.resetPassword(token, newPassword);
    setSubmitting(false);
    if (!data.ok) {
      setError(data.error || tp.resetInvalidToken);
      return;
    }
    setSuccess(true);
  }

  return (
    <PlatformLayout>
      <Card style={{ maxWidth: "420px", margin: "var(--space-8) auto 0" }}>
        <h1 style={{ fontSize: "var(--text-xl)" }}>{tp.resetTitle}</h1>
        {success ? (
          <>
            <p>{tp.resetSuccess}</p>
            <Button variant="primary" onClick={() => navigate("/app")}>
              {tp.loginSubmit}
            </Button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field
              label={tp.resetNewPassword}
              type="password"
              value={newPassword}
              required
              error={error || undefined}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button variant="primary" type="submit" disabled={submitting} style={{ marginTop: "var(--space-4)" }}>
              {tp.resetSubmit}
            </Button>
          </form>
        )}
      </Card>
    </PlatformLayout>
  );
}
