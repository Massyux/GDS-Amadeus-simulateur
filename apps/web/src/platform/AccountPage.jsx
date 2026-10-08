import { useEffect, useState } from "react";
import { Card, ProgressBar, EmptyState, PlatformLayout } from "./ui/index.js";
import { Link } from "./Link.jsx";
import { navigate } from "./useRoute.js";
import { platformApi } from "./api.js";
import { PlatformNav } from "./PlatformNav.jsx";
import { resumeLabel } from "./resumeLabel.js";

/**
 * Mon compte (docs/MAQUETTES.md §6) : "Reprendre" toujours en premier, puis
 * Mes formations (cartes avec progression), puis trois sections réservées
 * pour des missions futures -- la place existe, le contenu non (pas
 * d'invention : Ma progression = Mission 24, Ma licence = Mission 22).
 */
export default function AccountPage({ t, lang, onChangeLang, user, onLogout }) {
  const [data, setData] = useState(null);
  const ta = t.platform.account;
  const tn = t.platform.nav;
  const tc = t.platform.catalogue;

  useEffect(() => {
    let active = true;
    platformApi.account().then(({ data: body }) => {
      if (active) setData(body);
    });
    return () => {
      active = false;
    };
  }, []);

  const resumeCourse = data?.courses.find((course) => course.nextLessonId);

  return (
    <PlatformLayout
      menuLabels={{ open: tn.openMenu, close: tn.closeMenu }}
      nav={<PlatformNav t={t} lang={lang} onChangeLang={onChangeLang} user={user} onLogout={onLogout} />}
    >
      <h1 style={{ fontSize: "var(--text-2xl)" }}>{ta.title}</h1>
      <p className="pf-field-hint">{ta.connectedAs.replace("{email}", user?.email || "")}</p>

      {resumeCourse && (
        <div className="pf-resume" style={{ marginTop: "var(--space-6)" }}>
          <div className="pf-eyebrow" style={{ marginBottom: "var(--space-3)" }}>
            {ta.resumeEyebrow}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px", minWidth: "220px" }}>
              <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-3)" }}>{resumeCourse.title}</h2>
              <ProgressBar value={resumeCourse.progressPct} max={100} label={resumeLabel(tc, resumeCourse)} />
            </div>
            <Link
              to={`/app/cours/${resumeCourse.slug}/lecon/${resumeCourse.nextLessonId}`}
              className="pf-btn pf-btn--primary"
            >
              {ta.continueCta}
            </Link>
          </div>
        </div>
      )}

      <h2 style={{ marginTop: "var(--space-7)" }}>{ta.myCourses}</h2>

      {data && data.courses.length === 0 && (
        <EmptyState message={ta.noCourses} actionLabel={ta.browseCatalogue} onAction={() => navigate("/app/catalogue")} />
      )}

      {data && data.courses.length > 0 && (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          {data.courses.map((course) => (
            <Card key={course.slug}>
              <h3>{course.title}</h3>
              <ProgressBar
                value={course.completedCount}
                max={course.lessonCount}
                label={`${course.completedCount} / ${course.lessonCount}`}
              />
              <Link to={`/app/cours/${course.slug}`} className="pf-btn pf-btn--secondary" style={{ marginTop: "var(--space-3)" }}>
                {course.title}
              </Link>
            </Card>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: "var(--space-7)" }}>{ta.progressTitle}</h2>
      <p style={{ color: "var(--ink-2)" }}>{ta.progressComingSoon}</p>

      <h2 style={{ marginTop: "var(--space-7)" }}>{ta.profileTitle}</h2>
      <p style={{ color: "var(--ink-2)" }}>{ta.profileComingSoon}</p>

      <h2 style={{ marginTop: "var(--space-7)" }}>{ta.licenseTitle}</h2>
      <p style={{ color: "var(--ink-2)", marginBottom: "var(--space-7)" }}>{ta.licenseComingSoon}</p>
    </PlatformLayout>
  );
}
