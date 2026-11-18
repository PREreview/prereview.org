export const hooks = {
  readPackage(pkg) {
    // The plugin needs TypeScript's JavaScript API, which TypeScript 7 no longer has
    if (pkg.name === 'prettier-plugin-organize-imports') {
      if (pkg.peerDependencies?.typescript !== '>=2.9') {
        throw new Error(
          `prettier-plugin-organize-imports now needs TypeScript ${pkg.peerDependencies?.typescript}; check if it supports TypeScript 7 and update .pnpmfile.mjs`,
        )
      }

      delete pkg.peerDependencies.typescript
      pkg.dependencies = { ...pkg.dependencies, typescript: '^6.0.3' }
    }

    return pkg
  },
}
