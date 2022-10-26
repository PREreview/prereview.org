module.exports = {
  showSeed: true,
  injectGlobals: false,
  testEnvironment: 'node',
  roots: ['./src/', './test/'],
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
