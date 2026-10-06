import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(dirname, "../..");

// Mission 14 Etape 3: AccessGate now calls the real /api/license/activate +
// /api/license/check Cloudflare Pages Functions instead of the retired
// client-side ACCESS_KEY_HASHES fallback -- `vite preview` doesn't run
// Functions at all, so this suite needs `wrangler pages dev` + a real local
// D1 too, same as playwright.admin.config.js. The migration and the
// GDS-TEST-0001 seed fixture are both idempotent, safe to re-run on every
// local/CI invocation against the persisted local D1 state.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command:
      "npm run build:web && npx wrangler d1 execute gds-licences --local --file=migrations/0001_init.sql && npx wrangler d1 execute gds-licences --local --file=migrations/0002_platform_users.sql && npx wrangler d1 execute gds-licences --local --file=scripts/seed-e2e-test-license.sql && npx wrangler pages dev apps/web/dist --port 4173",
    cwd: REPO_ROOT,
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    // build + 2 chained `wrangler d1 execute --local` calls + `wrangler
    // pages dev` startup measured at ~50s on a cold run -- 60s was too
    // tight and flaked with "Timed out waiting ... from config.webServer".
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
