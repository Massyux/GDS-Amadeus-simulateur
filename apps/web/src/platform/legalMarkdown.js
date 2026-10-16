/**
 * Rendu minimal de markdown -- pour les deux textes juridiques
 * (`docs/legal/*.md`) uniquement. Pas une bibliothèque générale : seul le
 * sous-ensemble réellement utilisé par ces deux documents est géré
 * (titres h1/h2, citations éventuellement multi-paragraphes, listes à
 * puces, tableaux, règle horizontale, gras et code en ligne). Choisi pour
 * éviter une dépendance de rendu markdown pour deux pages statiques --
 * voir LegalPendingPage.jsx : la décision de l'intégrer ou non est un
 * simple drapeau, pas une question de rendu.
 *
 * Nom distinct de `markdownLite.jsx` (pré-existant, rendu minimal des
 * leçons de type texte) -- besoin différent, volontairement pas fusionné.
 *
 * Toujours lire le texte depuis le fichier source (`?raw`) -- jamais
 * retranscrit à la main -- pour qu'aucune phrase ne puisse diverger de ce
 * que Massy a rédigé.
 */

let inlineKey = 0;

// Un seul niveau : repère les spans `code` dans un texte déjà débarrassé du
// gras qui pourrait l'entourer.
function parseCodeSpans(text) {
  const parts = [];
  const re = /`(.+?)`/g;
  let last = 0;
  let match;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push({ key: inlineKey++, text: text.slice(last, match.index) });
    parts.push({ key: inlineKey++, code: true, text: match[1] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ key: inlineKey++, text: text.slice(last) });
  return parts;
}

function parseInline(text) {
  // **gras**, pouvant lui-même contenir un span `code` -- cas réel trouvé
  // dans CGV article 1 : "**`.com.dz`**" (gras ET code imbriqués). D'où un
  // passage `**...**` en premier, puis un second passage `code` à
  // l'intérieur ET à l'extérieur du gras -- rien d'autre n'est utilisé dans
  // les deux documents sources (pas d'italique, pas de liens).
  const parts = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(...parseCodeSpans(text.slice(last, match.index)));
    const inner = parseCodeSpans(match[1]);
    if (inner.length === 1 && !inner[0].code) {
      parts.push({ key: inlineKey++, bold: true, text: inner[0].text });
    } else {
      parts.push({ key: inlineKey++, bold: true, children: inner });
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(...parseCodeSpans(text.slice(last)));
  return parts;
}

function isTableSeparator(line) {
  return /^\|?[\s:-]+\|[\s:|-]+$/.test(line.trim());
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * @param {string} markdown
 * @returns {Array<object>} blocks consommés par <MarkdownLite/>
 */
export function parseLegalMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  function flushParagraph(buf) {
    if (buf.length) blocks.push({ type: "p", inline: parseInline(buf.join(" ").trim()) });
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^#\s+/.test(line)) {
      blocks.push({ type: "h1", inline: parseInline(line.replace(/^#\s+/, "")) });
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      blocks.push({ type: "h2", inline: parseInline(line.replace(/^##\s+/, "")) });
      i++;
      continue;
    }
    if (/^---\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    if (/^>/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      // Paragraphes séparés par une ligne ">" vide à l'intérieur de la citation.
      const paragraphs = [];
      let cur = [];
      for (const l of quoteLines) {
        if (l.trim() === "") {
          if (cur.length) paragraphs.push(cur.join(" ").trim());
          cur = [];
        } else {
          cur.push(l);
        }
      }
      if (cur.length) paragraphs.push(cur.join(" ").trim());
      blocks.push({
        type: "blockquote",
        paragraphs: paragraphs.map((p) => parseInline(p)),
      });
      continue;
    }
    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        let itemLine = lines[i].replace(/^-\s+/, "");
        i++;
        // Les lignes d'un même item qui continuent sans "-" (retour à la ligne
        // dans le markdown source) sont rattachées au même item.
        while (i < lines.length && lines[i].trim() !== "" && !/^-\s+/.test(lines[i]) && !/^#{1,2}\s+/.test(lines[i])) {
          itemLine += " " + lines[i].trim();
          i++;
        }
        items.push(parseInline(itemLine));
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\|/.test(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraphe : accumule les lignes jusqu'à une ligne vide ou un autre bloc.
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,2}\s+/.test(lines[i]) &&
      !/^>/.test(lines[i]) &&
      !/^-\s+/.test(lines[i]) &&
      !/^---\s*$/.test(lines[i]) &&
      !/^\|/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    flushParagraph(buf);
  }

  return blocks;
}
