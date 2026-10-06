-- Mission 23 — plateforme e-learning, Étape 1 (modèle de données + auth étudiant).
--
-- NE JAMAIS modifier 0001_init.sql (déjà appliqué en production) — ce fichier est
-- additif uniquement. IF NOT EXISTS partout, pour les mêmes raisons que 0001
-- (ré-appliqué par les webServer Playwright/tests avant chaque run local).
--
-- docs/SECURITE.md §1-3 gouverne ce schéma : mots de passe hachés PBKDF2 (jamais en
-- clair, jamais côté client), sessions révocables individuellement (table dédiée,
-- pas un jeton purement stateless — voir functions/_lib/session.js), limitation de
-- débit par compteur D1 (pas de nouveau binding Cloudflare).

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- format "pbkdf2$<iterations>$<sel-hex>$<hash-hex>"
  first_name TEXT,
  last_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Rattachement licences <-> comptes (Architecture de MISSION-23.md : "une licence
-- appartient désormais à un compte") VOLONTAIREMENT PAS FAIT ICI : `ALTER TABLE
-- licenses ADD COLUMN` n'a pas d'équivalent IF NOT EXISTS en SQLite/D1 (contrairement
-- à CREATE TABLE/INDEX), donc le poser maintenant sans aucun code qui le consomme
-- encore casserait la ré-application idempotente de ce fichier avant chaque run
-- local/CI (même famille de piège que le bug e2e admin du 06/10/2026 -- état D1 qui
-- ne supporte pas d'être rejoué). Étape 1 ("rien d'affiché encore") n'a besoin que
-- de `users`+auth ; `licenses.user_id` sera ajouté dans sa propre migration à
-- l'Étape où un étudiant active réellement une licence depuis son compte (2 ou 3),
-- avec l'idempotence résolue à ce moment (vérification d'existence de colonne avant
-- l'ALTER, dans le code qui l'exécute plutôt que dans le fichier .sql lui-même).

-- Sessions étudiant : une ligne par connexion active, révocable individuellement
-- (logout d'un seul appareil sans toucher aux autres — docs/SECURITE.md §2). Le
-- cookie transporte un jeton SIGNÉ (functions/_lib/session.js, réutilise
-- functions/_lib/token.js) dont le payload contient cet `id` ; la signature prouve
-- que le serveur l'a émis, cette table prouve qu'il est encore valide maintenant
-- (même distinction que documentée dans token.js : une signature ne prouve jamais
-- qu'un jeton est "encore valide", seulement qu'il a été émis).
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Réinitialisation de mot de passe (docs/SECURITE.md §1) : jeton 32 octets,
-- STOCKÉ HACHÉ (jamais en clair), usage unique, expiration 30 min.
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

-- Limitation de débit (docs/SECURITE.md §3) : un compteur D1 générique, pas un
-- nouveau binding Cloudflare (KV/Rate Limiting API) pour une seule plateforme —
-- CONSTITUTION §8. `bucket_key` encode la route et la clé de limitation, ex.
-- "login:203.0.113.4:eleve@example.com" ou "register:203.0.113.4". Les lignes de
-- plus d'un jour sont purgées opportunément par functions/_lib/rateLimit.js à
-- chaque appel (pas de cron) : table toujours petite en pratique.
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket ON rate_limit_attempts(bucket_key, created_at);

-- --- Catalogue (Architecture de MISSION-23.md) : rien n'est encore affiché ni
-- administrable (Étapes 2/4) -- seul le schéma est posé ici, comme demandé.

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);

-- `type` est une liste fermée (CHECK) qui inclut déjà `quiz` bien qu'aucun quiz
-- n'existe encore -- MISSION-23.md "Points d'extension à réserver" #1 : ajouter une
-- valeur à une contrainte CHECK en production est une migration évitable.
-- `content` est un blob JSON dont la forme dépend de `type` (corps markdown, URL
-- vidéo, clé(s) R2, id d'exercice, détails de session live...) -- une table par
-- type aurait figé une mission qui doit encore accueillir Mission 24 (quiz).
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL REFERENCES modules(id),
  type TEXT NOT NULL CHECK (
    type IN ('texte', 'video', 'pdf', 'fichier', 'live', 'simulateur', 'exercice', 'quiz')
  ),
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

-- `score`/`max_score` nullable dès maintenant -- MISSION-23.md "Points d'extension
-- à réserver" #2 : Mission 24 (quiz) les remplira sans toucher au schéma, l'Étape 2
-- ne fait que du "terminé / pas terminé". `last_command` -- "Points d'extension" #3
-- ("le lecteur de leçon expose proprement ... quelle dernière commande") : alimenté
-- par l'Étape 3 (intégration simulateur), lu par la future Mission 25 (assistant IA).
CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  lesson_id INTEGER NOT NULL REFERENCES lessons(id),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'in_progress', 'completed')
  ),
  score INTEGER,
  max_score INTEGER,
  last_command TEXT,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
