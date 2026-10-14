// Vignettes SVG par formation (docs/IDENTITE-VISUELLE.md §"La direction
// retenue" point 5) : remplacement temporaire assumé en attendant de
// vraies photos (voir le même document, section "Les photos"). Dessinées
// à la main, aux couleurs de chaque formation -- jamais une photo de
// banque d'images (interdit permanent, même document).
//
// Reprises fidèlement de docs/maquettes/accueil.html (référence absolue
// pour la composition visuelle) -- six motifs, un par formation.
import { ResponsiveImage } from "./ResponsiveImage.jsx";

function Radar({ stroke }) {
  return (
    <svg viewBox="0 0 400 150" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <circle cx="200" cy="150" r="130" fill="none" stroke={stroke} strokeOpacity=".28" />
      <circle cx="200" cy="150" r="92" fill="none" stroke={stroke} strokeOpacity=".2" />
      <circle cx="200" cy="150" r="54" fill="none" stroke={stroke} strokeOpacity=".14" />
      <path d="M0 150 L200 150 L340 40" stroke={stroke} strokeOpacity=".4" strokeWidth="2" fill="none" />
      <path d="M352 28 l14 10 -8 14 -10-10z" fill={stroke} opacity=".85" />
    </svg>
  );
}

function Routes({ stroke, dot }) {
  return (
    <svg viewBox="0 0 400 150" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <path d="M-10 118 Q100 92 200 104 T410 86" stroke={stroke} strokeOpacity=".45" strokeWidth="2" fill="none" />
      <path d="M-10 136 Q120 114 230 122 T410 108" stroke={stroke} strokeOpacity=".22" strokeWidth="2" fill="none" />
      <circle cx="92" cy="98" r="5" fill={dot} />
      <circle cx="218" cy="105" r="5" fill={dot} />
      <circle cx="330" cy="92" r="5" fill={dot} />
      <rect x="250" y="26" width="104" height="58" rx="8" fill="none" stroke={dot} strokeOpacity=".4" />
      <path d="M262 46h80M262 58h54M262 70h66" stroke={dot} strokeOpacity=".32" strokeWidth="2" />
    </svg>
  );
}

function Sunrise({ fill1, fill2, line }) {
  return (
    <svg viewBox="0 0 400 150" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <circle cx="200" cy="124" r="78" fill={fill1} fillOpacity=".16" />
      <circle cx="200" cy="124" r="48" fill={fill2} fillOpacity=".22" />
      <path d="M0 126h400" stroke={fill2} strokeOpacity=".4" strokeWidth="1.5" />
      <path d="M150 126a50 26 0 0 1 100 0" fill="none" stroke={line} strokeOpacity=".55" strokeWidth="2" />
      <circle cx="200" cy="86" r="13" fill="none" stroke={line} strokeOpacity=".7" strokeWidth="2" />
    </svg>
  );
}

function Chart({ bar, line }) {
  return (
    <svg viewBox="0 0 400 150" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <rect x="54" y="92" width="34" height="44" rx="4" fill={bar} fillOpacity=".45" />
      <rect x="102" y="66" width="34" height="70" rx="4" fill={bar} fillOpacity=".6" />
      <rect x="150" y="40" width="34" height="96" rx="4" fill={bar} fillOpacity=".78" />
      <path d="M210 110 l38-30 30 20 46-52" stroke={line} strokeWidth="2.5" fill="none" />
      <circle cx="324" cy="48" r="6" fill={line} />
    </svg>
  );
}

function Orbit({ stroke, dot }) {
  return (
    <svg viewBox="0 0 400 150" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <circle cx="200" cy="80" r="56" fill="none" stroke={stroke} strokeOpacity=".5" strokeWidth="1.5" />
      <ellipse cx="200" cy="80" rx="56" ry="22" fill="none" stroke={stroke} strokeOpacity=".35" strokeWidth="1.5" />
      <ellipse cx="200" cy="80" rx="22" ry="56" fill="none" stroke={stroke} strokeOpacity=".35" strokeWidth="1.5" />
      <path d="M144 80h112" stroke={stroke} strokeOpacity=".35" strokeWidth="1.5" />
      <circle cx="248" cy="52" r="5" fill={dot} />
      <circle cx="160" cy="98" r="5" fill={dot} />
    </svg>
  );
}

function Ticket({ stroke, line }) {
  return (
    <svg viewBox="0 0 400 150" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <rect x="88" y="44" width="224" height="68" rx="9" fill="none" stroke={stroke} strokeOpacity=".5" strokeWidth="1.5" />
      <path d="M88 70h224" stroke={stroke} strokeOpacity=".3" strokeDasharray="5 5" />
      <circle cx="88" cy="70" r="7" fill="#070B16" stroke={stroke} strokeOpacity=".5" />
      <circle cx="312" cy="70" r="7" fill="#070B16" stroke={stroke} strokeOpacity=".5" />
      <path d="M110 86h66M110 96h42M232 86h58" stroke={line} strokeOpacity=".5" strokeWidth="2" />
    </svg>
  );
}

const VISUALS = {
  radar: (c) => <Radar stroke={c.accentColor} />,
  routes: (c) => <Routes stroke={c.accentColor} dot={c.accentColor} />,
  sunrise: () => <Sunrise fill1="#FC8C5E" fill2="#FFB08F" line="#FFD2BA" />,
  chart: (c) => <Chart bar={c.accentColor} line={c.accentColor} />,
  orbit: (c) => <Orbit stroke={c.accentColor} dot={c.accentColor} />,
  ticket: (c) => <Ticket stroke={c.accentColor} line={c.accentColor} />,
};

/**
 * Chantier 2 (08/10/2026, "passe vivant") : une vraie photo remplace le
 * motif SVG dès que `course.image` existe -- un voile dégradé aux couleurs
 * de la formation par-dessus, "pour que les photos s'intègrent au lieu de
 * jurer" (IDENTITE-VISUELLE.md). Le SVG reste le repli pour toute future
 * vraie formation qui n'aurait pas encore sa photo (Étape 4, back-office).
 *
 * @param {{ course: { visual: string, color: string, colorDark: string, accentColor: string, image?: string } }} props
 */
export function CourseVignette({ course, label, alt = "" }) {
  const render = VISUALS[course.visual] || VISUALS.radar;

  if (course.image) {
    return (
      <div className="pf-course-ph">
        <ResponsiveImage name={course.image} width={400} height={148} alt={alt} />
        <div
          className="pf-course-ph-veil"
          style={{ background: `linear-gradient(140deg, ${course.color}CC, ${course.colorDark}99)` }}
        />
        {label && <span className="pf-course-ph-label">{label}</span>}
      </div>
    );
  }

  return (
    <div
      className="pf-course-ph"
      style={{ background: `linear-gradient(140deg, ${course.color}, ${course.colorDark})` }}
    >
      {render(course)}
      {label && <span className="pf-course-ph-label">{label}</span>}
    </div>
  );
}
