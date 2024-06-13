module.exports = {
  showSeed: true,
  injectGlobals: false,
  testEnvironment: 'node',
  roots: ['./src/', './test/'],
  testPathIgnorePatterns: ['./test/assets/'],
  moduleFileExtensions: ['js', 'ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        diagnostics: false,
        isolatedModules: true,
      },
    ],
  },
}
