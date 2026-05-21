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
- `oxlint` needs to be added to `no-comments/disallowComments` allow list
- oxlint flags use of `void` in `test/EffectTest.ts`
  - eslint has `allowInGenericTypeArguments` option enabled by default, oxlint does not have this rule config
  - [Existing issue](https://github.com/oxc-project/oxc/issues/19541) around this has been re-opened recently. Looks like behaviour in eslint might have changed recently as the playground link from the issue is also flagging the use of void.
  - spike branch adds `oxlint-disable-next-line` for this case
- `typescript/no-unused-vars` becomes `no-unused-vars`
  - the oxlint version of `no-unused-vars` is type-aware
  - `typescript/no-unused-vars` overwrites the `no-unused-vars` in eslint to make it type aware

## Rules that aren't automatically migrated

- use of `no-restricted-syntax` to avoid empty `import`
  - redundant due to combination of prettier and oxlint
  - empty `import type {}` get stripped by prettier as it calls out to typescript for sorting and typescript removes this
  - empty `import {}` is flagged by oxlint `no-import-type-side-effects`
- `import/no-extraneous-dependencies`
  - does not exist in oxlint
  - superfluous since our switch to pnpm as it only exposes direct deps in `node_modules`
- `no-internal-modules`
  - won't be implement by oxlint team
    - <https://github.com/oxc-project/oxc/blob/69a6ba6353a8210505786506bec7d9853d68c0e4/tasks/lint_rules/src/unsupported-rules.json#L33>
    - suggest using `no-restricted-imports` instead
  - [depcruiser](https://github.com/sverweij/dependency-cruiser) might be better fit
    - richer rule syntax
    - could separate rules by concern (fp-ts migration, import rules for our code...)
    - [ai generated config](https://kagi.com/assistant/3a2d4d8b-923b-499b-8d03-8b62c9d8843c) looks promising

## Notes from agent that still need investigating

### Shrinking of eslint config

`import/no-named-as-default` re-enabled by `flatConfigs.recommended`:
An initial attempt to use `pluginImport.flatConfigs.recommended` in the minimal ESLint config re-enabled `import/no-named-as-default`, producing 31 warnings across test files. The original ESLint config had this rule explicitly off. The fix was to not use any import preset and instead register the plugin manually (`plugins: { import: pluginImport }`) with only the three needed rules declared explicitly.
