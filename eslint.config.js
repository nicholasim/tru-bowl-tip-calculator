import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['.next', 'dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      // process.env.NEXT_PUBLIC_* is the standard way Next.js client code
      // reads env vars (statically inlined at build time), so `process`
      // needs to be a recognized global alongside the browser ones.
      globals: { ...globals.browser, process: 'readonly' },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // ignoreRestSiblings: components that destructure a prop only to
      // exclude it from a `...rest` spread (e.g. dropping non-DOM props
      // before spreading the remainder onto a native element) shouldn't be
      // flagged just because the excluded prop itself goes unread.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', ignoreRestSiblings: true }],
    },
  },
  {
    // shadcn/ui primitives conventionally co-export a cva `*Variants` helper
    // alongside the component (e.g. buttonVariants), which fast-refresh's
    // "only export components" rule otherwise flags.
    files: ['src/components/ui/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
