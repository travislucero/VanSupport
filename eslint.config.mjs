import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      sourceType: "module", // 👈 tell ESLint we’re using ES Modules
      globals: { ...globals.browser, ...globals.node },
    },
    extends: [js.configs.recommended, prettier],
  },
]);
