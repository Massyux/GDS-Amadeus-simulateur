import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { defineConfig, devices } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(dirname, "../..");

// Dedicated config for the /admin e2e suite (missions/MISSION-14.md Etape 4:
// "UI /admin + Auth ... + tests Playwright dedies"). Separate from
// playwright.config.js because /admin needs REAL Cloudflare Pages
// Functions (login, licenses CRUD) talking to a REAL D1 -- `vite preview`
// doesn't run Functions at all, so this one serves the build through
// `wrangler pages dev` instead (run from the repo root, where wrangler.jsonc
// and .dev.vars live), isolated on its own port so it never competes with
// the main suite's webServer.
//
// Fresh, disposable D1 per run via --persist-to (same pattern as
// functions/__tests__/testServer.js), NOT the default repo-local
// .wrangler/state/v3/d1. Without this, the fixture licenses this suite
// creates every run ("Client E2E", "Client Revoke E2E") never get cleared
// and keep accumulating duplicate rows across local sessions, until a
// getByText("Client E2E") locator matches more than one row and the suite
// starts failing with a Playwright "strict mode violation" -- found by the
// 05/10/2026 resumption audit (AUDIT.md) after several months of local
// runs had piled up in the repo's persisted .wrangler state.
const persistDir = mkdtempSync(path.join(tmpdir(), "gds-d1-admin-e2e-"));

// The migration runs before `wrangler pages dev` every time (bug found in
// CI, Etape 3: a fresh checkout has no local D1 state at all, so licenses
// CRUD failed with no visible error until Playwright's assertions timed
// out). migrations/0001_init.sql is idempotent (CREATE ... IF NOT EXISTS)
// so re-running it against an already-migrated D1 is a safe no-op -- moot
// now that each run gets its own persistDir, but harmless to keep.
export default defineConfig({
  testDir: "./e2e-admin",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8799",
    trace: "on-first-retry",
  },
  webServer: {
    // Mission 23 Étape 4 (back-office formations) : migration 0003
    // (audit_log) + `--r2 CONTENT` ajoutés -- l'admin peut maintenant
    // téléverser des fichiers (functions/api/admin/upload.js) et consulter
    // le journal d'audit, tous deux absents quand cette config a été écrite
    // pour Mission 14 (licences seules, pas de fichier, pas de journal).
    command:
      `npm run build:web && npx wrangler d1 execute gds-licences --local --persist-to="${persistDir}" --file=migrations/0001_init.sql && npx wrangler d1 execute gds-licences --local --persist-to="${persistDir}" --file=migrations/0002_platform_users.sql && npx wrangler d1 execute gds-licences --local --persist-to="${persistDir}" --file=migrations/0003_audit_log.sql && npx wrangler pages dev apps/web/dist --port 8799 --persist-to="${persistDir}" --r2 CONTENT`,
    cwd: REPO_ROOT,
    url: "http://localhost:8799",
    reuseExistingServer: !process.env.CI,
    // Same headroom as playwright.config.js -- build + migration + wrangler
    // startup can take close to a minute on a cold run.
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
