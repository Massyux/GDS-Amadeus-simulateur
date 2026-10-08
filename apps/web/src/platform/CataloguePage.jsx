import { useEffect, useState } from "react";
import { Badge, ProgressBar, EmptyState, Skeleton, Button, PlatformLayout } from "./ui/index.js";
import { Link } from "./Link.jsx";
import { navigate } from "./useRoute.js";
import { platformApi } from "./api.js";
import { PlatformNav } from "./PlatformNav.jsx";
import { CourseVignette } from "./CourseVignette.jsx";
import { demoCourses } from "./data/demoCourses.js";
import { resumeLabel } from "./resumeLabel.js";

// Vignette par défaut pour une vraie formation absente de data/demoCourses.js
// (le cas normal dès que Massy en ajoute une au lancement, via Mission 23
// Étape 4) -- même esprit que CourseVignette.jsx, qui retombe déjà sur
// "radar" pour un `visual` inconnu.
const DEFAULT_VISUAL = { visual: "radar", color: "#0E7490", colorDark: "#1E3A8A", accentColor: "#22D3EE" };

/**
 * Catalogue (docs/MAQUETTES.md §3) : bloc "Reprendre" pleine largeur en
 * premier s'il existe une formation en cours, puis la grille des
 * formations -- même direction visuelle que HomePage.jsx, coquille neutre,
 * chaque formation garde sa couleur d'identification (CourseVignette).
 */
export default function CataloguePage({ t, lang, onChangeLang, user, onLogout }) {
  const [courses, setCourses] = useState(null);
  const tc = t.platform.catalogue;
  const tn = t.platform.nav;

  useEffect(() => {
    let active = true;
    platformApi.courses().then(({ data }) => {
      if (active) setCourses(data.courses || []);
    });
    return () => {
      active = false;
    };
  }, []);

  const resumeCourse = courses?.find((course) => course.enrolled && course.nextLessonId);

  return (
    <PlatformLayout
      menuLabels={{ open: tn.openMenu, close: tn.closeMenu }}
      nav={<PlatformNav t={t} lang={lang} onChangeLang={onChangeLang} user={user} onLogout={onLogout} />}
    >
      <h1 style={{ fontSize: "var(--text-2xl)" }}>{tc.title}</h1>
      <p style={{ color: "var(--ink-2)", marginTop: "var(--space-2)", marginBottom: "var(--space-6)" }}>
        {tc.subtitle}
      </p>

      {resumeCourse && (
        <div className="pf-resume">
          <div className="pf-eyebrow" style={{ marginBottom: "var(--space-3)" }}>
            {tc.resumeEyebrow}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px", minWidth: "220px" }}>
              <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-3)" }}>{resumeCourse.title}</h2>
              <ProgressBar value={resumeCourse.progressPct} max={100} label={resumeLabel(tc, resumeCourse)} />
            </div>
            <Button
              variant="primary"
              onClick={() => navigate(`/app/cours/${resumeCourse.slug}/lecon/${resumeCourse.nextLessonId}`)}
            >
              {t.platform.account.continueCta}
            </Button>
          </div>
        </div>
      )}

      {courses === null && (
        <div className="pf-grid-courses">
          <Skeleton height="280px" radius="var(--radius-xl)" />
          <Skeleton height="280px" radius="var(--radius-xl)" />
          <Skeleton height="280px" radius="var(--radius-xl)" />
        </div>
      )}
      {courses !== null && courses.length === 0 && <EmptyState message={tc.empty} />}
      {courses !== null && courses.length > 0 && (
        <div className="pf-grid-courses">
          {courses.map((course) => (
            <CourseCard key={course.slug} course={course} t={t} tc={tc} />
          ))}
        </div>
      )}
    </PlatformLayout>
  );
}

function CourseCard({ course, t, tc }) {
  const visual = demoCourses.find((demo) => demo.slug === course.slug) || DEFAULT_VISUAL;
  const meta = t.platform.course.lessonCount.replace("{n}", course.lessonCount);

  return (
    <Link to={`/app/cours/${course.slug}`} className="pf-course-card-link">
      <article className="pf-course-card">
        <CourseVignette course={visual} label={course.level} />
        <div className="pf-course-body">
          <h3 style={{ fontSize: "var(--text-lg)" }}>{course.title}</h3>
          <p style={{ color: "var(--ink-2)", flex: 1 }}>{course.description}</p>
          {course.enrolled && (
            <ProgressBar value={course.progressPct} max={100} label={`${course.progressPct}%`} />
          )}
          <div className="pf-course-foot">
            <span className="pf-meta">{meta}</span>
            {course.enrolled ? <Badge>{tc.enrolled}</Badge> : <span className="pf-meta">{tc.viewCta}</span>}
          </div>
        </div>
      </article>
    </Link>
  );
}
