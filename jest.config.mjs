export default {
  showSeed: true,
  injectGlobals: false,
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  roots: ['./src/', './test/'],
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(.pnpm/)?(?!.*text-clipper.*|case-anything|cdigit|normalize-url|uuid)[@/]',
  ],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {
    '^.+\\.[jt]s$': '@swc/jest',
  },
}
