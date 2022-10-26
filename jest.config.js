module.exports = {
  globals: {
    'ts-jest': {
      diagnostics: false,
      isolatedModules: true,
    },
  },
  injectGlobals: false,
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['./src/', './test/'],
  moduleFileExtensions: ['js', 'ts'],
}
