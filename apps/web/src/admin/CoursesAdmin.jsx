import { useEffect, useState } from "react";
import { exercises } from "@simulateur/exercises";

// Back-office formations (Mission 23 Étape 4). Même convention que
// AdminDashboard.jsx (Mission 14) : pas de bibliothèque UI, pas de
// composants de apps/web/src/platform/ui/* -- table/formulaire HTML bruts,
// classes .admin-* de apps/web/src/index.css. `apiFetch` est le même
// utilitaire copié-collé volontairement (pas d'import croisé entre deux
// fichiers "feature" -- chacun reste autonome, cohérent avec le reste du
// dossier).
async function apiFetch(path, token, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return res.json();
}

// `quiz` existe dans la contrainte CHECK de migrations/0002 (réservé pour la
// Mission 24) mais n'a pas de formulaire ici -- "ne rien implémenter de
// 24/25, juste ne pas se fermer la porte" (MISSION-23.md).
const LESSON_TYPES = ["texte", "video", "pdf", "fichier", "live", "simulateur", "exercice"];
const LESSON_TYPE_LABELS = {
  texte: "Texte",
  video: "Vidéo",
  pdf: "PDF",
  fichier: "Fichiers",
  live: "Session live",
  simulateur: "Terminal libre",
  exercice: "Exercice",
  quiz: "Quiz",
};

