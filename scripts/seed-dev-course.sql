-- Fixture pour le développement local (Mission 23 Étape 2) -- PAS une
-- migration, PAS à exécuter contre --remote. Avant l'Étape 4 (back-office),
-- rien ne peut créer une formation autrement qu'en écrivant directement en
-- base -- ce script donne quelque chose à parcourir pendant le développement
-- de l'espace étudiant. IDs explicites et fixes (comme
-- scripts/seed-e2e-test-license.sql) : sans risque en local/test, jamais
-- exécuté en production.
--
-- Types `pdf`/`fichier` volontairement absents d'ici : leur contenu vit sur
-- R2, pas dans ce script SQL -- voir functions/__tests__/platform-api.test.js
-- (seedFile) pour comment les tests automatisés y seedent un objet R2 local.

INSERT INTO courses (id, slug, title, description, level, status, sort_order)
VALUES (
  1,
  'amadeus-niveau-1',
  'Amadeus — Niveau 1',
  'Apprends les bases de la réservation sur un vrai terminal GDS : disponibilité, vente, dossier complet.',
  'Débutant',
  'published',
  1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modules (id, course_id, title, sort_order)
VALUES (1, 1, 'Module 1 — Découverte', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (id, module_id, type, title, sort_order, content)
VALUES
  (
    1, 1, 'texte', 'Bienvenue', 1,
    '{"body":"Ceci est une leçon de démonstration (Mission 23, Étape 2).\n\n## Au programme\n\nLire une disponibilité, vendre un vol, construire un dossier complet."}'
  ),
  (
    2, 1, 'video', 'Vidéo de présentation', 2,
    '{"embedUrl":"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"}'
  ),
  (
    3, 1, 'live', 'Session live de lancement', 3,
    '{"title":"Session live de lancement","startsAt":"2026-12-01T18:00:00.000Z","durationMinutes":60,"link":"https://meet.example.com/amadeus-niveau-1"}'
  ),
  (
    4, 1, 'pdf', 'Support de cours', 4,
    '{"fileKey":"support.pdf","fileName":"support.pdf"}'
  ),
  (
    5, 1, 'fichier', 'Fiches mémo', 5,
    '{"files":[{"fileKey":"fiche1.txt","fileName":"fiche1.txt"},{"fileKey":"fiche2.txt","fileName":"fiche2.txt"}]}'
  )
ON CONFLICT (id) DO NOTHING;
