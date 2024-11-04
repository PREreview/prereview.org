module.exports = {
  showSeed: true,
  injectGlobals: false,
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  roots: ['./src/', './test/'],
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!@arendjr/text-clipper/|case-anything|cdigit)'],
  testPathIgnorePatterns: ['./test/assets/'],
  moduleFileExtensions: ['js', 'ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {
    '^.+\\.[jt]s$': [
      'ts-jest',
      {
        diagnostics: false,
        isolatedModules: true,
        useESM: true,
      },
    ],
  },
}
