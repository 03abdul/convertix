import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules', 'docs', 'public'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.worker, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Core no-unused-vars cannot see JSX usage (<Panel />, <motion.div />), so imports named like
      // components are not reported; unused functions, variables and arguments still are.
      'no-unused-vars': ['error', { varsIgnorePattern: '^(motion|[A-Z_])', argsIgnorePattern: '^(_|[A-Z])', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Context modules export a Provider and its hook together; that is intentional.
    files: ['src/context/**', 'src/components/ErrorBoundary.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
];
