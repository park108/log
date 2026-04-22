// ESLint flat config — ported 1:1 from legacy .eslintrc.yml + .eslintignore.
// Migration artifact for TSK-20260420-26 (REQ-20260420-022, REQ-20260419-003,
// SPEC common/accessibility-spec §3.4.2). Semantic changes: 0.
import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  // .eslintignore:2-3 + .eslintrc.yml:28-31 merged into flat-config ignores.
  // `**/*.d.ts` removed from ignores in TSK-20260420-33 (REQ-20260420-006):
  // ambient type declaration files are now parsed by the typescript-eslint
  // parser via the dedicated `.ts/.tsx/.d.ts` block below. No rule set is
  // applied yet (planner-fixed decision) to keep lint-time regression bounded.
  { ignores: ['build/**', 'coverage/**', 'node_modules/**', '**/__test__/*.js', '**/api.js'] },

  // v9 flat-config defaults enable `reportUnusedDisableDirectives: 'warn'`;
  // legacy v8 default was `false`. Pin to `off` to preserve equivalence (§3.3,
  // §5.3 regression ±0). Scope: linter-level, not a rule-semantic change.
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },

  // extends: eslint:recommended
  js.configs.recommended,

  // extends: plugin:react/recommended (flat entry point)
  reactPlugin.configs.flat.recommended,

  {
    // scripts.lint runs `eslint ./src`. Pattern matches the `lint-staged` glob
    // in package.json so both `npm run lint` and pre-commit see the same
    // user-rule block. v8 `./src` scanned only `.js` by default; `.jsx` was
    // covered via explicit filename arguments (lint-staged). In flat config
    // the `files:` filter supersedes extension defaults, so include `.jsx`
    // here to preserve v8's lint-staged rule coverage on JSX.
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        // env: browser, node, es2022
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        // legacy globals block (vitest helpers surfaced globally by test runner)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // 4 user rules — meaning preserved verbatim from .eslintrc.yml:32-41.
      // `no-unused-vars` explicit `caughtErrors: 'none'` restores v8 default
      // (v9 changed default to `'all'`); prevents new `catch (_err)` warnings.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { caughtErrors: 'none' }],
      'react/no-unknown-property': ['error', { ignore: ['imageurl', 'thumbnailurl', 'enlarged'] }],
    },
  },

  // typescript-eslint parser block (TSK-20260420-33, REQ-20260420-006).
  // Parser wiring + TS-aware unused-vars rule (TSK-20260422-12, REQ-20260422-053
  // §동작 5 FR-01~04). The vanilla `no-unused-vars` rule flags TS signature-node
  // params (function-type, method-signature, interface method) as false-positives;
  // the TS-aware rule below neutralises the vanilla rule inherited from the
  // JS/JSX user-rule block above. Flat-config resolves duplicate rule keys by
  // taking the last occurrence, so this block must appear after the JS/JSX
  // block to dominate. `caughtErrors: 'none'` preserves v8 parity with the
  // JS/JSX block. JS/JSX rules remain bit-for-bit untouched.
  {
    files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { caughtErrors: 'none' }],
      'no-unused-vars': 'off',
    },
  },
];
