// Test harness for the Cloudflare Pages Functions (Mission 14): spawns a
// real `wrangler pages dev` against an isolated, disposable local D1
// (fresh --persist-to temp dir, migrated once at startup), so tests run
// against the actual Functions runtime and the actual SQL -- no mocked D1,
// matching this project's "test the real thing" convention (packages/core,
// packages/exercises).
import { spawn, execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

async function waitForReady(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Server at ${url} never became ready: ${lastError}`);
}

/**
 * @param {{ extraSqlFiles?: string[] }} [options] Additional .sql files
 *   (repo-relative) applied after the two migrations, before the server
 *   starts -- e.g. scripts/seed-dev-course.sql for tests that need a real
 *   course/module/lesson to exercise (Mission 23 Étape 2). Opt-in: the
 *   license/auth test files don't need any course data.
 */
export async function startTestServer(options = {}) {
  const persistDir = mkdtempSync(path.join(tmpdir(), "gds-d1-test-"));
  const port = 8790 + Math.floor(Math.random() * 500);

  const files = [
    "migrations/0001_init.sql",
    "migrations/0002_platform_users.sql",
    ...(options.extraSqlFiles || []),
  ];
  for (const file of files) {
    execSync(
      `${NPX} wrangler d1 execute gds-licences --local --persist-to="${persistDir}" --file=${file}`,
      { cwd: REPO_ROOT, stdio: "ignore", shell: true }
    );
  }

  // shell:true is required on Windows to invoke npx.cmd at all (without it:
  // "spawn EINVAL") -- args are all internally-controlled constants (a
  // random port number, a temp dir path this file itself created), never
  // user input, so string-concatenation-instead-of-array-escaping is not a
  // real injection risk here despite Node's generic deprecation warning.
  const child = spawn(
    NPX,
    [
      "wrangler",
      "pages",
      "dev",
      "apps/web/dist",
      "--port",
      String(port),
      "--persist-to",
      persistDir,
      // Bare binding, no wrangler.jsonc entry (Mission 23 Étape 2): the real
      // R2 bucket doesn't exist in production yet, and that file is read by
      // Cloudflare Pages at deploy time -- adding it there now would risk
      // the exact "Invalid database UUID"-style deploy failure already
      // documented for D1 (wrangler.jsonc header comment, TASKS.md). `--r2
      // CONTENT` only affects this local process.
      "--r2",
      "CONTENT",
    ],
    { cwd: REPO_ROOT, stdio: "ignore", shell: process.platform === "win32" }
  );

  const baseUrl = `http://localhost:${port}`;
  await waitForReady(`${baseUrl}/`);

  return {
    baseUrl,
    // Every local/test request shares one fake client IP (see
    // functions/_lib/rateLimit.js clientIp) -- a real deployment has one IP
    // per visitor, but a test FILE making many register/login calls in a row
    // would otherwise trip its own rate limit and start interfering with
    // itself. Call this between tests that each need a full quota (Mission 23
    // Étape 1's auth-api.test.js uses it in beforeEach).
    //
    // Goes through the running worker's own HTTP route (functions/api/dev/
    // reset-rate-limits.js, gated by MAIL_DEV_ECHO) rather than spawning a
    // second `wrangler d1 execute` against the same --persist-to while
    // `wrangler pages dev` is already serving it: tried that first, it
    // causes ECONNRESET on the live server (two processes touching the same
    // SQLite file concurrently) -- unlike the migrations above, which only
    // ever run *before* the server starts.
    async resetRateLimits() {
      await fetch(`${baseUrl}/api/dev/reset-rate-limits`, { method: "POST" });
    },
    // Writes directly into the running worker's own R2 binding (functions/
    // api/dev/seed-file.js, same MAIL_DEV_ECHO gate) -- `wrangler r2 object
    // put` validates bucket names against real S3 rules even in --local
    // mode, and rejects the bare binding name "CONTENT" (uppercase), which
    // is also not a real bucket this process has any other handle on.
    // Writing from inside the worker guarantees the same storage the
    // Functions under test will read from.
    async seedFile(key, contents) {
      await fetch(`${baseUrl}/api/dev/seed-file`, {
        method: "POST",
        headers: { "X-Seed-Key": key },
        body: contents,
      });
    },
    async stop() {
      if (process.platform === "win32" && child.pid) {
        try {
          execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
        } catch {
          // already gone
        }
      } else {
        child.kill("SIGKILL");
      }
      // Windows ne relâche pas toujours immédiatement les handles sur les
      // fichiers SQLite (WAL/journal) du process tué juste au-dessus --
      // rmSync peut échouer en EPERM sur un dossier qui, une poignée de
      // millisecondes plus tard, se supprime sans problème. Quelques
      // essais avec un court délai suffisent ; jamais vu nécessiter plus
      // de 2-3 tentatives en pratique.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          rmSync(persistDir, { recursive: true, force: true });
          break;
        } catch (err) {
          if (err.code !== "EPERM" && err.code !== "EBUSY") throw err;
          if (attempt === 4) throw err;
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    },
  };
}

// .dev.vars (gitignored, committed locally by this session) pins
// ADMIN_SECRET_HASH to the SHA-256 of this exact string -- see its header
// comment and functions/api/admin/login.js.
export const TEST_ADMIN_SECRET = "test-admin-secret";
