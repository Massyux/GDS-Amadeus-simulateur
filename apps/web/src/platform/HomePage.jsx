import { useEffect, useState } from "react";
import { Brand } from "./Brand.jsx";
import { Link } from "./Link.jsx";
import { navigate } from "./useRoute.js";
import { Atmosphere } from "./ui/PlatformLayout.jsx";
import { Button, EmptyState, Skeleton } from "./ui/index.js";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { TerminalDemo } from "./TerminalDemo.jsx";
import { CourseVignette } from "./CourseVignette.jsx";
import { ResponsiveImage } from "./ResponsiveImage.jsx";
import { GradientTail } from "./GradientText.jsx";
import { AdminShortcut } from "./AdminShortcut.jsx";
import { demoCourses } from "./data/demoCourses.js";
import { platformApi } from "./api.js";
import { useLang } from "../i18n/useLang.js";
import { useTheme } from "./useTheme.js";
import { useRevealGroup } from "./useRevealGroup.js";
import { dictionary } from "../i18n/dictionary.js";

/**
 * Accueil public (docs/MAQUETTES.md §1) : "l'écran le plus important".
 * Remplace l'onboarding historique du simulateur à la racine "/" --
 * décision du mode autonome (Mission 23). L'ancien parcours (Onboarding
 * -> AccessGate -> Terminal, Mission 06) reste intact et testé, déplacé à
 * "/simulateur" (voir main.jsx) : il n'est plus avancé depuis l'accueil,
 * mais le terminal doit rester joignable tant que l'Étape 3 ne l'a pas
 * intégré comme leçon de la vraie formation. Rien n'est déployé en
 * production tant que Massy n'a pas validé (voir TASKS.md). Le simulateur
 * lui-même (packages/core, Terminal.jsx) n'est pas touché : la démo ici
 * est un rejeu scripté, pas le vrai moteur.
 */
