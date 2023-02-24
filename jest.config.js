module.exports = {
  showSeed: true,
  injectGlobals: false,
  testEnvironment: 'node',
  roots: ['./src/', './test/'],
  testPathIgnorePatterns: ['./test/assets/'],
  moduleFileExtensions: ['js', 'ts'],
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
