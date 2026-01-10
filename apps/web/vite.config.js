import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@simulateur/core": path.resolve(
        __dirname,
        "../../packages/core/src/index.js"
      ),
      "@simulateur/data": path.resolve(
        __dirname,
        "../../packages/data/src/index.js"
      ),
    },
  },
});
