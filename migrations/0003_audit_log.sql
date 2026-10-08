-- Mission 23 — plateforme e-learning, Étape 4 (back-office formations).
--
-- NE JAMAIS modifier 0001_init.sql / 0002_platform_users.sql (déjà appliqués).
-- Additif uniquement, IF NOT EXISTS partout (ré-appliqué avant chaque run
-- local/test, voir l'en-tête de 0002).
--
-- docs/SECURITE.md §7 (Administration) exige un journal d'audit des actions
-- admin, consultable dans /admin — jamais construit jusqu'ici (gap confirmé
-- en explorant le code existant de Mission 14). Un seul admin existe
-- (pas de compte multi-utilisateur pour /admin, voir functions/api/admin/
-- login.js) : `actor` est donc toujours la constante "admin", pas une
-- référence à `users` — inutile de la lier à la table des comptes étudiants,
-- qui n'a d'ailleurs aucun rapport avec l'accès admin.

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL DEFAULT 'admin',
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