export default function CoursesAdmin({ token, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await apiFetch("/api/admin/courses", token);
      setCourses(data.courses || []);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") onLogout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/admin/courses", token)
      .then((data) => {
        if (!cancelled) setCourses(data.courses || []);
      })
      .catch((err) => {
        if (!cancelled && err.message === "UNAUTHORIZED") onLogout();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setError(null);
    const data = await apiFetch("/api/admin/courses", token, {
      method: "POST",
      body: JSON.stringify({ slug, title }),
    });
    if (data.error) {
      setError(data.error === "SLUG_ALREADY_USED" ? "Cet identifiant est déjà utilisé." : "Champs manquants.");
      return;
    }
    setSlug("");
    setTitle("");
    setFormOpen(false);
    await refresh();
    setSelectedId(data.course.id);
  }

  if (selectedId) {
    return (
      <CourseEditor
        courseId={selectedId}
        token={token}
        onLogout={onLogout}
        onBack={() => {
          setSelectedId(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1 className="admin-title">Formations</h1>
        <div className="admin-header-actions">
          <button type="button" onClick={() => setFormOpen((v) => !v)}>
            Nouvelle formation
          </button>
          <button type="button" onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      </div>

      {formOpen && (
        <form className="admin-new-license-form" onSubmit={handleCreate}>
          <label>
            Identifiant (slug)
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex: anglais-pro" required />
          </label>
          <label>
            Titre
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <button type="submit">Créer</button>
          {error && <span className="admin-login-error">{error}</span>}
        </form>
      )}

      {loading ? (
        <p>Chargement…</p>
      ) : courses.length === 0 ? (
        <p>Aucune formation pour le moment.</p>
      ) : (
        <table className="admin-licenses-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Statut</th>
              <th>Modules</th>
              <th>Leçons</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>{course.title}</td>
                <td>{course.status === "published" ? "publiée" : "brouillon"}</td>
                <td>{course.moduleCount}</td>
                <td>{course.lessonCount}</td>
                <td className="admin-actions-cell">
                  <button type="button" onClick={() => setSelectedId(course.id)}>
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CourseEditor({ courseId, token, onBack, onLogout }) {
  const [data, setData] = useState(null);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  async function refresh() {
    try {
      const fresh = await apiFetch(`/api/admin/courses/${courseId}`, token);
      setData(fresh);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") onLogout();
    }
  }

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/admin/courses/${courseId}`, token)
      .then((fresh) => {
        if (!cancelled) setData(fresh);
      })
      .catch((err) => {
        if (!cancelled && err.message === "UNAUTHORIZED") onLogout();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function togglePublish() {
    const nextStatus = data.course.status === "published" ? "draft" : "published";
    await apiFetch(`/api/admin/courses/${courseId}`, token, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    await refresh();
  }

  async function handleAddModule(event) {
    event.preventDefault();
    await apiFetch("/api/admin/modules", token, {
      method: "POST",
      body: JSON.stringify({ courseId, title: newModuleTitle }),
    });
    setNewModuleTitle("");
    setModuleFormOpen(false);
    await refresh();
  }

  async function handleDeleteModule(moduleId, moduleTitle) {
    if (!window.confirm(`Supprimer le module « ${moduleTitle} » et toutes ses leçons ?`)) return;
    await apiFetch(`/api/admin/modules/${moduleId}`, token, { method: "DELETE" });
    await refresh();
  }

  async function moveModule(module, direction) {
    const modules = data.modules;
    const idx = modules.findIndex((m) => m.id === module.id);
    const other = modules[idx + direction];
    if (!other) return;
    await apiFetch(`/api/admin/modules/${module.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ sortOrder: other.sortOrder }),
    });
    await apiFetch(`/api/admin/modules/${other.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ sortOrder: module.sortOrder }),
    });
    await refresh();
  }

  if (!data) return <p>Chargement…</p>;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1 className="admin-title">{data.course.title}</h1>
        <div className="admin-header-actions">
          <button type="button" onClick={onBack}>
            Retour aux formations
          </button>
          <button type="button" onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      </div>

      <CourseMetaForm course={data.course} token={token} onSaved={refresh} />

      <div className="admin-course-publish">
        <span>{data.course.status === "published" ? "Publiée" : "Brouillon"}</span>
        <button type="button" onClick={togglePublish}>
          {data.course.status === "published" ? "Dépublier" : "Publier"}
        </button>
      </div>

      <div className="admin-header-actions">
        <button type="button" onClick={() => setModuleFormOpen((v) => !v)}>
          Nouveau module
        </button>
      </div>
      {moduleFormOpen && (
        <form className="admin-new-license-form" onSubmit={handleAddModule}>
          <label>
            Titre du module
            <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} required />
          </label>
          <button type="submit">Ajouter</button>
        </form>
      )}

      {data.modules.map((module, idx) => (
        <ModuleBlock
          key={module.id}
          module={module}
          token={token}
          onRefresh={refresh}
          onDelete={() => handleDeleteModule(module.id, module.title)}
          onMoveUp={idx > 0 ? () => moveModule(module, -1) : null}
          onMoveDown={idx < data.modules.length - 1 ? () => moveModule(module, 1) : null}
        />
      ))}
    </div>
  );
}

function CourseMetaForm({ course, token, onSaved }) {
  const [title, setTitle] = useState(course.title);
  const [slug, setSlug] = useState(course.slug);
  const [level, setLevel] = useState(course.level || "");
  const [description, setDescription] = useState(course.description || "");
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const data = await apiFetch(`/api/admin/courses/${course.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ title, slug, level, description }),
    });
    if (data.error) {
      setError(data.error === "SLUG_ALREADY_USED" ? "Cet identifiant est déjà utilisé." : "Rien à enregistrer.");
      return;
    }
    await onSaved();
  }

  return (
    <form className="admin-new-license-form" onSubmit={handleSubmit}>
      <label>
        Titre
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Identifiant (slug)
        <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </label>
      <label>
        Niveau
        <input value={level} onChange={(e) => setLevel(e.target.value)} />
      </label>
      <label>
        Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <button type="submit">Enregistrer</button>
      {error && <span className="admin-login-error">{error}</span>}
    </form>
  );
}

function ModuleBlock({ module, token, onRefresh, onDelete, onMoveUp, onMoveDown }) {
  const [lessonFormOpen, setLessonFormOpen] = useState(false);

  async function handleAddLesson(payload) {
    await apiFetch("/api/admin/lessons", token, {
      method: "POST",
      body: JSON.stringify({ moduleId: module.id, ...payload }),
    });
    setLessonFormOpen(false);
    await onRefresh();
  }

  async function moveLesson(lesson, direction) {
    const lessons = module.lessons;
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    const other = lessons[idx + direction];
    if (!other) return;
    await apiFetch(`/api/admin/lessons/${lesson.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ sortOrder: other.sortOrder }),
    });
    await apiFetch(`/api/admin/lessons/${other.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ sortOrder: lesson.sortOrder }),
    });
    await onRefresh();
  }

  async function handleDeleteLesson(lessonId, lessonTitle) {
    if (!window.confirm(`Supprimer la leçon « ${lessonTitle} » ?`)) return;
    await apiFetch(`/api/admin/lessons/${lessonId}`, token, { method: "DELETE" });
    await onRefresh();
  }

  return (
    <div className="admin-module-block">
      <div className="admin-module-head">
        <h2>{module.title}</h2>
        <span className="admin-actions-cell">
          {onMoveUp && (
            <button type="button" onClick={onMoveUp} aria-label="Monter le module">
              ↑
            </button>
          )}
          {onMoveDown && (
            <button type="button" onClick={onMoveDown} aria-label="Descendre le module">
              ↓
            </button>
          )}
          <button type="button" onClick={() => setLessonFormOpen((v) => !v)}>
            Nouvelle leçon
          </button>
          <button type="button" onClick={onDelete}>
            Supprimer le module
          </button>
        </span>
      </div>

      {lessonFormOpen && <LessonForm token={token} submitLabel="Ajouter" onSubmit={handleAddLesson} />}

      <ul className="admin-lesson-list">
        {module.lessons.map((lesson, idx) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            token={token}
            onRefresh={onRefresh}
            onDelete={() => handleDeleteLesson(lesson.id, lesson.title)}
            onMoveUp={idx > 0 ? () => moveLesson(lesson, -1) : null}
            onMoveDown={idx < module.lessons.length - 1 ? () => moveLesson(lesson, 1) : null}
          />
        ))}
      </ul>
    </div>
  );
}

