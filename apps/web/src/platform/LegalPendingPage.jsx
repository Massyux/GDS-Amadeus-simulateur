import { Card, PlatformLayout } from "./ui/index.js";
import { useLang } from "../i18n/useLang.js";
import { useTheme } from "./useTheme.js";
import { dictionary } from "../i18n/dictionary.js";
import { LegalMarkdown } from "./LegalMarkdown.jsx";
import { LEGAL_CONTENT_PUBLISHED } from "./legalContentFlag.js";
import cgvMarkdown from "../../../../docs/legal/CONDITIONS-GENERALES-DE-VENTE.md?raw";
import remboursementMarkdown from "../../../../docs/legal/POLITIQUE-DE-REMBOURSEMENT.md?raw";

/**
 * Pages légales (PROMPT-PASSE-ACCUEIL.md chantier 3, 14/10/2026 ; contenu
 * intégré le 16/10/2026) : Conditions de vente et Politique de
 * remboursement pointaient vers `href="#"` en production. Le contenu
 * juridique est écrit par Massy, jamais par Claude Code -- textes lus tels
 * quels depuis `docs/legal/*.md` (import `?raw`, jamais retranscrits à la
 * main) pour qu'aucune phrase ne puisse diverger de ce qu'il a rédigé.
 *
 * Ces brouillons ne sont PAS publiables en l'état (mentions obligatoires de
 * l'article 11 de la loi 18-05 manquantes -- registre du commerce,
 * identifiant fiscal, etc. -- et blocs [À COMPLÉTER]/[DÉCISION] non
 * tranchés). D'où `LEGAL_CONTENT_PUBLISHED` (legalContentFlag.js) : tant
 * qu'il est à `false`, le public voit l'état "en préparation" habituel,
 * même si le texte intégral est déjà intégré et prêt à l'affichage --
 * "des CGV affichant [À COMPLÉTER] sont pires qu'une page en préparation"
 * (demande explicite de Massy). Un seul interrupteur à basculer le jour de
 * la publication, voir TASKS.md pour le détail des conditions à remplir
 * avant de le faire.
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

  if (LEGAL_CONTENT_PUBLISHED) {
    const markdown = page === "refund" ? remboursementMarkdown : cgvMarkdown;
    return (
      <PlatformLayout brandTo="/">
        <Card style={{ maxWidth: "76ch", margin: "var(--space-8) auto" }}>
          <LegalMarkdown markdown={markdown} />
        </Card>
      </PlatformLayout>
    );
  }

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
