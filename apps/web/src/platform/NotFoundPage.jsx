import { Card, PlatformLayout } from "./ui/index.js";
import { Link } from "./Link.jsx";
import { useLang } from "../i18n/useLang.js";
import { useTheme } from "./useTheme.js";
import { dictionary } from "../i18n/dictionary.js";

/**
 * Page « introuvable » (bug critique du 11/10/2026, régression de
 * navigation : une URL inconnue ne doit jamais rester sur un écran vide ou
 * silencieusement montrer autre chose). Utilisée à deux endroits : en racine
 * par main.jsx pour tout chemin de premier niveau non reconnu (`/xyz`), et
 * par PlatformApp.jsx pour un sous-chemin inconnu sous `/app/*`
 * (`/app/nimportequoi`) -- `t` est alors déjà disponible et passé en prop ;
 * en racine, personne ne le fournit, donc ce composant se gère seul (même
 * convention que ResetPasswordScreen.jsx : pas de nav, écran minimal).
 *
 * @param {{ t?: object }} props
 */
export default function NotFoundPage({ t }) {
  const [selfLang] = useLang();
  useTheme();

  const tnf = (t ?? dictionary[selfLang]).platform.notFound;

  return (
    <PlatformLayout brandTo="/">
      <Card style={{ maxWidth: "480px", margin: "var(--space-8) auto", textAlign: "center" }}>
        <h1 style={{ fontSize: "var(--text-xl)" }}>{tnf.title}</h1>
        <p style={{ color: "var(--ink-2)", marginTop: "var(--space-3)" }}>{tnf.body}</p>
        <Link to="/" className="pf-btn pf-btn--primary pf-btn--md" style={{ marginTop: "var(--space-5)", display: "inline-block" }}>
          {tnf.cta}
        </Link>
      </Card>
    </PlatformLayout>
  );
}
