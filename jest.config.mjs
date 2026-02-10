export default {
  showSeed: true,
  injectGlobals: false,
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  roots: ['./src/', './test/'],
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!@arendjr/text-clipper/|case-anything|cdigit|normalize-url)'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {
    '^.+\\.[jt]s$': '@swc/jest',
  },
}