function LessonRow({ lesson, token, onRefresh, onDelete, onMoveUp, onMoveDown }) {
  const [editing, setEditing] = useState(false);

  async function handleSave(payload) {
    await apiFetch(`/api/admin/lessons/${lesson.id}`, token, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setEditing(false);
    await onRefresh();
  }

  return (
    <li className="admin-lesson-row">
      <div className="admin-lesson-row-head">
        <span className="admin-lesson-type">{LESSON_TYPE_LABELS[lesson.type] || lesson.type}</span>
        <span>{lesson.title}</span>
        <span className="admin-actions-cell">
          {onMoveUp && (
            <button type="button" onClick={onMoveUp} aria-label="Monter la leçon">
              ↑
            </button>
          )}
          {onMoveDown && (
            <button type="button" onClick={onMoveDown} aria-label="Descendre la leçon">
              ↓
            </button>
          )}
          <button type="button" onClick={() => setEditing((v) => !v)}>
            {editing ? "Fermer" : "Modifier"}
          </button>
          <button type="button" onClick={onDelete}>
            Supprimer
          </button>
        </span>
      </div>
      {editing && <LessonForm initial={lesson} token={token} submitLabel="Enregistrer" onSubmit={handleSave} />}
    </li>
  );
}

function LessonForm({ initial, token, submitLabel, onSubmit }) {
  const [type, setType] = useState(initial?.type || "texte");
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || {});

  function handleTypeChange(nextType) {
    setType(nextType);
    setContent({});
  }

  return (
    <form
      className="admin-lesson-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ type, title, content });
      }}
    >
      <label>
        Titre
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Type
        <select value={type} onChange={(e) => handleTypeChange(e.target.value)}>
          {LESSON_TYPES.map((t) => (
            <option key={t} value={t}>
              {LESSON_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      {type === "texte" && (
        <label>
          Contenu (markdown)
          <textarea value={content.body || ""} onChange={(e) => setContent({ body: e.target.value })} rows={6} />
        </label>
      )}

      {type === "video" && (
        <label>
          URL (YouTube/Vimeo non répertorié)
          <input value={content.embedUrl || ""} onChange={(e) => setContent({ embedUrl: e.target.value })} />
        </label>
      )}

      {type === "pdf" && <PdfUploadField content={content} setContent={setContent} token={token} />}
      {type === "fichier" && <FichierUploadField content={content} setContent={setContent} token={token} />}
      {type === "live" && <LiveFields content={content} setContent={setContent} />}

      {type === "exercice" && (
        <label>
          Exercice
          <select value={content.exerciseId || ""} onChange={(e) => setContent({ exerciseId: e.target.value })}>
            <option value="">— choisir —</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.titre.fr} (niveau {ex.niveau})
              </option>
            ))}
          </select>
        </label>
      )}

      {type === "simulateur" && <p>Rien à configurer — ouvre le terminal libre.</p>}

      <button type="submit">{submitLabel}</button>
    </form>
  );
}

