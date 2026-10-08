import { useEffect, useState } from "react";
import { Button, Card, Badge, ProgressBar, PlatformLayout } from "./ui/index.js";
import { Link } from "./Link.jsx";
import { platformApi } from "./api.js";
import { PlatformNav } from "./PlatformNav.jsx";
import { Breadcrumb } from "./Breadcrumb.jsx";
import { CourseVignette } from "./CourseVignette.jsx";
import { demoCourses } from "./data/demoCourses.js";
import { LESSON_TYPE_ICONS } from "./lessonTypeIcons.js";
import { useTheme } from "./useTheme.js";

const DEFAULT_VISUAL = { visual: "radar", color: "#0E7490", colorDark: "#1E3A8A", accentColor: "#22D3EE" };

/**
 * Page de formation (docs/MAQUETTES.md §4) : en-tête riche à deux colonnes
 * (texte + vignette), "ce que tu sauras faire" avant le sommaire -- "c'est
 * ce qui vend" -- puis le sommaire par module avec icône par type et état,
 * encart formateur en bas. Le statut d'inscription pilote le bouton
 * principal, jamais une ligne de texte isolée.
 */
export default function CoursePage({ t, lang, onChangeLang, user, csrfToken, slug, onLogout }) {
  const [data, setData] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const tc = t.platform.course;
  const tn = t.platform.nav;
  const h = t.platform.home;

  useEffect(() => {
    let active = true;
    platformApi.course(slug).then(({ data: body }) => {
      if (active) setData(body);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  async function handleEnroll() {
    setEnrolling(true);
    await platformApi.enroll(slug, csrfToken);
    const { data: fresh } = await platformApi.course(slug);
    setData(fresh);
    setEnrolling(false);
  }

  const demo = demoCourses.find((d) => d.slug === slug);
  const visual = demo || DEFAULT_VISUAL;
  const willLearn = demo ? t.platform.demoCourses[demo.titleKey]?.willLearn : null;
  const lessonCount = data?.modules.reduce((sum, m) => sum + m.lessons.length, 0) ?? 0;
  const completedCount =
    data?.modules.reduce((sum, m) => sum + m.lessons.filter((l) => l.status === "completed").length, 0) ?? 0;

  return (
    <PlatformLayout
      menuLabels={{ open: tn.openMenu, close: tn.closeMenu }}
      brandTo="/app/catalogue"
      nav={
        <PlatformNav
          t={t}
          lang={lang}
          onChangeLang={onChangeLang}
          user={user}
          onLogout={onLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      }
    >
      <Breadcrumb
        items={[
          { label: tn.home, to: "/" },
          { label: t.platform.catalogue.title, to: "/app/catalogue" },
          { label: data?.course?.title || "…" },
        ]}
      />

      {!data && <p>…</p>}

      {data?.course && (
        <>
          <div className="pf-course-head">
            <div>
              {data.course.level && <Badge color={visual.accentColor}>{data.course.level}</Badge>}
              <h1 style={{ fontSize: "var(--text-2xl)", marginTop: "var(--space-3)" }}>{data.course.title}</h1>
              <p style={{ color: "var(--ink-2)", marginTop: "var(--space-2)" }}>{data.course.description}</p>
              <p className="pf-meta" style={{ marginTop: "var(--space-3)" }}>
                {tc.lessonCount.replace("{n}", lessonCount)}
              </p>

              <div style={{ marginTop: "var(--space-5)" }}>
                {data.enrolled ? (
                  <>
                    <p style={{ color: visual.accentColor, marginBottom: "var(--space-3)" }}>{tc.enrolled}</p>
                    <ProgressBar
                      value={completedCount}
                      max={lessonCount}
                      label={`${completedCount} / ${lessonCount}`}
                      accentColor={visual.accentColor}
                    />
                  </>
                ) : (
                  <Button variant="primary" onClick={handleEnroll} disabled={enrolling}>
                    {enrolling ? tc.enrolling : tc.enrollCta}
                  </Button>
                )}
              </div>
            </div>

            <div style={{ borderRadius: "var(--radius-xl)", overflow: "hidden", height: "180px" }}>
              <CourseVignette course={visual} alt={data.course.title} />
            </div>
          </div>

          {willLearn && willLearn.length > 0 && (
            <section style={{ marginTop: "var(--space-8)" }}>
              <h2 style={{ fontSize: "var(--text-xl)" }}>{tc.willLearnTitle}</h2>
              <ul className="pf-will-learn">
                {willLearn.map((item) => (
                  <li key={item} style={{ display: "flex", gap: "var(--space-2)", color: "var(--ink-2)" }}>
                    <span style={{ color: "var(--cyan)" }} aria-hidden="true">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section style={{ marginTop: "var(--space-8)" }}>
            <h2 style={{ fontSize: "var(--text-xl)" }}>{tc.summary}</h2>
            <div style={{ display: "grid", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
              {data.modules.map((module) => {
                const moduleCompleted = module.lessons.filter((l) => l.status === "completed").length;
                return (
                <Card key={module.id}>
                  <h3 style={{ fontSize: "var(--text-base)", marginBottom: "var(--space-3)" }}>{module.title}</h3>
                  {data.enrolled && (
                    <div style={{ marginBottom: "var(--space-3)" }}>
                      <ProgressBar
                        value={moduleCompleted}
                        max={module.lessons.length}
                        label={`${moduleCompleted} / ${module.lessons.length}`}
                        accentColor={visual.accentColor}
                      />
                    </div>
                  )}
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "var(--space-2)" }}>
                    {module.lessons.map((lesson) =>
                      data.enrolled ? (
                        <li key={lesson.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <span aria-hidden="true" style={{ color: "var(--ink-3)", width: "1.4em", display: "inline-block" }}>
                            {lesson.status === "completed" ? "✓" : LESSON_TYPE_ICONS[lesson.type] || "•"}
                          </span>
                          <Link
                            to={`/app/cours/${slug}/lecon/${lesson.id}`}
                            style={{ color: "var(--ink)", textDecoration: "none" }}
                          >
                            {lesson.title}
                          </Link>
                        </li>
                      ) : (
                        <li
                          key={lesson.id}
                          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--ink-3)" }}
                          title={tc.lockedLesson}
                        >
                          <span aria-hidden="true" style={{ width: "1.4em", display: "inline-block" }}>
                            {LESSON_TYPE_ICONS[lesson.type] || "•"}
                          </span>
                          {lesson.title}
                        </li>
                      )
                    )}
                  </ul>
                </Card>
                );
              })}
            </div>
          </section>

          <div className="pf-teacher" style={{ marginTop: "var(--space-8)", marginBottom: "var(--space-8)" }}>
            <div className="pf-avatar">{h.teacherAvatarPlaceholder}</div>
            <div>
              <h3>{h.teacherName}</h3>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--cyan)" }}>
                {h.teacherRole}
              </p>
              <p style={{ maxWidth: "66ch", color: "var(--ink-2)" }}>{h.teacherBio}</p>
            </div>
          </div>
        </>
      )}
    </PlatformLayout>
  );
}
