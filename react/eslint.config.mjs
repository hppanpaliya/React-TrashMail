import { createRequire } from "node:module";
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

// eslint-plugin-react's runtime `version: "detect"` uses context.getFilename(),
// which was removed in ESLint 10, so detect the installed React version here
// at config-load time instead and pass it explicitly.
const require = createRequire(import.meta.url);
const reactVersion = require("react/package.json").version;

export default [
  {
    ignores: ["build/", "node_modules/", "coverage/"],
  },
  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: reactVersion,
      },
    },
    rules: {
      // Plain-JS app; prop-types are not used anywhere in this codebase.
      "react/prop-types": "off",
      // React Compiler-era rule; this codebase deliberately uses the classic
      // "reset state in an effect keyed on props/route change" pattern in many
      // components, and restructuring them is not behavior-preserving.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Node-run config files.
    files: ["*.{js,mjs,cjs}", "vite.config.js", "eslint.config.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // Vitest runs with globals: true (see vite.config.js).
    files: ["src/**/*.test.{js,jsx}", "src/setupTests.js"],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.node,
      },
    },
  },
];
