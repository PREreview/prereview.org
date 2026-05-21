import pluginImport from 'eslint-plugin-import'
import { defineConfig, globalIgnores } from 'eslint/config'
import typescriptEslint from 'typescript-eslint'

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
  typescriptEslint.configs.base,
  {
    plugins: { import: pluginImport },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': { typescript: true },
    },
    rules: {
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
            'remixicon/**/*.svg',
            'integration/base',
            'types/*',
            'vitest/config',
            '*/index.ts',
          ],
        },
      ],
    },
  },
  {
    files: ['src/RefactoringUtilities/**/*.ts'],
    rules: {
      'import/no-internal-modules': ['error', { allow: ['fp-ts/lib/*', 'io-ts/lib/*'] }],
    },
  },
  {
    files: ['integration/**/*.ts', 'test/**/*.ts', 'visual-regression/**/*.ts'],
    rules: {
      'import/no-internal-modules': ['error', { forbid: ['**/assets/**/*'] }],
    },
  },
])
