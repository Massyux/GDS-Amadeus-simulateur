// Lightweight FR/EN dictionary for the marketing/access "envelope" only.
// The terminal itself stays in English/Amadeus-authentic wording (decision
// confirmed with Massy 05/07/2026) — nothing here touches Terminal.jsx.

export const dictionary = {
  fr: {
    onboarding: {
      title: "Simulateur Amadeus GDS",
      valueProp:
        "Apprenez à réserver comme un vrai agent de voyages : un terminal GDS fidèle à Amadeus Selling Platform — mêmes commandes, mêmes séquences, mêmes messages d'erreur — pour se former sans risque, hors ligne.",
      audience:
        "Conçu pour les étudiants et les écoles de tourisme qui préparent une certification ou un métier en agence de voyages.",
      previewLabel: "Aperçu du terminal",
      ctaHaveKey: "J'ai une clé d'accès",
      ctaRequestAccess: "Demander un accès",
      disclaimer:
        "Projet indépendant à but pédagogique, non affilié à Amadeus IT Group.",
    },
    accessGate: {
      title: "Accès au simulateur",
      tagline: "Saisissez votre clé d'accès pour entrer dans le terminal.",
      inputLabel: "Clé d'accès",
      placeholder: "GDS-XXXX-XXXX",
      submit: "Valider",
      checking: "Vérification…",
      invalid: "Clé invalide.",
      back: "Retour",
    },
    lang: { fr: "FR", en: "EN" },
  },
  en: {
    onboarding: {
      title: "Amadeus GDS Simulator",
      valueProp:
        "Learn to book like a real travel agent: a GDS terminal faithful to Amadeus Selling Platform — the same commands, sequences, and error messages — for risk-free, offline training.",
      audience:
        "Built for tourism students and schools preparing a certification or a travel agency career.",
      previewLabel: "Terminal preview",
      ctaHaveKey: "I have an access key",
      ctaRequestAccess: "Request access",
      disclaimer:
        "Independent educational project, not affiliated with Amadeus IT Group.",
    },
    accessGate: {
      title: "Simulator access",
      tagline: "Enter your access key to open the terminal.",
      inputLabel: "Access key",
      placeholder: "GDS-XXXX-XXXX",
      submit: "Continue",
      checking: "Checking…",
      invalid: "Invalid key.",
      back: "Back",
    },
    lang: { fr: "FR", en: "EN" },
  },
};
