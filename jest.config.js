module.exports = {
  globals: {
    'ts-jest': {
      diagnostics: false,
      isolatedModules: true,
    },
  },
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['./src/', './test/'],
  moduleFileExtensions: ['js', 'ts'],
}
