import { useEffect, useState } from "react";
import { Button, Card, Badge, ProgressBar, PlatformLayout } from "./ui/index.js";
import { Link } from "./Link.jsx";
import { navigate } from "./useRoute.js";
import { platformApi } from "./api.js";
import { PlatformNav } from "./PlatformNav.jsx";
import { Breadcrumb } from "./Breadcrumb.jsx";
import { CourseVignette } from "./CourseVignette.jsx";
import { demoCourses } from "./data/demoCourses.js";
import { LESSON_TYPE_ICONS } from "./lessonTypeIcons.js";
import { useTheme } from "./useTheme.js";

const DEFAULT_VISUAL = { visual: "radar", color: "#0E7490", colorDark: "#1E3A8A", accentColor: "#43C9D9" };

function formatBytes(bytes, lang) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = lang === "en" ? ["B", "KB", "MB", "GB"] : ["o", "Ko", "Mo", "Go"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

/**
 * Fiche de formation (PROMPT-PASSE-ACCUEIL.md chantier 2, 17/10/2026) :
 * accessible à un visiteur anonyme (PlatformApp.jsx teste cette route AVANT
 * le portail de connexion) -- doit convaincre avant qu'il ait un compte.
 * `user`/`csrfToken` valent `null` pour un tel visiteur ; toutes les
 * actions qui en dépendent (inscription, téléchargement) redirigent vers
 * /app/inscription plutôt que d'appeler une API qui exigerait une session.
 *
 * Structure (docs/MAQUETTES.md étendu par le prompt) : fil d'Ariane,
 * bande d'en-tête + stats, carte d'inscription "sticky", "ce que tu vas
 * apprendre", programme, documents (vraies cartes), bloc simulateur
 * autonome, caractéristiques, formateur (encart réservé, inchangé).
 */
export default function CoursePage({ t, lang, onChangeLang, user, csrfToken, slug, onLogout }) {
  const [data, setData] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [programExpanded, setProgramExpanded] = useState(false);
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
    if (!user) {
      navigate("/app/inscription");
      return;
    }
    setEnrolling(true);
    await platformApi.enroll(slug, csrfToken);
    const { data: fresh } = await platformApi.course(slug);
    setData(fresh);
    setEnrolling(false);
  }

  async function handleDownloadDocument(lessonId, fileIndex) {
    const { data: body } = await platformApi.lesson(lessonId);
    if (!body?.lesson) return;
    const content = body.lesson.content;
    const url = typeof fileIndex === "number" ? content?.files?.[fileIndex]?.downloadUrl : content?.downloadUrl;
    if (url) window.open(url, "_blank", "noopener");
  }

  const demo = demoCourses.find((d) => d.slug === slug);
  const visual = demo || DEFAULT_VISUAL;
  const flatLessons = data?.modules.flatMap((m) => m.lessons) ?? [];
  const lessonCount = flatLessons.length;
  const completedCount = flatLessons.filter((l) => l.status === "completed").length;
  const totalMinutes = flatLessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
  const durationHours = data?.course?.durationHours ?? (totalMinutes > 0 ? Math.round(totalMinutes / 60) : null);

  const firstIncomplete = flatLessons.find((l) => l.status !== "completed");
  const resumeTargetId = (firstIncomplete || flatLessons[0])?.id;

  const documents = [];
  data?.modules.forEach((module) => {
    module.lessons.forEach((lesson) => {
      const locked = !data.enrolled && !lesson.isPreview;
      if (lesson.document) {
        documents.push({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          fileName: lesson.document.fileName,
          sizeBytes: lesson.document.sizeBytes,
          locked,
        });
      }
      if (Array.isArray(lesson.documents)) {
        lesson.documents.forEach((doc, index) => {
          documents.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            fileName: doc.fileName,
            sizeBytes: doc.sizeBytes,
            fileIndex: index,
            locked,
          });
        });
      }
    });
  });

  return (
    <PlatformLayout
      menuLabels={{ open: tn.openMenu, close: tn.closeMenu }}
      brandTo={user ? "/app/catalogue" : "/"}
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
            <div className="pf-course-hero-band">
              {data.course.level && <Badge color={visual.accentColor}>{t.platform.levels[data.course.level] || data.course.level}</Badge>}
              <h1 style={{ fontSize: "var(--text-2xl)", marginTop: "var(--space-3)" }}>{data.course.title}</h1>
              <p style={{ color: "var(--ink-2)", marginTop: "var(--space-2)" }}>{data.course.description}</p>

              <div className="pf-course-stats">
                <div className="pf-course-stat">
                  <b>{lessonCount}</b>
                  <span>{tc.statLessons}</span>
                </div>
                {durationHours != null && (
                  <div className="pf-course-stat">
                    <b>{tc.durationLabel.replace("{n}", durationHours)}</b>
                    <span>{tc.statDuration}</span>
                  </div>
                )}
                {data.course.level && (
                  <div className="pf-course-stat">
                    <b>{t.platform.levels[data.course.level] || data.course.level}</b>
                    <span>{tc.statLevel}</span>
                  </div>
                )}
                <div className="pf-course-stat">
                  <b>{tc.languageLabel}</b>
                  <span>{tc.statLanguage}</span>
                </div>
              </div>
            </div>

            <Card className="pf-course-sidebar">
              <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", height: "140px", marginBottom: "var(--space-4)" }}>
                <CourseVignette course={visual} alt={data.course.title} />
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--cyan)" }}>
                {tc.free}
              </p>

              {data.enrolled ? (
                <>
                  <p style={{ color: visual.accentColor, marginBottom: "var(--space-3)" }}>{tc.enrolled}</p>
                  <ProgressBar
                    value={completedCount}
                    max={lessonCount}
                    label={`${completedCount} / ${lessonCount}`}
                    accentColor={visual.accentColor}
                  />
                  <div style={{ marginTop: "var(--space-4)" }}>
                    <Button
                      variant="primary"
                      onClick={() => resumeTargetId && navigate(`/app/cours/${slug}/lecon/${resumeTargetId}`)}
                      disabled={!resumeTargetId}
                    >
                      {tc.resumeCta}
                    </Button>
                  </div>
                  {lessonCount > 0 && completedCount === lessonCount && (
                    <a
                      href={`/api/courses/${slug}/certificate?lang=${lang}`}
                      target="_blank"
                      rel="noreferrer"
                      className="pf-btn pf-btn--secondary pf-btn--md"
                      style={{ marginTop: "var(--space-4)", display: "inline-block" }}
                    >
                      {tc.certificateCta}
                    </a>
                  )}
                </>
              ) : (
                <div style={{ marginTop: "var(--space-4)" }}>
                  <Button variant="primary" onClick={handleEnroll} disabled={enrolling}>
                    {enrolling ? tc.enrolling : tc.enrollCta}
                  </Button>
                </div>
              )}

              <button
                type="button"
                className="pf-btn pf-btn--discreet"
                style={{ marginTop: "var(--space-3)" }}
                onClick={() => setProgramExpanded((v) => !v)}
              >
                {programExpanded ? tc.hideFullProgram : tc.viewFullProgram}
              </button>
              {programExpanded && (
                <ul style={{ listStyle: "none", padding: 0, margin: "var(--space-3) 0 0", display: "grid", gap: "var(--space-1)" }}>
                  {data.modules.map((module) => (
                    <li key={module.id} className="pf-meta">
                      {module.title} — {module.lessons.length}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {data.course.objectives && data.course.objectives.length > 0 && (
            <section style={{ marginTop: "var(--space-8)" }}>
              <h2 style={{ fontSize: "var(--text-xl)" }}>{tc.willLearnTitle}</h2>
              <ul className="pf-will-learn">
                {data.course.objectives.map((item) => (
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

          <section id="pf-programme" style={{ marginTop: "var(--space-8)" }}>
            <h2 style={{ fontSize: "var(--text-xl)" }}>{tc.programTitle}</h2>
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
                    <ul className="pf-program-list">
                      {module.lessons.map((lesson) => {
                        const unlocked = data.enrolled || lesson.isPreview;
                        const typeLabel = tc.lessonTypes[lesson.type] || lesson.type;
                        // L'icône (aria-hidden) et le titre forment le nom
                        // accessible du lien -- les badges de méta (type,
                        // durée, "aperçu gratuit") sont un SIBLING du lien,
                        // jamais à l'intérieur : sinon ils s'ajoutent au nom
                        // accessible du lien et le rendent méconnaissable
                        // ("Bienvenue Aperçu gratuit Texte 5 min" au lieu de
                        // "Bienvenue"), un vrai regret UX/a11y, pas qu'un
                        // détail de test.
                        const icon = (
                          <span aria-hidden="true" style={{ color: "var(--ink-3)", width: "1.4em", display: "inline-block", flexShrink: 0 }}>
                            {lesson.status === "completed" ? "✓" : LESSON_TYPE_ICONS[lesson.type] || "•"}
                          </span>
                        );
                        const meta = (
                          <span className="pf-program-item-meta">
                            {!data.enrolled && lesson.isPreview && <Badge>{tc.preview}</Badge>}
                            <span className="pf-meta">{typeLabel}</span>
                            {lesson.durationMinutes != null && (
                              <span className="pf-meta">{tc.minutesLabel.replace("{n}", lesson.durationMinutes)}</span>
                            )}
                          </span>
                        );
                        return unlocked ? (
                          <li key={lesson.id} className="pf-program-item">
                            <Link
                              to={`/app/cours/${slug}/lecon/${lesson.id}`}
                              style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, color: "var(--ink)" }}
                            >
                              {icon}
                              {lesson.title}
                            </Link>
                            {meta}
                          </li>
                        ) : (
                          <li key={lesson.id} className="pf-program-item" style={{ color: "var(--ink-3)" }} title={tc.lockedLesson}>
                            {icon}
                            {lesson.title}
                            {meta}
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                );
              })}
            </div>
          </section>

          <section style={{ marginTop: "var(--space-8)" }}>
            <h2 style={{ fontSize: "var(--text-xl)" }}>{tc.documentsTitle}</h2>
            {documents.length === 0 ? (
              <p style={{ color: "var(--ink-2)", marginTop: "var(--space-3)" }}>{tc.documentsEmpty}</p>
            ) : (
              <div className="pf-doc-grid">
                {documents.map((doc, index) => {
                  const weight = formatBytes(doc.sizeBytes, lang);
                  return (
                    <Card key={`${doc.lessonId}-${index}`} className="pf-doc-card">
                      <div className="pf-doc-card-head">
                        <span className="pf-doc-icon" aria-hidden="true">
                          ▤
                        </span>
                        <div>
                          <h3 style={{ fontSize: "var(--text-base)", margin: 0 }}>{doc.fileName || doc.lessonTitle}</h3>
                          <p style={{ color: "var(--ink-2)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>
                            {tc.documentOfLesson.replace("{lesson}", doc.lessonTitle)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                        {weight && <span className="pf-meta">{weight}</span>}
                        {doc.locked ? (
                          <span className="pf-soon">{tc.downloadLocked}</span>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => handleDownloadDocument(doc.lessonId, doc.fileIndex)}>
                            {tc.downloadCta}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ marginTop: "var(--space-8)" }}>
            <h2 style={{ fontSize: "var(--text-xl)" }}>{tc.simulatorTitle}</h2>
            <div className="pf-sim-block" style={{ marginTop: "var(--space-4)" }}>
              <span className="pf-sim-icon" aria-hidden="true">
                {">_"}
              </span>
              <div className="pf-sim-block-body">
                <p style={{ color: "var(--ink-2)", margin: 0 }}>{tc.simulatorBody}</p>
              </div>
              <Button variant="primary" size="lg" onClick={() => navigate("/demo")}>
                {tc.simulatorCta}
              </Button>
            </div>
          </section>

          <section style={{ marginTop: "var(--space-8)" }}>
            <h2 style={{ fontSize: "var(--text-xl)" }}>{tc.featuresTitle}</h2>
            <div className="pf-features-grid">
              <Feature icon="○" text={tc.featureSelfPaced} />
              <Feature icon="≡" text={tc.lessonCount.replace("{n}", lessonCount)} />
              <Feature icon="↻" text={tc.featureUpdated} />
              <Feature icon="∞" text={tc.featureAccessType} />
              <Feature icon="▢" text={tc.featureMobile} />
              <Feature icon="✓" text={tc.featureCertificate} />
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

          <p className="pf-disclaimer">{h.disclaimer}</p>
        </>
      )}
    </PlatformLayout>
  );
}

function Feature({ icon, text }) {
  return (
    <div className="pf-feature-item">
      <span className="pf-feature-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}
