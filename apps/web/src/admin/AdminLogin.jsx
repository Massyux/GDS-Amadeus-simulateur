import { useState } from "react";
import { pickBrandLogo } from "../brandLogo.js";

// /admin n'a pas de bascule de thème (fond clair fixe, #dde5f4,
// apps/web/src/index.css) -- thème "light" fixé en dur, jamais lu depuis
// une préférence partagée avec la plateforme publique (voir brandLogo.js :
// c'est la même fonction de sélection que Brand.jsx, mais avec un thème
// toujours identique au fond réel de cette page).
const ADMIN_LOGO = pickBrandLogo("light", 40);

export default function AdminLogin({ onLoggedIn }) {
  const [secret, setSecret] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setChecking(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret: secret.trim() }),
      });
      const data = await res.json();
      if (data.valid && data.token) {
        onLoggedIn(data.token);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <img
          src={ADMIN_LOGO.src}
          alt="Orionis Academy"
          width={Math.round(40 * ADMIN_LOGO.ratio)}
          height={40}
          className="admin-logo"
        />
        <h1 className="admin-login-title">Administration</h1>
        <label className="admin-login-label" htmlFor="admin-secret">
          Phrase secrète
        </label>
        <input
          id="admin-secret"
          className="admin-login-input"
          type="password"
          autoFocus
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
        />
        <button className="admin-login-submit" type="submit" disabled={checking || !secret}>
          {checking ? "Vérification…" : "Se connecter"}
        </button>
        {error && (
          <p className="admin-login-error" role="alert">
            Phrase secrète invalide.
          </p>
        )}
      </form>
    </div>
  );
}