function PdfUploadField({ content, setContent, token }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "X-File-Name": file.name },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "FILE_TOO_LARGE" ? "Fichier trop volumineux (25 Mo max)." : "Envoi impossible.");
        return;
      }
      setContent({ fileKey: data.fileKey, fileName: data.fileName });
    } finally {
      setUploading(false);
    }
  }

  return (
    <label>
      Fichier PDF
      <input type="file" accept="application/pdf" onChange={handleFile} />
      {uploading && <span> Envoi…</span>}
      {!uploading && content.fileName && <span> — {content.fileName} ✓</span>}
      {error && <span className="admin-login-error">{error}</span>}
    </label>
  );
}

function FichierUploadField({ content, setContent, token }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const files = content.files || [];

  async function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "X-File-Name": file.name },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "FILE_TOO_LARGE" ? "Fichier trop volumineux (25 Mo max)." : "Envoi impossible.");
        return;
      }
      setContent({ files: [...files, { fileKey: data.fileKey, fileName: data.fileName, sizeBytes: data.sizeBytes }] });
      event.target.value = "";
    } finally {
      setUploading(false);
    }
  }

  function removeFile(index) {
    setContent({ files: files.filter((_, i) => i !== index) });
  }

  return (
    <div>
      <label>
        Ajouter un fichier
        <input type="file" onChange={handleFile} />
      </label>
      {uploading && <p>Envoi…</p>}
      {error && <p className="admin-login-error">{error}</p>}
      {files.length > 0 && (
        <ul>
          {files.map((file, index) => (
            <li key={file.fileKey}>
              {file.fileName}
              <button type="button" onClick={() => removeFile(index)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LiveFields({ content, setContent }) {
  return (
    <>
      <label>
        Titre de la session
        <input value={content.title || ""} onChange={(e) => setContent({ ...content, title: e.target.value })} />
      </label>
      <label>
        Date et heure
        <input
          type="datetime-local"
          value={content.startsAt ? content.startsAt.slice(0, 16) : ""}
          onChange={(e) =>
            setContent({ ...content, startsAt: e.target.value ? new Date(e.target.value).toISOString() : "" })
          }
        />
      </label>
      <label>
        Durée (minutes)
        <input
          type="number"
          min={1}
          value={content.durationMinutes || 60}
          onChange={(e) => setContent({ ...content, durationMinutes: Number(e.target.value) })}
        />
      </label>
      <label>
        Lien (Zoom/Meet/Teams)
        <input value={content.link || ""} onChange={(e) => setContent({ ...content, link: e.target.value })} />
      </label>
    </>
  );
}
