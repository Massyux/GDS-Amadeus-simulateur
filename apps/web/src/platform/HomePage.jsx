import { useState } from "react";
import { Brand } from "./Brand.jsx";
import { Link } from "./Link.jsx";
import { navigate } from "./useRoute.js";
import { Atmosphere } from "./ui/PlatformLayout.jsx";
import { Button } from "./ui/index.js";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { TerminalDemo } from "./TerminalDemo.jsx";
import { CourseVignette } from "./CourseVignette.jsx";
import { ResponsiveImage } from "./ResponsiveImage.jsx";
import { GradientTail } from "./GradientText.jsx";
import { demoCourses } from "./data/demoCourses.js";
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

  const navLinks = (
    <>
      <a href="#formations">{tn.formations}</a>
      <a href="#methode">{tn.methode}</a>
      <Link to="/app">{tn.connexion}</Link>
      <LangToggle t={t} lang={lang} onChangeLang={onChangeLang} />
      <ThemeToggle theme={theme} onToggle={toggleTheme} label={tn.toggleTheme} />
      <Button variant="primary" onClick={() => navigate("/app")}>
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
          <div className="pf-hero-media" aria-hidden="true">
            <ResponsiveImage name="hero-cockpit" width={1440} height={700} alt="" lazy={false} />
          </div>
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
              <Button variant="primary" size="lg" onClick={() => navigate("/app")}>
                {h.ctaTry}
              </Button>
              <a href="#formations" className="pf-btn pf-btn--secondary pf-btn--lg">
                {h.ctaView}
              </a>
            </div>
            <p className="pf-note">{h.note}</p>
            <div className="pf-kpis">
              <Kpi value={h.kpi1Value} label={h.kpi1Label} />
              <Kpi value={h.kpi2Value} label={h.kpi2Label} />
              <Kpi value={h.kpi3Value} label={h.kpi3Label} />
            </div>
          </div>
          <TerminalDemo label={h.termLabel} />
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
          <div ref={coursesRef} className={`pf-grid-courses pf-reveal-group${coursesVisible ? " pf-reveal-group--visible" : ""}`}>
            {demoCourses.map((course) => (
              <CourseCard key={course.slug} course={course} t={t} lang={lang} />
            ))}
          </div>
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
          <Button variant="primary" size="lg" onClick={() => navigate("/app")}>
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
            <a href="#" className="pf-btn pf-btn--discreet" style={{ marginRight: "var(--space-5)" }}>
              {h.footerContact}
            </a>
            <a href="#" className="pf-btn pf-btn--discreet" style={{ marginRight: "var(--space-5)" }}>
              {h.footerTerms}
            </a>
            <a href="#" className="pf-btn pf-btn--discreet">
              {h.footerRefund}
            </a>
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

function CourseCard({ course, t, lang }) {
  const demo = t.platform.demoCourses[course.titleKey];
  const level = t.platform.levels[course.level];
  const locale = lang === "en" ? "en-US" : "fr-FR";
  const meta = `${t.platform.course.lessonCount.replace("{n}", course.lessonCount)} · ${course.durationHours} h`;

  const card = (
    <article className="pf-course-card pf-reveal">
      <CourseVignette course={course} label={level} alt={demo.title} />
      <div className="pf-course-body">
        <h3>{demo.title}</h3>
        <p style={{ color: "var(--ink-2)", flex: 1 }}>{demo.description}</p>
        <div className="pf-course-foot">
          <span className="pf-meta">{meta}</span>
          {course.priceDA ? (
            <span className="pf-price">{course.priceDA.toLocaleString(locale)} DA</span>
          ) : (
            <span className="pf-soon">{t.platform.home.soon}</span>
          )}
        </div>
      </div>
    </article>
  );

  // Les formations de démonstration n'ont pas de page réelle derrière --
  // pas de lien plutôt qu'un "#" qui ne mènerait nulle part (Massy les
  // retirera au lancement, voir data/demoCourses.js).
  return course.real ? (
    <Link to={`/app/cours/${course.slug}`} className="pf-course-card-link">
      {card}
    </Link>
  ) : (
    card
  );
}

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
