import { Fragment, useEffect, useState } from "react";

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

function exportCsv(licenses) {
  const header = "id,tier,maxDevices,devicesUsed,clientName,status,createdAt,lastActivity";
  const rows = licenses.map((l) =>
    [l.id, l.tier, l.maxDevices, l.devicesUsed, l.clientName || "", l.status, l.createdAt, l.lastActivity || ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `licences-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard({ token, onLogout }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [tier, setTier] = useState("individual");
  const [maxDevices, setMaxDevices] = useState(2);
  const [clientName, setClientName] = useState("");
  const [justCreated, setJustCreated] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [activations, setActivations] = useState([]);

  async function refresh() {
    setLoading(true);
    try {
      const data = await apiFetch("/api/admin/licenses", token);
      setLicenses(data.licenses || []);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") onLogout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/admin/licenses", token)
      .then((data) => {
        if (!cancelled) setLicenses(data.licenses || []);
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
    const data = await apiFetch("/api/admin/licenses", token, {
      method: "POST",
      body: JSON.stringify({
        tier,
        maxDevices: tier === "school" ? maxDevices : undefined,
        clientName,
      }),
    });
    setJustCreated(data.key);
    setClientName("");
    setFormOpen(false);
    await refresh();
  }

  async function toggleStatus(license) {
    const nextStatus = license.status === "active" ? "revoked" : "active";
    await apiFetch(`/api/admin/licenses/${license.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    await refresh();
  }

  async function extend(license) {
    const input = window.prompt(
      `Nouveau nombre maximum d'appareils pour ${license.clientName || license.id} (2-4) :`,
      String(license.maxDevices)
    );
    const n = Number.parseInt(input, 10);
    if (!Number.isFinite(n)) return;
    await apiFetch(`/api/admin/licenses/${license.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ maxDevices: n }),
    });
    await refresh();
  }

  async function toggleExpand(license) {
    if (expandedId === license.id) {
      setExpandedId(null);
      return;
    }
    const data = await apiFetch(`/api/admin/licenses/${license.id}/activations`, token);
    setActivations(data.activations || []);
    setExpandedId(license.id);
  }

  async function freeDevice(activationId, licenseId) {
    await apiFetch(`/api/admin/activations/${activationId}`, token, { method: "DELETE" });
    const data = await apiFetch(`/api/admin/licenses/${licenseId}/activations`, token);
    setActivations(data.activations || []);
    await refresh();
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1 className="admin-title">Licences</h1>
        <div className="admin-header-actions">
          <button type="button" onClick={() => exportCsv(licenses)}>
            Export CSV
          </button>
          <button type="button" onClick={() => setFormOpen((v) => !v)}>
            Nouvelle clé
          </button>
          <button type="button" onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      </div>

      {justCreated && (
        <div className="admin-new-key-banner" role="alert">
          Nouvelle clé (affichée une seule fois, notez-la) : <code>{justCreated}</code>
          <button type="button" onClick={() => setJustCreated(null)}>
            OK
          </button>
        </div>
      )}

      {formOpen && (
        <form className="admin-new-license-form" onSubmit={handleCreate}>
          <label>
            Client
            <input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Nom du client"
            />
          </label>
          <label>
            Palier
            <select value={tier} onChange={(event) => setTier(event.target.value)}>
              <option value="individual">Individuel (1 poste)</option>
              <option value="school">École (2-4 postes)</option>
            </select>
          </label>
          {tier === "school" && (
            <label>
              Postes max
              <input
                type="number"
                min={2}
                max={4}
                value={maxDevices}
                onChange={(event) => setMaxDevices(Number(event.target.value))}
              />
            </label>
          )}
          <button type="submit">Générer</button>
        </form>
      )}

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <table className="admin-licenses-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Palier</th>
              <th>Appareils</th>
              <th>Dernière activité</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((license) => (
              <Fragment key={license.id}>
                <tr>
                  <td>{license.clientName || "—"}</td>
                  <td>{license.tier}</td>
                  <td>
                    <button type="button" onClick={() => toggleExpand(license)}>
                      {license.devicesUsed}/{license.maxDevices}
                    </button>
                  </td>
                  <td>{license.lastActivity || "jamais"}</td>
                  <td>{license.status === "active" ? "active" : "révoquée"}</td>
                  <td className="admin-actions-cell">
                    <button type="button" onClick={() => toggleStatus(license)}>
                      {license.status === "active" ? "Révoquer" : "Réactiver"}
                    </button>
                    {license.tier === "school" && (
                      <button type="button" onClick={() => extend(license)}>
                        Prolonger
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === license.id && (
                  <tr>
                    <td colSpan={6}>
                      <ul className="admin-device-list">
                        {activations.length === 0 && <li>Aucun appareil activé.</li>}
                        {activations.map((activation) => (
                          <li key={activation.id}>
                            {activation.deviceFingerprint.slice(0, 12)}… — vu le{" "}
                            {activation.lastSeenAt}
                            <button
                              type="button"
                              onClick={() => freeDevice(activation.id, license.id)}
                            >
                              Libérer ce poste
                            </button>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
