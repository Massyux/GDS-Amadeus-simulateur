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

export async function startTestServer() {
  const persistDir = mkdtempSync(path.join(tmpdir(), "gds-d1-test-"));
  const port = 8790 + Math.floor(Math.random() * 500);

  execSync(
    `${NPX} wrangler d1 execute gds-licences --local --persist-to="${persistDir}" --file=migrations/0001_init.sql`,
    { cwd: REPO_ROOT, stdio: "ignore", shell: true }
  );

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
    ],
    { cwd: REPO_ROOT, stdio: "ignore", shell: process.platform === "win32" }
  );

  const baseUrl = `http://localhost:${port}`;
  await waitForReady(`${baseUrl}/`);

  return {
    baseUrl,
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
      rmSync(persistDir, { recursive: true, force: true });
    },
  };
}

// .dev.vars (gitignored, committed locally by this session) pins
// ADMIN_SECRET_HASH to the SHA-256 of this exact string -- see its header
// comment and functions/api/admin/login.js.
export const TEST_ADMIN_SECRET = "test-admin-secret";
