-- Mission (prompt architecte 17/10/2026) — fiche de formation, vitrine d'accueil.
--
-- NE JAMAIS modifier 0001/0002/0003 (déjà appliqués). Additif uniquement,
-- IF NOT EXISTS partout (ré-appliqué avant chaque run local/test, voir
-- l'en-tête de 0002).
--
-- La fiche de formation a besoin d'objectifs ("ce que tu vas apprendre") et
-- d'une durée estimée, qu'aucune colonne existante ne porte. Une TABLE à
-- part plutôt qu'un `ALTER TABLE courses ADD COLUMN` : SQLite/D1 n'a pas
-- d'équivalent IF NOT EXISTS pour ADD COLUMN, et ce schéma est rejoué tel
-- quel par apps/web/playwright.config.js contre un D1 local PERSISTANT
-- (pas un --persist-to jetable comme functions/__tests__) -- un ADD COLUMN
-- brut y échouerait "duplicate column name" dès le deuxième lancement de
-- la suite e2e. CREATE TABLE IF NOT EXISTS n'a pas ce problème, c'est le
-- motif déjà utilisé par 0001/0002/0003.
--
-- Pas de prix : l'inscription est gratuite et immédiate aujourd'hui (aucun
-- paiement n'existe, Mission 22) -- afficher un prix à côté d'un bouton qui
-- inscrit gratuitement serait malhonnête (CONSTITUTION.md §5). La fiche
-- affiche donc toujours "Gratuit" tant que Mission 22 n'a pas changé ça ;
-- pas de colonne à ajouter pour une donnée qui ne doit pas encore exister.
CREATE TABLE IF NOT EXISTS course_extras (
  course_id INTEGER PRIMARY KEY REFERENCES courses(id),
  objectives TEXT, -- JSON array de chaînes ("ce que tu vas apprendre")
  duration_hours INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
