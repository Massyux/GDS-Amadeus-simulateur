// Attestation de fin de parcours (Mission 23 Étape 5, missions/MISSION-23.md).
//
// Générée à la demande, jamais stockée (ni en D1, ni sur R2) : un PDF est
// construit en mémoire à chaque appel et renvoyé directement dans la
// réponse HTTP -- voir functions/api/courses/[slug]/certificate.js. Aucun
// service tiers n'intervient : pdf-lib construit le fichier binaire
// entièrement dans ce Worker, le nom de l'étudiant ne quitte jamais
// Cloudflare.
//
// "Elle n'a aucune valeur officielle" doit être écrit SUR le document
// lui-même (demande explicite, pas seulement dans l'interface) -- c'est la
// ligne de mention légale ci-dessous, jamais retirée ni raccourcie.
//
// Cohérent avec docs/DESIGN-SYSTEM.md : palette "Nuit & aube" (--night,
// --cyan, --coral, --ink), Helvetica/Courier comme équivalents PDF des
// polices système (--font-sans/--font-mono -- aucune police système réelle
// n'est chargeable depuis un Worker, les 14 polices standard du PDF sont
// le seul choix sans fichier à embarquer).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const NIGHT = rgb(0x07 / 255, 0x0b / 255, 0x16 / 255);
const INK = rgb(0xf2 / 255, 0xf6 / 255, 0xff / 255);
const INK_2 = rgb(0xa8 / 255, 0xb6 / 255, 0xd4 / 255);
const INK_3 = rgb(0x6b / 255, 0x7a / 255, 0x9c / 255);
const CYAN = rgb(0x22 / 255, 0xd3 / 255, 0xee / 255);
const CORAL = rgb(0xff / 255, 0x8a / 255, 0x5b / 255);

const PAGE_WIDTH = 842; // A4 paysage, points (1pt = 1/72")
const PAGE_HEIGHT = 595;

const TEXTS = {
  fr: {
    title: "Attestation de suivi",
    awardedTo: "décernée à",
    forCompleting: "pour avoir suivi l'intégralité de la formation",
    obtainedOn: (date) => `Obtenue le ${date}`,
    disclaimer: [
      "Cette attestation confirme la réalisation des leçons de cette formation sur Orionis Academy.",
      "Elle n'a AUCUNE VALEUR OFFICIELLE ni reconnaissance professionnelle : Orionis Academy n'est ni",
      "un organisme de formation certifié ni un organisme certificateur.",
    ],
  },
  en: {
    title: "Certificate of Completion",
    awardedTo: "awarded to",
    forCompleting: "for completing this entire course",
    obtainedOn: (date) => `Obtained on ${date}`,
    disclaimer: [
      "This certificate confirms completion of this course's lessons on Orionis Academy.",
      "It has NO OFFICIAL VALUE and carries no professional recognition: Orionis Academy is neither",
      "an accredited training provider nor a certifying body.",
    ],
  },
};

function centerX(font, text, size) {
  return (PAGE_WIDTH - font.widthOfTextAtSize(text, size)) / 2;
}

function formatDate(isoString, lang) {
  const locale = lang === "en" ? "en-US" : "fr-FR";
  return new Date(isoString).toLocaleDateString(locale, { dateStyle: "long" });
}

/**
 * @param {{ studentName: string, courseTitle: string, completedAtIso: string, lang?: "fr" | "en" }} params
 * @returns {Promise<Uint8Array>}
 */
export async function generateCertificatePdf({ studentName, courseTitle, completedAtIso, lang = "fr" }) {
  const t = TEXTS[lang] ?? TEXTS.fr;

  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: NIGHT });
  page.drawRectangle({
    x: 28,
    y: 28,
    width: PAGE_WIDTH - 56,
    height: PAGE_HEIGHT - 56,
    borderColor: CYAN,
    borderWidth: 1.5,
  });

  const titleSize = 30;
  page.drawText(t.title, {
    x: centerX(sansBold, t.title, titleSize),
    y: 460,
    size: titleSize,
    font: sansBold,
    color: INK,
  });

  const awardedSize = 14;
  page.drawText(t.awardedTo, {
    x: centerX(sans, t.awardedTo, awardedSize),
    y: 400,
    size: awardedSize,
    font: sans,
    color: INK_2,
  });

  const nameSize = 34;
  page.drawText(studentName, {
    x: centerX(sansBold, studentName, nameSize),
    y: 345,
    size: nameSize,
    font: sansBold,
    color: CORAL,
  });

  const forSize = 14;
  page.drawText(t.forCompleting, {
    x: centerX(sans, t.forCompleting, forSize),
    y: 300,
    size: forSize,
    font: sans,
    color: INK_2,
  });

  const courseSize = 22;
  page.drawText(courseTitle, {
    x: centerX(sansBold, courseTitle, courseSize),
    y: 255,
    size: courseSize,
    font: sansBold,
    color: CYAN,
  });

  const dateLabel = t.obtainedOn(formatDate(completedAtIso, lang));
  const dateSize = 12;
  page.drawText(dateLabel, {
    x: centerX(mono, dateLabel, dateSize),
    y: 200,
    size: dateSize,
    font: mono,
    color: INK_3,
  });

  const brand = "Orionis Academy";
  const brandSize = 16;
  page.drawText(brand, {
    x: centerX(sansBold, brand, brandSize),
    y: 110,
    size: brandSize,
    font: sansBold,
    color: INK,
  });

  const disclaimerSize = 9;
  let disclaimerY = 80;
  for (const line of t.disclaimer) {
    page.drawText(line, {
      x: centerX(sans, line, disclaimerSize),
      y: disclaimerY,
      size: disclaimerSize,
      font: sans,
      color: INK_3,
    });
    disclaimerY -= 13;
  }

  return doc.save();
}
