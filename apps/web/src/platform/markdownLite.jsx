// Rendu "markdown allégé" pour les leçons de type texte -- pas de librairie
// (DESIGN-SYSTEM §7 : "aucune bibliothèque sans justification") et surtout
// pas de dangerouslySetInnerHTML : on construit des éléments React à partir
// du texte, jamais de HTML interprété -- par construction, aucune leçon ne
// peut injecter de script, même via le back-office (Étape 4) le jour où le
// contenu sera modifiable sans relecture de code.
//
// Supporte seulement # / ## / ### et les paragraphes séparés par une ligne
// vide -- suffisant pour une leçon de formation, pas un moteur markdown
// complet.
export function renderMarkdownLite(text) {
  const blocks = String(text || "").split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("### ")) return <h3 key={i}>{trimmed.slice(4)}</h3>;
    if (trimmed.startsWith("## ")) return <h2 key={i}>{trimmed.slice(3)}</h2>;
    if (trimmed.startsWith("# ")) return <h1 key={i}>{trimmed.slice(2)}</h1>;
    return <p key={i}>{trimmed}</p>;
  });
}
