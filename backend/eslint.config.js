const js = require("@eslint/js");
const ts = require("typescript-eslint");
const globals = require("globals");

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: [
      "dist",
      "node_modules",
      ".next",
      "coverage",
      "eslint.config.js",
      "jest.config.cjs",
      "tests/**/*.js",
      "prisma/seed.ts"
    ]
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      // Project uses `any` at boundaries; tighten gradually if desired.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    }
  }
];
