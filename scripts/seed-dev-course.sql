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

-- `durationMinutes`/`isPreview` vivent dans ce même `content` JSON plutôt
-- que dans une colonne dédiée (prompt architecte 17/10/2026, chantier 2) :
-- `content` est déjà un blob libre par leçon (voir l'en-tête de
-- migrations/0002_platform_users.sql), ajouter ces deux clés universelles
-- ne casse aucune lecture existante qui ignore des clés qu'elle ne connaît
-- pas. La première leçon est un aperçu gratuit, ouvrable sans compte.
INSERT INTO lessons (id, module_id, type, title, sort_order, content)
VALUES
  (
    1, 1, 'texte', 'Bienvenue', 1,
    '{"body":"Ceci est une leçon de démonstration (Mission 23, Étape 2).\n\n## Au programme\n\nLire une disponibilité, vendre un vol, construire un dossier complet.","durationMinutes":5,"isPreview":true}'
  ),
  (
    2, 1, 'video', 'Vidéo de présentation', 2,
    '{"embedUrl":"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ","durationMinutes":8}'
  ),
  (
    3, 1, 'live', 'Session live de lancement', 3,
    '{"title":"Session live de lancement","startsAt":"2026-12-01T18:00:00.000Z","durationMinutes":60,"link":"https://meet.example.com/amadeus-niveau-1"}'
  ),
  (
    4, 1, 'pdf', 'Support de cours', 4,
    '{"fileKey":"support.pdf","fileName":"support.pdf","sizeBytes":245000,"durationMinutes":10}'
  ),
  (
    5, 1, 'fichier', 'Fiches mémo', 5,
    '{"files":[{"fileKey":"fiche1.txt","fileName":"fiche1.txt"},{"fileKey":"fiche2.txt","fileName":"fiche2.txt"}],"durationMinutes":5}'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_extras (course_id, objectives, duration_hours)
VALUES (
  1,
  '["Lire un écran de disponibilité (AN) et comprendre chaque colonne","Vendre un vol et construire un dossier complet (PNR)","Tarifer et émettre un billet dans les règles Amadeus","Corriger une erreur dans un dossier sans tout recommencer"]',
  12
)
ON CONFLICT (course_id) DO NOTHING;

-- Module 2 -- pratique au clavier (Mission 23 Étape 3) : chaque leçon
-- `exercice` pointe vers un fichier de packages/exercises/content/ par son
-- id (`content.exerciseId`), évalué côté client par @simulateur/exercises --
-- rien à dupliquer ici. Terminé par un accès libre au vrai terminal.
INSERT INTO modules (id, course_id, title, sort_order)
VALUES (2, 1, 'Module 2 — Pratique au clavier', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (id, module_id, type, title, sort_order, content)
VALUES
  (6, 2, 'exercice', 'Lire une disponibilité', 1, '{"exerciseId":"ex-01-read-availability"}'),
  (7, 2, 'exercice', 'Décoder ville, pays et compagnie', 2, '{"exerciseId":"ex-02-decode"}'),
  (8, 2, 'exercice', 'Première vente', 3, '{"exerciseId":"ex-03-first-sale"}'),
  (9, 2, 'exercice', 'Un dossier complet', 4, '{"exerciseId":"ex-04-full-pnr"}'),
  (10, 2, 'exercice', 'Vente directe sans disponibilité', 5, '{"exerciseId":"ex-05-long-sell"}'),
  (11, 2, 'exercice', 'Retrouver et modifier un dossier', 6, '{"exerciseId":"ex-06-retrieve-modify"}'),
  (12, 2, 'exercice', 'Corriger des erreurs', 7, '{"exerciseId":"ex-07-fix-mistakes"}'),
  (13, 2, 'exercice', 'Tarifer et émettre', 8, '{"exerciseId":"ex-08-price-and-issue"}'),
  (14, 2, 'exercice', 'Liste d''attente', 9, '{"exerciseId":"ex-09-waitlist"}'),
  (15, 2, 'exercice', 'Dossier complet de A à Z', 10, '{"exerciseId":"ex-10-full-workflow"}'),
  (16, 2, 'simulateur', 'Terminal libre', 11, '{}')
ON CONFLICT (id) DO NOTHING;
