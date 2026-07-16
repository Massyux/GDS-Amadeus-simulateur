export default {
  "apps/web/**/*.{js,jsx}": [
    "eslint --config apps/web/eslint.config.js --fix",
  ],
  "packages/core/src/**/*.js": () => "npm --prefix packages/core run typecheck",
  "packages/exercises/src/**/*.js": () =>
    "npm --prefix packages/exercises run typecheck",
};
