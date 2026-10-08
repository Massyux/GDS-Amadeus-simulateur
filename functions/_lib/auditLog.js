// Journal d'audit des actions admin (docs/SECURITE.md §7, migrations/0003).
// Un seul admin existe (pas de compte multi-utilisateur pour /admin) --
// `actor` est toujours "admin", jamais paramétré. Best-effort : une panne
// d'écriture du journal ne doit jamais faire échouer l'action admin
// elle-même (ex: un cours bien créé mais dont la trace échoue reste un
// cours créé) -- avalée silencieusement plutôt que de propager l'erreur.
export async function recordAudit(env, { action, target, details } = {}) {
  if (!env.DB || !action) return;
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log (actor, action, target, details) VALUES ('admin', ?, ?, ?)`
    )
      .bind(action, target ?? null, details ? JSON.stringify(details) : null)
      .run();
  } catch {
    // best-effort, voir commentaire ci-dessus.
  }
}