export default function HomePage() {
  const [lang, onChangeLang] = useLang();
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [methodRef, methodVisible] = useRevealGroup();
  const [coursesRef, coursesVisible] = useRevealGroup();
  const [whoRef, whoVisible] = useRevealGroup();
  const t = dictionary[lang];
  const h = t.platform.home;
  const tn = t.platform.nav;
  const [courses, setCourses] = useState(null);

  useEffect(() => {
    let active = true;
    platformApi.courses().then(({ data }) => {
      if (active) setCourses(data.courses || []);
    });
    return () => {
      active = false;
    };
  }, []);

  const navLinks = (
    <>
      <a href="#formations">{tn.formations}</a>
      <a href="#methode">{tn.methode}</a>
      <Link to="/app">{tn.connexion}</Link>
      {/* PROMPT-PASSE-ACCUEIL.md chantier 1 (17/10/2026) : invisible pour
          tout le monde sauf Massy -- ne s'affiche que s'il a déjà une
          session admin ouverte dans cet onglet (voir AdminShortcut.jsx). */}
      <AdminShortcut label={tn.administration} />
      <LangToggle t={t} lang={lang} onChangeLang={onChangeLang} />
      <ThemeToggle theme={theme} onToggle={toggleTheme} label={tn.toggleTheme} />
      {/* PROMPT-PASSE-ACCUEIL.md chantier 2 (14/10/2026) : vers l'inscription,
          pas la connexion -- un visiteur qui clique "Commencer" n'a pas de
          compte. Le lien "Connexion" juste au-dessus reste inchangé. */}
      <Button variant="primary" onClick={() => navigate("/app/inscription")}>
        {tn.commencer}
      </Button>
    </>
  );

  return (
    <div className="platform-root">
      <Atmosphere />
      <header className="pf-topbar">
        <div className="pf-topbar-inner">
          <Brand />
          <nav className="pf-topbar-nav--desktop">{navLinks}</nav>
          <button
            type="button"
            className="pf-topbar-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="pf-home-mobile-nav"
            aria-label={menuOpen ? tn.closeMenu : tn.openMenu}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
        </div>
        {menuOpen && (
          <nav id="pf-home-mobile-nav" className="pf-topbar-nav--mobile">
            {navLinks}
          </nav>
        )}
      </header>

      <div className="pf-container">
        <section className="pf-hero">
          <div className="pf-hero-col">
            <span className="pf-tag">
              <b /> {h.tag}
            </span>
            <h1 className="pf-h1">
              {h.titleLine1}
              <br />
              <em className="pf-h1-em">{h.titleEm}</em>
            </h1>
            <p className="pf-lead">{h.lead}</p>
            <div className="pf-cta-row">
              <Button variant="primary" size="lg" onClick={() => navigate("/app/inscription")}>
                {h.ctaTry}
              </Button>
              <a href="#formations" className="pf-btn pf-btn--secondary pf-btn--lg">
                {h.ctaView}
              </a>
              {/* Bouton de secours (PROMPT-PASSE-ACCUEIL.md chantier 1,
                  14/10/2026) : pour qui ne devinera pas que l'image du
                  terminal, juste à côté, est elle-même cliquable. */}
              <Button variant="discreet" size="lg" onClick={() => navigate("/demo")}>
                {h.ctaTryTerminal}
              </Button>
            </div>
            <p className="pf-note">{h.note}</p>
            <div className="pf-kpis">
              <Kpi value={h.kpi1Value} label={h.kpi1Label} />
              <Kpi value={h.kpi2Value} label={h.kpi2Label} />
              <Kpi value={h.kpi3Value} label={h.kpi3Label} />
            </div>
          </div>
          <div className="pf-hero-visual">
            <div className="pf-hero-photo">
              <ResponsiveImage name="hero-cockpit" width={720} height={220} alt={h.heroImageAlt} lazy={false} />
            </div>
            <TerminalDemo
              label={h.termLabel}
              onActivate={() => navigate("/demo")}
              activateLabel={h.termActivateLabel}
            />
          </div>
        </section>
      </div>

      <section id="methode" className="pf-section">
        <div className="pf-container pf-center">
          <div className="pf-eyebrow">{h.methodEyebrow}</div>
          <h2>
            <GradientTail text={h.methodTitle} />
          </h2>
          <p className="pf-s-lead">{h.methodLead}</p>
          <div ref={methodRef} className={`pf-grid-3 pf-reveal-group${methodVisible ? " pf-reveal-group--visible" : ""}`}>
            <div className="pf-step pf-reveal">
              <div className="pf-step-no">01</div>
              <h3>{h.step1Title}</h3>
              <p>{h.step1Body}</p>
            </div>
            <div className="pf-step pf-reveal">
              <div className="pf-step-no">02</div>
              <h3>{h.step2Title}</h3>
              <p>{h.step2Body}</p>
            </div>
            <div className="pf-step pf-reveal">
              <div className="pf-step-no">03</div>
              <h3>{h.step3Title}</h3>
              <p>{h.step3Body}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="formations" className="pf-section pf-section--tint">
        <div className="pf-container">
          <div className="pf-eyebrow">{h.coursesEyebrow}</div>
          <h2>
            <GradientTail text={h.coursesTitle} />
          </h2>
          <p className="pf-s-lead">{h.coursesLead}</p>

          {courses === null && (
            <div className="pf-grid-courses">
              <Skeleton height="280px" radius="var(--radius-xl)" />
              <Skeleton height="280px" radius="var(--radius-xl)" />
              <Skeleton height="280px" radius="var(--radius-xl)" />
            </div>
          )}

          {/* État vide honnête (PROMPT-PASSE-ACCUEIL.md chantier 3,
              17/10/2026) : /api/courses renvoie réellement {"courses":[]}
              tant que Massy n'a publié aucune formation -- jamais de
              vignette factice pour combler la page, le terminal de démo
              reste joignable à la place. */}
          {courses !== null && courses.length === 0 && (
            <div style={{ marginTop: "var(--space-6)" }}>
              <EmptyState
                icon="○"
                message={h.coursesEmptyMessage}
                actionLabel={h.ctaTryTerminal}
                onAction={() => navigate("/demo")}
              />
            </div>
          )}

          {courses !== null && courses.length > 0 && (
            <div ref={coursesRef} className={`pf-grid-courses pf-reveal-group${coursesVisible ? " pf-reveal-group--visible" : ""}`}>
              {courses.map((course) => (
                <CourseCard key={course.slug} course={course} t={t} lang={lang} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="pf-section">
        <div className="pf-container">
          <div className="pf-eyebrow">{h.whoEyebrow}</div>
          <h2>
            <GradientTail text={h.whoTitle} words={3} />
          </h2>
          <div ref={whoRef} className={`pf-grid-3 pf-reveal-group${whoVisible ? " pf-reveal-group--visible" : ""}`} style={{ marginTop: "var(--space-6)" }}>
            <div className="pf-step pf-reveal">
              <h3>{h.who1Title}</h3>
              <p>{h.who1Body}</p>
            </div>
            <div className="pf-step pf-reveal">
              <h3>{h.who2Title}</h3>
              <p>{h.who2Body}</p>
            </div>
            <div className="pf-step pf-reveal">
              <h3>{h.who3Title}</h3>
              <p>{h.who3Body}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pf-section pf-section--tint">
        <div className="pf-container">
          <div className="pf-eyebrow">{h.teacherEyebrow}</div>
          <div className="pf-teacher">
            <div className="pf-avatar">{h.teacherAvatarPlaceholder}</div>
            <div>
              <h3>{h.teacherName}</h3>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--cyan)" }}>
                {h.teacherRole}
              </p>
              <p style={{ maxWidth: "66ch", color: "var(--ink-2)" }}>{h.teacherBio}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="pf-container">
        <div className="pf-final">
          <h2>{h.finalTitle}</h2>
          <p>{h.finalBody}</p>
          <Button variant="primary" size="lg" onClick={() => navigate("/app/inscription")}>
            {h.ctaTry}
          </Button>
        </div>
      </div>

      <footer className="pf-footer">
        <div className="pf-container pf-footer-grid">
          <div>
            <div style={{ marginBottom: "var(--space-4)" }}>
              <Brand to={null} />
            </div>
            {/* PROMPT-PASSE-ACCUEIL.md chantier 3 (14/10/2026) : les trois
                liens étaient href="#", en production. Contact traité en
                entier (adresse réelle, active depuis le 09/10/2026) ;
                Conditions/Remboursement mènent à des pages dédiées avec un
                état d'attente explicite -- le contenu juridique est à
                écrire par Massy, jamais par Claude Code. */}
            <a href="mailto:contact@orionisacademy.com" className="pf-btn pf-btn--discreet" style={{ marginRight: "var(--space-5)" }}>
              {h.footerContact}
            </a>
            <Link to="/conditions" className="pf-btn pf-btn--discreet" style={{ marginRight: "var(--space-5)" }}>
              {h.footerTerms}
            </Link>
            <Link to="/remboursement" className="pf-btn pf-btn--discreet">
              {h.footerRefund}
            </Link>
            {/* PROMPT-PASSE-ACCUEIL.md chantier 1 (17/10/2026) : lien discret,
                même niveau que Contact -- jamais un bouton d'appel à
                l'action. Toujours présent (contrairement au raccourci de
                barre de nav, qui ne s'affiche que si une session admin est
                déjà ouverte) : c'est la porte d'entrée pour Massy quand il
                n'a pas encore de session. */}
            <Link to="/admin" className="pf-btn pf-btn--discreet" style={{ marginLeft: "var(--space-5)" }}>
              {tn.administration}
            </Link>
          </div>
          <p className="pf-disclaimer">{h.disclaimer}</p>
        </div>
      </footer>
    </div>
  );
}

function Kpi({ value, label }) {
  return (
    <div className="pf-kpi">
      <b className="pf-grad">{value}</b>
      <span>{label}</span>
    </div>
  );
}

// Vitrine d'accueil rendue réelle (PROMPT-PASSE-ACCUEIL.md chantier 3,
// 17/10/2026) : `course` vient désormais de /api/courses (vraie formation
// publiée), plus jamais de data/demoCourses.js -- seule sa métadonnée
// visuelle (couleur, motif SVG) en est tirée, par slug, même motif que
// CataloguePage.jsx. Pas de prix affiché : l'inscription est gratuite et
// immédiate tant que Mission 22 (paiement) n'existe pas -- afficher un prix
// ici mentirait sur ce qui se passe réellement au clic (CONSTITUTION §5).
function CourseCard({ course, t }) {
  const visual = demoCourses.find((d) => d.slug === course.slug) || DEFAULT_VISUAL;
  const level = t.platform.levels[course.level] || course.level;
  const meta = t.platform.course.lessonCount.replace("{n}", course.lessonCount);
  const objectives = (course.objectives || []).slice(0, 3);

  return (
    <Link to={`/app/cours/${course.slug}`} className="pf-course-card-link">
      <article className="pf-course-card pf-reveal">
        <CourseVignette course={visual} label={level} alt={course.title} />
        <div className="pf-course-body">
          <h3>{course.title}</h3>
          {objectives.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1, display: "grid", gap: "var(--space-1)" }}>
              {objectives.map((item) => (
                <li key={item} style={{ display: "flex", gap: "var(--space-2)", color: "var(--ink-2)", fontSize: "var(--text-sm)" }}>
                  <span style={{ color: "var(--cyan)" }} aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--ink-2)", flex: 1 }}>{course.description}</p>
          )}
          <div className="pf-course-foot">
            <span className="pf-meta">{meta}</span>
            <span className="pf-soon">{t.platform.course.free}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

const DEFAULT_VISUAL = { visual: "radar", color: "#0E7490", colorDark: "#1E3A8A", accentColor: "#43C9D9" };

function LangToggle({ t, lang, onChangeLang }) {
  if (!onChangeLang) return null;
  return (
    <span style={{ display: "inline-flex", gap: "4px" }}>
      <button
        type="button"
        className="pf-lang-toggle"
        aria-current={lang === "fr" || undefined}
        onClick={() => onChangeLang("fr")}
      >
        {t.lang.fr}
      </button>
      <button
        type="button"
        className="pf-lang-toggle"
        aria-current={lang === "en" || undefined}
        onClick={() => onChangeLang("en")}
      >
        {t.lang.en}
      </button>
    </span>
  );
}
