import { parseLegalMarkdown } from "./legalMarkdown.js";

function Inline({ parts }) {
  return parts.map((part) => {
    if (part.bold && part.children) return <b key={part.key}><Inline parts={part.children} /></b>;
    if (part.bold) return <b key={part.key}>{part.text}</b>;
    if (part.code)
      return (
        <code
          key={part.key}
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.92em", color: "var(--ink)" }}
        >
          {part.text}
        </code>
      );
    return part.text;
  });
}

/**
 * Rend les blocs produits par `parseLegalMarkdown` avec les jetons du design
 * system (apps/web/src/platform/styles/platform.css) -- pas de nouvelle
 * classe globale, mêmes styles en ligne que `LegalPendingPage.jsx` utilisait
 * déjà avant cette intégration.
 *
 * Nom distinct de `markdownLite.jsx` (pré-existant, rendu des leçons de type
 * texte, volontairement minimal) : les deux textes juridiques utilisent des
 * tableaux, citations multi-paragraphes, listes et gras que ce dernier ne
 * gère pas et n'a pas vocation à gérer -- deux besoins différents, pas une
 * duplication à fusionner.
 *
 * @param {{ markdown: string }} props
 */
export function LegalMarkdown({ markdown }) {
  const blocks = parseLegalMarkdown(markdown);

  return (
    <div style={{ color: "var(--ink)" }}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return (
              <h1 key={idx} style={{ fontSize: "var(--text-xl)", marginTop: idx === 0 ? 0 : "var(--space-7)" }}>
                <Inline parts={block.inline} />
              </h1>
            );
          case "h2":
            return (
              <h2
                key={idx}
                style={{
                  fontSize: "var(--text-lg)",
                  marginTop: "var(--space-7)",
                  marginBottom: "var(--space-3)",
                  color: "var(--ink)",
                }}
              >
                <Inline parts={block.inline} />
              </h2>
            );
          case "p":
            return (
              <p key={idx} style={{ color: "var(--ink-2)", marginTop: "var(--space-3)", lineHeight: 1.6 }}>
                <Inline parts={block.inline} />
              </p>
            );
          case "blockquote":
            return (
              <div
                key={idx}
                style={{
                  marginTop: "var(--space-4)",
                  padding: "var(--space-4) var(--space-5)",
                  borderLeft: "3px solid var(--cyan)",
                  background: "var(--cyan-subtle)",
                  borderRadius: "4px",
                }}
              >
                {block.paragraphs.map((p, pIdx) => (
                  <p
                    key={pIdx}
                    style={{
                      color: "var(--ink-2)",
                      margin: pIdx === 0 ? 0 : "var(--space-2) 0 0",
                      lineHeight: 1.6,
                    }}
                  >
                    <Inline parts={p} />
                  </p>
                ))}
              </div>
            );
          case "ul":
            return (
              <ul key={idx} style={{ marginTop: "var(--space-3)", paddingLeft: "var(--space-5)", color: "var(--ink-2)" }}>
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} style={{ marginTop: iIdx === 0 ? 0 : "var(--space-1)", lineHeight: 1.6 }}>
                    <Inline parts={item} />
                  </li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={idx} style={{ marginTop: "var(--space-4)", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {block.header.map((cell, cIdx) => (
                        <th
                          key={cIdx}
                          style={{
                            textAlign: "left",
                            padding: "var(--space-2) var(--space-3)",
                            borderBottom: "2px solid var(--cyan)",
                            color: "var(--ink)",
                          }}
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: "var(--space-2) var(--space-3)",
                              borderBottom: "1px solid var(--cyan-subtle)",
                              color: "var(--ink-2)",
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "hr":
            return (
              <hr
                key={idx}
                style={{ marginTop: "var(--space-6)", marginBottom: "var(--space-6)", border: "none", borderTop: "1px solid var(--cyan-subtle)" }}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
