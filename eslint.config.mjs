// @ts-check

import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Ignore ESLint's own config file
    ignores: ['eslint.config.mjs', 'dist/**', '**/dist/**'],
  },

  // Base JavaScript rules
  eslint.configs.recommended,

  // Type-aware TypeScript rules
  ...tseslint.configs.recommendedTypeChecked,

  // Run Prettier as an ESLint rule
  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      globals: {
        // Node.js globals (process, Buffer, etc.)
        ...globals.node,

        // Jest globals (describe, it, expect, etc.)
        ...globals.jest,
      },

      // Project uses CommonJS modules
      sourceType: 'module',

      parserOptions: {
        // Automatically discover tsconfig files
        projectService: true,

        // Resolve tsconfig relative to this file
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    rules: {
      // Allow `any` when needed
      '@typescript-eslint/no-explicit-any': 'off',

      // Warn about unhandled promises
      '@typescript-eslint/no-floating-promises': 'warn',

      // Warn when passing unsafe values
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
);
