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
    feedback: {
      label: "Feedback",
      title: "Envoyer un retour",
    },
    quickStart: {
      trigger: "?",
      triggerLabel: "Guide de démarrage rapide",
      title: "Guide de démarrage rapide",
      close: "Fermer",
      print: "Imprimer",
      basicsTitle: "Commandes de base",
      basics: [
        ["AN", "Disponibilité (ex: AN15DECALGPAR)"],
        ["SS", "Vendre un vol depuis la disponibilité (ex: SS1Y1)"],
        ["NM", "Ajouter le passager (ex: NM1DOE/JOHN MR)"],
        ["AP", "Ajouter un contact (ex: AP1234567890)"],
        ["RF", "Signature de l'agent (ex: RFMM)"],
        ["ER", "Enregistrer le dossier (record locator)"],
        ["RT", "Réafficher le dossier actif"],
        ["HELP", "Liste complète des commandes"],
      ],
      sequenceTitle: "Séquence complète d'une réservation",
      sequence: [
        "AN15DECALGPAR",
        "SS1Y1",
        "NM1DOE/JOHN MR",
        "AP1234567890",
        "RFMM",
        "ER",
      ],
      note:
        "Le terminal reste en anglais, fidèle au vrai Amadeus Selling Platform : seules cette page et l'écran d'accueil sont traduites.",
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
    feedback: {
      label: "Feedback",
      title: "Send feedback",
    },
    quickStart: {
      trigger: "?",
      triggerLabel: "Quick start guide",
      title: "Quick start guide",
      close: "Close",
      print: "Print",
      basicsTitle: "Basic commands",
      basics: [
        ["AN", "Availability (ex: AN15DECALGPAR)"],
        ["SS", "Sell a flight from the availability (ex: SS1Y1)"],
        ["NM", "Add the passenger (ex: NM1DOE/JOHN MR)"],
        ["AP", "Add a contact (ex: AP1234567890)"],
        ["RF", "Agent signature (ex: RFMM)"],
        ["ER", "Record the PNR (record locator)"],
        ["RT", "Redisplay the active PNR"],
        ["HELP", "Full command list"],
      ],
      sequenceTitle: "Full booking sequence",
      sequence: [
        "AN15DECALGPAR",
        "SS1Y1",
        "NM1DOE/JOHN MR",
        "AP1234567890",
        "RFMM",
        "ER",
      ],
      note:
        "The terminal itself stays in English, faithful to the real Amadeus Selling Platform: only this page and the homepage are translated.",
    },
    lang: { fr: "FR", en: "EN" },
  },
};
