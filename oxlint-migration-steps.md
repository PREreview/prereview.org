# oxlint Migration

## Summary

Migration can be achieved in small steps:

1. install oxlint
2. copy type-unaware rules from eslint to oxlint
   - start running oxlint alongside eslint during `make check`
   - oxlint respects `//eslint-*`
3. copy type-aware rules from eslint to oxlint
4. run both eslint and oxlint during CI
5. reduce eslint to two rules not covered by oxlint
   - at this point `//eslint-*` needs to be turned into `//oxlint-*` to avoid linting errors from superfluous ignores

## Notes

- initial plan and commits by agent, tidied up by human
  - used [skill published by oxlint team](https://github.com/oxc-project/oxc/blob/main/.agents/skills/migrate-oxlint/SKILL.md) to inform agent
  - resulted in use of `@oxlint/migrate` for copying/migrating rules
- use of `no-restricted-syntax` to avoid empty `import` statements is redundant
  - empty `import type {}` get stripped by prettier as it calls out to typescript for sorting and typescript removes this
  - empty `import {}` is flagged by oxlint `no-import-type-side-effects`
- `oxlint` needs to be added to `no-comments/disallowComments` allow list
- oxlint flags use of `void` in `test/EffectTest.ts`
  - eslint has `allowInGenericTypeArguments` option enabled by default, oxlint does not have this rule config
  - [Existing issue](https://github.com/oxc-project/oxc/issues/19541) around this has been re-opened recently. Looks like behaviour in eslint might have changed recently as the playground link from the issue is also flagging the use of void.
  - spike branch adds `oxlint-disable-next-line` for this case
- `typescript/no-unused-vars` becomes `no-unused-vars`
  - the oxlint version of `no-unused-vars` is type-aware
  - `typescript/no-unused-vars` overwrites the `no-unused-vars` in eslint to make it type aware

## Notes from agent that still need investigating

### Shrinking of eslint config

`import/no-named-as-default` re-enabled by `flatConfigs.recommended`:
An initial attempt to use `pluginImport.flatConfigs.recommended` in the minimal ESLint config re-enabled `import/no-named-as-default`, producing 31 warnings across test files. The original ESLint config had this rule explicitly off. The fix was to not use any import preset and instead register the plugin manually (`plugins: { import: pluginImport }`) with only the three needed rules declared explicitly.

### Remaining eslint rules

#### `import/no-internal-modules`

**Why it can't be migrated:** The oxlint team has marked this as "won't implement", on the
grounds that `no-restricted-imports` (which oxlint does support) can cover the same use-cases.

**Purpose:** Controls which internal subpaths of packages may be imported directly. In this
repo the rule maintains a precise allowlist of `fp-ts` and `io-ts` internals that are
permitted, enforcing a migration boundary as the codebase moves towards Effect.

**How to replace:**
Convert the allowlist to `no-restricted-imports` deny patterns in
`.oxlintrc.json`. The logic is inverted — instead of listing what is allowed, you list what
is forbidden — which makes the patterns more verbose but achieves the same effect. The
conversion is non-trivial given the negated glob in the current allow pattern
(`fp-ts/lib/!(Array|boolean|…).js`).

#### `import/no-extraneous-dependencies`

**Why it can't be migrated:** Not yet implemented in oxlint.

**Purpose:** Ensures every import comes from a package declared as a dependency (or
devDependency for test/asset files) in `package.json`, preventing accidental reliance on
transitive dependencies that could disappear without warning.

**How to replace:**

- Wait for oxlint to implement the rule <https://github.com/oxc-project/oxc/issues/1117>
- Use `knip` or `depcheck` as a separate CI step to detect undeclared dependencies. Neither
  is a line-by-line linter, but both catch the same class of problem at the package level.
