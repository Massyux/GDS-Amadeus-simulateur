// Client API pour l'espace étudiant (Mission 23 Étape 2). La session vit
// dans un cookie HttpOnly (functions/_lib/session.js) -- invisible et
// inutile à lire ici ; `credentials: "same-origin"` suffit à ce qu'il parte
// avec chaque requête. Le jeton CSRF (non sensible) vient de /api/auth/me et
// doit être renvoyé dans l'en-tête X-CSRF-Token sur toute requête qui
// modifie l'état (docs/SECURITE.md §3).
async function request(path, { method = "GET", body, csrfToken } = {}) {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const authApi = {
  me: () => request("/api/auth/me"),
  register: (email, password, firstName, lastName) =>
    request("/api/auth/register", { method: "POST", body: { email, password, firstName, lastName } }),
  login: (email, password) => request("/api/auth/login", { method: "POST", body: { email, password } }),
  logout: (csrfToken) => request("/api/auth/logout", { method: "POST", csrfToken }),
  forgotPassword: (email, lang) =>
    request("/api/auth/forgot-password", { method: "POST", body: { email, lang } }),
  resetPassword: (token, newPassword) =>
    request("/api/auth/reset-password", { method: "POST", body: { token, newPassword } }),
};

export const platformApi = {
  courses: () => request("/api/courses"),
  course: (slug) => request(`/api/courses/${encodeURIComponent(slug)}`),
  enroll: (slug, csrfToken) => request(`/api/courses/${encodeURIComponent(slug)}/enroll`, { method: "POST", csrfToken }),
  lesson: (id) => request(`/api/lessons/${id}`),
  setLessonStatus: (id, status, csrfToken) =>
    request(`/api/lessons/${id}/progress`, { method: "POST", body: { status }, csrfToken }),
  account: () => request("/api/account"),
};
