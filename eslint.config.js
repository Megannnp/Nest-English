import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.claude/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.next/**",
      "client/public/**",
      "server/data/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["client/src/**/*.{js,jsx}"],
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
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
        ...globals.node,
      },
    },
    rules: {
      complexity: ["warn", 15],
      "no-console": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/no-unresolved": ["error", { commonjs: true, caseSensitive: true }],
      "import/order": [
        "warn",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
        },
      ],
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx"],
        },
      },
    },
  },
  {
    files: ["server/**/*.{js,mjs}", "scripts/**/*.{js,mjs}", "*.{js,mjs}"],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      complexity: ["warn", 15],
      "no-console": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/no-unresolved": ["error", { commonjs: true, caseSensitive: true }],
      "import/order": [
        "warn",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
        },
      ],
    },
  },
  {
    // Playwright specs run in Node but evaluate callbacks inside the browser,
    // so they legitimately reference both global sets.
    files: ["client/e2e/**/*.{js,mjs}", "client/playwright.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    files: [
      "client/src/components/workbench/useTeacherWorkbenchData.js",
      "client/src/components/workbench/useTeacherWorkbenchActions.js",
      "client/src/components/workbench/useTeacherWorkbenchDerivedState.js",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../TeacherWorkbenchPage.jsx", "./useTeacherWorkbenchModel.js"],
              message: "workbench leaf hooks must stay below the page/coordinator layer.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["server/services/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../routes/*"],
              message: "services must not depend on route modules.",
            },
          ],
        },
      ],
    },
  },
];
