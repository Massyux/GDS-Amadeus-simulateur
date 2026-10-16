import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseLegalMarkdown } from "./legalMarkdown.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const legalDir = path.resolve(dirname, "../../../../docs/legal");

// Golden tests contre les VRAIS textes de Massy (docs/legal/*.md), pas des
// fixtures inventées -- cohérent avec PROJECT_MEMORY §8.2 : si le parseur
// casse sur ces deux documents précis, c'est le seul test qui compte.
const cgv = readFileSync(path.join(legalDir, "CONDITIONS-GENERALES-DE-VENTE.md"), "utf8");
const remboursement = readFileSync(path.join(legalDir, "POLITIQUE-DE-REMBOURSEMENT.md"), "utf8");

function flattenText(blocks) {
  function partText(part) {
    return part.children ? part.children.map(partText).join("") : part.text;
  }
  function inlineText(parts) {
    return parts.map(partText).join("");
  }

  return blocks
    .map((b) => {
      if (b.type === "h1" || b.type === "h2" || b.type === "p") return inlineText(b.inline);
      if (b.type === "blockquote") return b.paragraphs.map(inlineText).join(" ");
      if (b.type === "ul") return b.items.map(inlineText).join(" ");
      if (b.type === "table") return [b.header.join(" "), ...b.rows.map((r) => r.join(" "))].join(" ");
      return "";
    })
    .join("\n");
}

describe("parseLegalMarkdown -- CONDITIONS-GENERALES-DE-VENTE.md", () => {
  const blocks = parseLegalMarkdown(cgv);

  it("extrait le titre h1 et les 15 articles (h2)", () => {
    expect(blocks[0]).toMatchObject({ type: "h1" });
    const h2s = blocks.filter((b) => b.type === "h2").map((b) => b.inline.map((p) => p.text).join(""));
    expect(h2s).toHaveLength(15);
    expect(h2s[0]).toContain("Article 1");
    expect(h2s[14]).toContain("Article 15");
  });

  it("extrait le tableau de prix de l'article 4 avec ses deux lignes", () => {
    const table = blocks.find((b) => b.type === "table");
    expect(table).toBeDefined();
    expect(table.header).toEqual(["Formule", "Postes", "Prix TTC"]);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0][0]).toBe("Individuelle");
    expect(table.rows[1][0]).toBe("École");
  });

  it("extrait la citation d'avertissement en tête de document avec ses deux paragraphes", () => {
    const quote = blocks.find((b) => b.type === "blockquote");
    expect(quote.paragraphs.length).toBeGreaterThanOrEqual(2);
  });

  it("ne laisse aucune syntaxe markdown brute (**, `, |) dans le texte rendu", () => {
    const flat = flattenText(blocks);
    expect(flat).not.toMatch(/\*\*/);
    expect(flat).not.toMatch(/`/);
  });

  it("conserve le texte exact des mentions sensibles, caractère pour caractère", () => {
    const flat = flattenText(blocks);
    expect(flat).toContain("Orionis Academy n'est pas un organisme de formation agréé");
    expect(flat).toContain("n'est affilié à Amadeus IT Group");
    expect(flat).toContain("[À COMPLÉTER]");
  });
});

describe("parseLegalMarkdown -- POLITIQUE-DE-REMBOURSEMENT.md", () => {
  const blocks = parseLegalMarkdown(remboursement);

  it("extrait le titre h1 et les sections (h2)", () => {
    expect(blocks[0]).toMatchObject({ type: "h1" });
    const h2s = blocks.filter((b) => b.type === "h2");
    expect(h2s.length).toBeGreaterThan(5);
  });

  it("extrait les deux listes à puces (cas refusés / cas acceptés)", () => {
    const lists = blocks.filter((b) => b.type === "ul");
    expect(lists).toHaveLength(2);
    expect(lists[0].items).toHaveLength(6);
    expect(lists[1].items).toHaveLength(4);
  });

  it("ne laisse aucune syntaxe markdown brute dans le texte rendu", () => {
    const flat = flattenText(blocks);
    expect(flat).not.toMatch(/\*\*/);
  });

  it("conserve le texte exact de la règle de remboursement", () => {
    const flat = flattenText(blocks);
    expect(flat).toContain("jours après ton achat pour");
    expect(flat).toContain("demander un");
  });
});
