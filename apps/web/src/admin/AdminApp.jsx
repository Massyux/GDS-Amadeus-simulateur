import { useState } from "react";
import AdminLogin from "./AdminLogin.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import CoursesAdmin from "./CoursesAdmin.jsx";
import AuditLogView from "./AuditLogView.jsx";

// Session-only (not localStorage): closing the tab signs Massy out, no
// long-lived admin credential sitting in the browser between visits.
const SESSION_KEY = "simulateur-amadeus:admin-token";

const TABS = [
  { id: "licenses", label: "Licences" },
  { id: "courses", label: "Formations" },
  { id: "audit", label: "Journal" },
];

export default function AdminApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY));
  const [tab, setTab] = useState("licenses");

  if (!token) {
    return (
      <AdminLogin
        onLoggedIn={(t) => {
          sessionStorage.setItem(SESSION_KEY, t);
          setToken(t);
        }}
      />
    );
  }

  const onLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setToken(null);
  };

  return (
    <>
      {/* Chaque onglet garde son propre en-tête/titre/déconnexion (Mission
          14, AdminDashboard.jsx) -- cette barre ne fait que choisir lequel
          est affiché, elle ne duplique aucune action. */}
      <nav className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "licenses" && <AdminDashboard token={token} onLogout={onLogout} />}
      {tab === "courses" && <CoursesAdmin token={token} onLogout={onLogout} />}
      {tab === "audit" && <AuditLogView token={token} onLogout={onLogout} />}
    </>
  );
}
