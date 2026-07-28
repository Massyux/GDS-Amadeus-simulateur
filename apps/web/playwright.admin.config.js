import path from "node:path";
import { fileURLToPath } from "node:url";
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
// The migration runs before `wrangler pages dev` every time (bug found in
// CI, Etape 3: a fresh checkout has no local D1 state at all, so licenses
// CRUD failed with no visible error until Playwright's assertions timed
// out). migrations/0001_init.sql is idempotent (CREATE ... IF NOT EXISTS)
// so re-running it against an already-migrated local D1 (repeat local runs)
// is a safe no-op.
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
    command:
      "npm run build:web && npx wrangler d1 execute gds-licences --local --file=migrations/0001_init.sql && npx wrangler pages dev apps/web/dist --port 8799",
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
