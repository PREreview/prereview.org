import eslintJs from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginImport from 'eslint-plugin-import'
import pluginNoComments from 'eslint-plugin-no-comments'
import * as pluginWc from 'eslint-plugin-wc'
import { defineConfig, globalIgnores } from 'eslint/config'
import typescriptEslint from 'typescript-eslint'

pluginNoComments.rules.disallowComments.meta.schema = false

export default defineConfig([
  globalIgnores([
    '.cache/',
    '.dev/',
    'assets/locales/',
    'data/',
    'dist/',
    'integration-results/',
    'src/locales/',
    '*.cjs',
    '*.mjs',
  ]),
  eslintJs.configs.recommended,
  typescriptEslint.configs.strictTypeChecked,
  typescriptEslint.configs.stylisticTypeChecked,
  pluginImport.flatConfigs.recommended,
  pluginImport.flatConfigs.typescript,
  pluginWc.configs['flat/best-practice'],
  eslintConfigPrettier,
  { plugins: { 'no-comments': pluginNoComments } },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    settings: {
      'import/core-modules': ['@jest/globals'],
      'import/resolver': { typescript: true },
    },
  },
  {
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/consistent-type-exports': ['error', { fixMixedExportsWithInlineTypeSpecifier: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-misused-spread': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignoreConditionalTests: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/strict-boolean-expressions': 'error',
      'import/no-cycle': 'error',
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            'assets/**/*.ts',
            'integration/**/*.ts',
            'test/**/*.ts',
            'visual-regression/**/*.ts',
            '*.ts',
          ],
        },
      ],
      'import/no-internal-modules': [
        'error',
        {
          allow: [
            'fp-ts/lib/!(Array|boolean|Eq|function|Identity|NonEmptyArray|Option|Ord|Ordering|Predicate|ReadonlyArray|ReadonlyNonEmptyArray|ReadonlyRecord|ReadonlySet|ReadonlyTuple|Refinement|string).js',
            'io-ts/lib/*',
            'iso-639-3/to-*.json',
            'logging-ts/lib/*',
            'nanohtml/*',
            'remixicon/**/*.svg',
            'tinyld/heavy',
            'integration/base',
            'types/*',
            '*/index.ts',
          ],
        },
      ],
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'no-comments/disallowComments': [
        'error',
        { allow: ['\\* @deprecated', 'eslint', 'https://', 'Do', 'Unfortunately', 'Refs', 'represents'] },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'ImportDeclaration[specifiers.length = 0]', message: 'Empty imports are not allowed' },
      ],
      'object-shorthand': 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
      'wc/no-child-traversal-in-connectedcallback': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'no-comments/disallowComments': 'off',
    },
  },
  {
    files: ['integration/**/*.ts', 'visual-regression/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'no-empty-pattern': 'off',
    },
  },
  {
    files: ['integration/**/*.ts', 'test/**/*.ts', 'visual-regression/**/*.ts'],
    rules: {
      '@typescript-eslint/no-base-to-string': 'off',
      'import/no-internal-modules': ['error', { forbid: ['**/assets/**/*'] }],
    },
  },
])
