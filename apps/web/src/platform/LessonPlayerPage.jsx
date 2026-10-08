import { useEffect, useState } from "react";
import { Button, Badge, Card, PlatformLayout } from "./ui/index.js";
import { Link } from "./Link.jsx";
import { navigate } from "./useRoute.js";
import { platformApi } from "./api.js";
import { renderMarkdownLite } from "./markdownLite.jsx";
import { buildIcsUrl } from "./ics.js";
import { LESSON_TYPE_ICONS } from "./lessonTypeIcons.js";
import { useTheme } from "./useTheme.js";
import { Breadcrumb } from "./Breadcrumb.jsx";
import LessonSimulatorView from "./LessonSimulatorView.jsx";

const MOBILE_QUERY = "(max-width: 767px)";

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && Boolean(window.matchMedia?.(MOBILE_QUERY).matches)
  );
  useEffect(() => {
    const mql = window.matchMedia?.(MOBILE_QUERY);
    if (!mql) return undefined;
    const handler = (event) => setIsMobile(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/**
 * Lecteur de leçon (docs/MAQUETTES.md §5) : "le contenu règne, le reste
 * s'efface." Pas de barre de navigation standard (PlatformNav) ici -- juste
 * retour au cours + titre + progression ; sommaire latéral repliable
 * (masqué sous 1024px, CSS) ; barre d'action basse fixe, toujours les deux
 * mêmes boutons au même endroit ; écran de fin de module.
 *
 * Deux appels API : la leçon elle-même (contenu), puis le cours entier une
 * fois son slug connu -- pour construire le sommaire et la position "3/12"
 * (functions/api/courses/[slug]/index.js n'est pas dupliqué, juste réutilisé
 * comme CoursePage.jsx le fait déjà).
 *
 * Leçons simulateur/exercice (Mission 23 Étape 3) : quand `showSimulator`
 * est actif, cette page ne rend PAS <PlatformLayout> -- elle rend
 * <LessonSimulatorView> à la place, en dehors de `.platform-root`. C'est
 * voulu (voir LessonSimulatorView.jsx) : c'est la seule façon de garantir
 * que le vrai Terminal reste pixel pour pixel identique au mode libre.
 */
export default function LessonPlayerPage({ t, lang, csrfToken, courseSlugHint, lessonId }) {
  const [data, setData] = useState(null);
  const [course, setCourse] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [moduleDone, setModuleDone] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const isMobile = useIsMobileViewport();
  // Pas de barre de navigation ici (ci-dessous), donc pas de bouton de
  // bascule -- mais le thème doit quand même s'initialiser correctement
  // pour un visiteur qui atterrit directement sur l'URL d'une leçon.
  useTheme();
  const tl = t.platform.lesson;

  // Pas de remise à zéro manuelle de `completed`/`moduleDone` ici : le
  // parent (PlatformApp.jsx) passe `key={lessonId}`, qui remonte tout le
  // composant au changement de leçon -- même convention déjà établie pour
  // CoursePage.jsx (key={slug}), qui évite exactement ce lint
  // react-hooks/set-state-in-effect.
  useEffect(() => {
    let active = true;
    platformApi.lesson(lessonId).then(({ data: body }) => {
      if (active) setData(body);
    });
    return () => {
      active = false;
    };
  }, [lessonId]);

  const courseSlug = data?.courseSlug || courseSlugHint;

  useEffect(() => {
    if (!courseSlug) return undefined;
    let active = true;
    platformApi.course(courseSlug).then(({ data: body }) => {
      if (active) setCourse(body);
    });
    return () => {
      active = false;
    };
  }, [courseSlug]);

  const flat = course ? course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title }))) : [];
  const position = flat.findIndex((l) => l.id === lessonId);
  const currentFlat = position >= 0 ? flat[position] : null;
  const isLastOfModule = currentFlat ? !flat[position + 1] || flat[position + 1].moduleId !== currentFlat.moduleId : false;
  const nextModule = currentFlat ? course.modules.find((m) => m.id !== currentFlat.moduleId && m.lessons[0]?.id === data?.nav?.nextId) : null;

  async function markCompleted() {
    await platformApi.setLessonStatus(lessonId, "completed", csrfToken);
    setCompleted(true);
  }

  function goNext() {
    if (isLastOfModule) {
      setModuleDone({ nextLessonId: data.nav.nextId, nextModuleTitle: nextModule?.title || null });
    } else if (data.nav.nextId) {
      navigate(`/app/cours/${courseSlug}/lecon/${data.nav.nextId}`);
    }
  }

  async function handleMarkCompletedAndContinue() {
    await markCompleted();
    goNext();
  }

  // L'exercice est déjà évalué par @simulateur/exercises (ExercisePanel) --
  // on se contente d'alimenter lesson_progress dès la première réussite,
  // sans naviguer : l'étudiant reste sur l'écran de résultat tant qu'il n'a
  // pas explicitement choisi de revenir à la leçon.
  async function handleExercisePassed() {
    await markCompleted();
  }

  if (showSimulator && data?.lesson) {
    return (
      <LessonSimulatorView
        type={data.lesson.type}
        exerciseId={data.lesson.content?.exerciseId}
        t={t}
        lang={lang}
        onExit={() => setShowSimulator(false)}
        onPassed={handleExercisePassed}
      />
    );
  }

  return (
    <PlatformLayout brandTo="/app/catalogue">
      {courseSlug && (
        <Breadcrumb
          items={[
            { label: t.platform.nav.home, to: "/" },
            { label: t.platform.catalogue.title, to: "/app/catalogue" },
            { label: course?.course?.title || "…", to: `/app/cours/${courseSlug}` },
            { label: data?.lesson?.title || "…" },
          ]}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-5)" }}>
        {courseSlug && (
          <Link to={`/app/cours/${courseSlug}`} className="pf-btn pf-btn--discreet">
            {tl.back}
          </Link>
        )}
        {data?.lesson && <h1 style={{ fontSize: "var(--text-lg)", margin: 0 }}>{data.lesson.title}</h1>}
        {flat.length > 0 && position >= 0 && (
          <span className="pf-meta" style={{ marginLeft: "auto" }}>
            {tl.progressLabel.replace("{done}", String(position + 1)).replace("{total}", String(flat.length))}
          </span>
        )}
      </div>

      {!data && <p>…</p>}

      {data?.lesson && !moduleDone && (
        <div className="pf-lesson-layout">
          <nav className="pf-lesson-sidebar" aria-label={tl.sidebarTitle}>
            {course?.modules.map((module) => (
              <div key={module.id} style={{ marginBottom: "var(--space-3)" }}>
                <p className="pf-meta" style={{ padding: "var(--space-1) var(--space-3)" }}>
                  {module.title}
                </p>
                {module.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    to={`/app/cours/${courseSlug}/lecon/${lesson.id}`}
                    aria-current={lesson.id === lessonId ? "true" : undefined}
                  >
                    <span aria-hidden="true" style={{ display: "inline-block", width: "1.4em" }}>
                      {lesson.status === "completed" ? "✓" : LESSON_TYPE_ICONS[lesson.type] || "•"}
                    </span>
                    {lesson.title}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className={`pf-lesson-content${["video", "pdf", "simulateur", "exercice"].includes(data.lesson.type) ? " pf-lesson-content--wide" : ""}`}>
            <LessonContent
              type={data.lesson.type}
              content={data.lesson.content}
              tl={tl}
              isMobile={isMobile}
              onOpenSimulator={() => setShowSimulator(true)}
            />

            <div className="pf-lesson-actionbar">
              <Button
                variant="discreet"
                disabled={!data.nav.prevId}
                onClick={() => navigate(`/app/cours/${courseSlug}/lecon/${data.nav.prevId}`)}
              >
                {tl.prev}
              </Button>
              {data.lesson.type === "exercice" ? (
                completed && (
                  <Button variant="primary" onClick={goNext}>
                    {tl.next}
                  </Button>
                )
              ) : (
                <Button variant="primary" onClick={handleMarkCompletedAndContinue} disabled={completed}>
                  {completed ? tl.completed : tl.markCompleted}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {moduleDone && (
        <div className="pf-final" style={{ margin: "var(--space-6) 0" }}>
          <h2>{tl.moduleDoneTitle}</h2>
          <p>{tl.moduleDoneBody}</p>
          {moduleDone.nextLessonId ? (
            <Button variant="primary" onClick={() => navigate(`/app/cours/${courseSlug}/lecon/${moduleDone.nextLessonId}`)}>
              {tl.moduleDoneCta}
            </Button>
          ) : (
            <Link to={`/app/cours/${courseSlug}`} className="pf-btn pf-btn--primary pf-btn--md">
              {t.platform.course.back}
            </Link>
          )}
        </div>
      )}
    </PlatformLayout>
  );
}

function LessonContent({ type, content, tl, isMobile, onOpenSimulator }) {
  if (type === "texte") {
    return <div>{renderMarkdownLite(content?.body)}</div>;
  }

  if (type === "video") {
    return content?.embedUrl ? (
      <iframe
        title="video"
        src={content.embedUrl}
        width="100%"
        height="400"
        style={{ border: "none", borderRadius: "var(--radius-md)" }}
        allow="autoplay; encrypted-media; picture-in-picture"
      />
    ) : (
      <p>{tl.videoUnavailable}</p>
    );
  }

  if (type === "pdf") {
    return (
      <div>
        <iframe
          title={content?.fileName}
          src={content?.downloadUrl}
          width="100%"
          height="600"
          style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-md)" }}
        />
        <a href={content?.downloadUrl} className="pf-btn pf-btn--secondary pf-btn--md" style={{ marginTop: "var(--space-3)" }}>
          {tl.pdfDownload}
        </a>
      </div>
    );
  }

  if (type === "fichier") {
    return (
      <div>
        <h2 style={{ fontSize: "var(--text-lg)" }}>{tl.fileListTitle}</h2>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "var(--space-2)" }}>
          {(content?.files || []).map((file) => (
            <li key={file.fileName}>
              <a href={file.downloadUrl} className="pf-btn pf-btn--secondary pf-btn--sm">
                {file.fileName}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (type === "live") {
    const stateLabel = { "a-venir": tl.liveUpcoming, "en-cours": tl.liveOngoing, passee: tl.livePast }[
      content?.state
    ];
    return (
      <div>
        <Badge tone={content?.state === "en-cours" ? "accent" : "neutral"}>{stateLabel}</Badge>
        <p style={{ marginTop: "var(--space-3)" }}>
          {new Date(content?.startsAt).toLocaleString(undefined, {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </p>
        {content?.state !== "passee" && content?.link && (
          <a href={content.link} target="_blank" rel="noreferrer" className="pf-btn pf-btn--primary pf-btn--md">
            {tl.liveJoin}
          </a>
        )}
        {content?.state !== "passee" && (
          <a
            href={buildIcsUrl(content)}
            download="session.ics"
            className="pf-btn pf-btn--secondary pf-btn--md"
            style={{ marginLeft: "var(--space-3)" }}
          >
            {tl.liveAddToCalendar}
          </a>
        )}
      </div>
    );
  }

  // simulateur / exercice (Mission 23 Étape 3). Sur mobile, aucune tentative
  // de charger le terminal -- juste le message prévu (DESIGN-SYSTEM,
  // demande explicite de Massy : "sans expérience dégradée").
  if (isMobile) {
    return (
      <div>
        <h2 style={{ fontSize: "var(--text-lg)" }}>{tl.mobileBlockedTitle}</h2>
        <p style={{ color: "var(--ink-2)", marginTop: "var(--space-2)" }}>{tl.mobileBlockedBody}</p>
      </div>
    );
  }

  const isExercise = type === "exercice";
  return (
    <Card>
      <p style={{ color: "var(--ink-2)", marginBottom: "var(--space-4)" }}>
        {isExercise ? tl.exerciseIntro : tl.simulatorIntro}
      </p>
      <Button variant="primary" onClick={onOpenSimulator}>
        {isExercise ? tl.openExercise : tl.openSimulator}
      </Button>
    </Card>
  );
}
