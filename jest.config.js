export default {
  showSeed: true,
  injectGlobals: false,
  testEnvironment: 'node',
  roots: ['./src/', './test/'],
  testPathIgnorePatterns: ['./test/assets/'],
  moduleFileExtensions: ['js', 'ts'],
  transformIgnorePatterns: ['/node_modules/domino/', '\\.pnp\\.[^\\/]+$'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.(t|j)sx?$': '@swc/jest' },
}
