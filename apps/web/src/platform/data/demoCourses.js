// Catalogue de démonstration pour l'accueil public (Mission 23 Étape 2,
// "reprise direction artistique" du 07/10/2026).
//
// DONNÉES, pas du JSX en dur (demande explicite de Massy) : Massy retirera
// les 5 formations factices au lancement, seule "Réservation aérienne"
// (le vrai cours Amadeus, déjà en base via scripts/seed-dev-course.sql)
// restera. Rien ici ne doit être recopié dans un composant -- toute page
// qui affiche une formation lit cette liste (ou l'API, pour la vraie
// formation) et jamais un nom en dur.
//
// `visual` sélectionne l'illustration SVG (CourseVignette.jsx) ;
// `color`/`colorDark` donnent le dégradé de la vignette, repris tel quel de
// docs/maquettes/accueil.html -- chaque formation porte sa propre teinte
// d'identification (docs/DESIGN-SYSTEM.md §2), la coquille du site reste
// neutre.
export const demoCourses = [
  {
    slug: "amadeus-niveau-1",
    image: "course-aerien",
    titleKey: "aerien",
    level: "debutant",
    visual: "radar",
    color: "#0E7490",
    colorDark: "#1E3A8A",
    accentColor: "#43C9D9",
    lessonCount: 24,
    durationHours: 12,
    priceDA: 9900,
    real: true,
  },
  {
    slug: "demo-agent-voyage",
    image: "course-agent",
    titleKey: "agent",
    level: "complet",
    visual: "routes",
    color: "#1E3A8A",
    colorDark: "#4C1D95",
    accentColor: "#A78BFA",
    lessonCount: 28,
    durationHours: 15,
    priceDA: 11900,
    real: false,
  },
  {
    slug: "demo-accueil",
    image: "course-accueil",
    titleKey: "accueil",
    level: "relation",
    visual: "sunrise",
    color: "#C2410C",
    colorDark: "#7C2D12",
    accentColor: "#FFB088",
    lessonCount: 16,
    durationHours: 8,
    priceDA: 5900,
    real: false,
  },
  {
    slug: "demo-management",
    image: "course-management",
    titleKey: "management",
    level: "management",
    visual: "chart",
    color: "#155E75",
    colorDark: "#0F766E",
    accentColor: "#5EEAD4",
    lessonCount: 18,
    durationHours: 10,
    priceDA: 8900,
    real: false,
  },
  {
    slug: "demo-anglais",
    image: "course-anglais",
    titleKey: "anglais",
    level: "langues",
    visual: "orbit",
    color: "#3730A3",
    colorDark: "#1E3A8A",
    accentColor: "#A5B4FC",
    lessonCount: 18,
    durationHours: 9,
    priceDA: 4900,
    real: false,
  },
  {
    slug: "demo-billetterie",
    image: "course-billetterie",
    titleKey: "billetterie",
    level: "avance",
    visual: "ticket",
    color: "#0C4A6E",
    colorDark: "#164E63",
    accentColor: "#7DD3FC",
    lessonCount: 20,
    durationHours: 11,
    priceDA: null,
    real: false,
  },
];
