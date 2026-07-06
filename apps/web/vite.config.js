import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Confirmed rolldown-vite 7.2.5 was leaving a stale dist/index.html from
    // an earlier build in place instead of the default emptyOutDir behavior
    // - production served the old file (Vite's default <title>frontend</title>)
    // even after several rebuilds. Force it explicitly.
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@simulateur/core": path.resolve(
        dirname,
        "../../packages/core/src/index.js"
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    // the default "forks" pool hangs on Windows with this workspace setup
    pool: "threads",
    // e2e/ holds Playwright specs, not Vitest specs -- keep them apart
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "e2e/**",
    ],
  },
});
