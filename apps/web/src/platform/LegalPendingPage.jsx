import { Card, PlatformLayout } from "./ui/index.js";
import { useLang } from "../i18n/useLang.js";
import { useTheme } from "./useTheme.js";
import { dictionary } from "../i18n/dictionary.js";

/**
 * Pages légales (PROMPT-PASSE-ACCUEIL.md chantier 3, 14/10/2026) :
 * Conditions de vente et Politique de remboursement pointaient vers
 * `href="#"` en production. Le contenu juridique est à écrire par Massy,
 * jamais par Claude Code -- "un faux texte de loi est pire que l'absence"
 * (demande explicite). Ces pages existent et ont leur route réelle, avec
 * un état d'attente explicite et visible, pas un texte inventé "provisoire".
 *
 * Bloquent Mission 22 (TASKS.md) : on n'encaisse pas un paiement sans
 * conditions de vente ni politique de remboursement publiées.
 *
 * @param {{ page: "terms" | "refund" }} props
 */
export default function LegalPendingPage({ page }) {
  const [lang] = useLang();
  useTheme();
  const t = dictionary[lang];
  const tl = t.platform.legal;
  const title = page === "refund" ? tl.refundTitle : tl.termsTitle;

  return (
    <PlatformLayout brandTo="/">
      <Card style={{ maxWidth: "640px", margin: "var(--space-8) auto" }}>
        <h1 style={{ fontSize: "var(--text-xl)" }}>{title}</h1>
        <p style={{ color: "var(--ink-2)", marginTop: "var(--space-3)" }}>{tl.pendingTitle}</p>
        <p style={{ color: "var(--ink-2)", marginTop: "var(--space-2)" }}>{tl.pendingBody}</p>
      </Card>
    </PlatformLayout>
  );
}
