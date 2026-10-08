import { useEffect, useState } from "react";

// Journal d'audit (docs/SECURITE.md §7, Mission 23 Étape 4) -- lecture
// seule, pas d'action possible depuis cet écran.
async function apiFetch(path, token) {
  const res = await fetch(path, { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return res.json();
}

export default function AuditLogView({ token, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/admin/audit-log", token)
      .then((data) => {
        if (!cancelled) setEntries(data.entries || []);
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

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1 className="admin-title">Journal</h1>
        <div className="admin-header-actions">
          <button type="button" onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : entries.length === 0 ? (
        <p>Aucune action enregistrée pour le moment.</p>
      ) : (
        <table className="admin-licenses-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Cible</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.createdAt}</td>
                <td>{entry.action}</td>
                <td>{entry.target || "—"}</td>
                <td>{entry.details ? JSON.stringify(entry.details) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
