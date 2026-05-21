# oxlint Migration

## Steps taken

### Step 1 — Add oxlint alongside ESLint

**Goal:** Get oxlint running against the full codebase without disrupting ESLint, establishing
the expand phase of an expand-and-contract migration.

**Changes made:**

- Generated `.oxlintrc.json` using `npx @oxlint/migrate`, producing 120 rules covering ESLint
  core, `typescript-eslint` (non-type-aware), `eslint-plugin-wc`, and `eslint-plugin-no-comments`
  (the latter two via oxlint's `jsPlugins` mechanism).
- Added `oxlint 1.6.0` as a dev dependency.
- Added `npx oxlint .` as the first command in the `lint-ts` Makefile target, before ESLint.
- Added `"oxlint"` to the `no-comments/disallowComments` allow list in both `.oxlintrc.json`
  and `eslint.config.mjs`, so `// oxlint-disable-next-line` suppression comments are permitted
  by the no-comments rule in both linters.

**Issue resolved — `typescript/no-invalid-void-type` false positive:**
Oxlint flagged `void` in `test/EffectTest.ts` as invalid, but the same code passes ESLint
cleanly. The cause is that oxlint's implementation of `no-invalid-void-type` does not support
the `allowInGenericTypeArguments` option (default `true` in typescript-eslint), so it
incorrectly rejects `void` used as a generic type argument in a TypeScript instantiation
expression. A targeted `// oxlint-disable-next-line typescript/no-invalid-void-type` comment
was added to that line to suppress only this false positive.

---

### Step 2 — Enable type-aware rules in oxlint

**Goal:** Bring the 48 `@typescript-eslint` rules that require TypeScript type information into
oxlint, so type-aware linting is no longer exclusively ESLint's responsibility.

**Changes made:**

- Re-ran `npx @oxlint/migrate --type-aware`, updating `.oxlintrc.json` from 120 to 169 rules
  and adding `"options": { "typeAware": true }`. Oxlint auto-discovers `tsconfig.json` from
  this option — no additional CLI flag is needed.
- Installed `oxlint-tsgolint 0.22.1`, the bridge package required for type-aware mode.

---

### Step 3 — Slim ESLint down to only the rules oxlint cannot cover

**Goal:** Remove the overlap between the two linters, shrinking ESLint to an explicit, minimal
set of rules that have no oxlint equivalent. This is the contract phase.

**Changes made:**

- Replaced `eslint.config.mjs` with a minimal config running exactly three rules:
  `import/no-extraneous-dependencies`, `import/no-internal-modules`, and
  `no-restricted-syntax`. The TypeScript parser (`typescriptEslint.configs.base`) is kept so
  ESLint can parse `.ts` files.
- Converted all `// eslint-disable-next-line @typescript-eslint/*` and
  `// eslint-disable-line @typescript-eslint/*` comments in `src/` and `test/` to their
  `// oxlint-disable-next-line typescript/*` equivalents, because those rules now live in
  oxlint and ESLint's `reportUnusedDisableDirectives: 'error'` would have rejected the
  now-stale ESLint directives.
- Converted `// eslint-disable-next-line no-comments/disallowComments` to
  `// oxlint-disable-next-line no-comments/disallowComments` for the same reason.
- Removed the `@typescript-eslint/no-unnecessary-condition` disable comment in
  `src/WebApp/Router/NonEffectRouter/DataRouter.ts` — this is a Nursery (experimental) rule
  in oxlint that is not enabled, so the suppression was dead weight.

**Issue resolved — `import/no-named-as-default` re-enabled by `flatConfigs.recommended`:**
An initial attempt to use `pluginImport.flatConfigs.recommended` in the minimal ESLint config
re-enabled `import/no-named-as-default`, producing 31 warnings across test files. The original
ESLint config had this rule explicitly off. The fix was to not use any import preset and instead
register the plugin manually (`plugins: { import: pluginImport }`) with only the three needed
rules declared explicitly.

---

## Changes to `src/` and `test/`

All changes are comment-only. No logic, types, or runtime behaviour was modified.

### `eslint-disable` → `oxlint-disable` conversions (rule moved to oxlint)

When ESLint's `reportUnusedDisableDirectives: 'error'` is enabled, any `eslint-disable`
comment for a rule that ESLint is no longer running becomes an error. As rules moved from
ESLint into oxlint, their corresponding suppression comments had to move too.

Note: the `typescript/` plugin prefix in oxlint corresponds to `@typescript-eslint/` in ESLint.

**`@typescript-eslint/no-explicit-any` → `typescript/no-explicit-any`**  
`src/Commands.ts` (×3), `src/Queries.ts` (×4), `src/routes.ts`,
`src/WebApp/write-review/completed-form.ts`,
`src/WebApp/profile-page/orcid-profile.ts`,
`src/WebApp/profile-page/pseudonym-profile.ts`

**`@typescript-eslint/no-unsafe-return` → `typescript/no-unsafe-return`**  
`src/routes.ts`

**`@typescript-eslint/no-empty-object-type` → `typescript/no-empty-object-type`**  
`test/setup.ts`

**`@typescript-eslint/unbound-method` → `typescript/unbound-method`**  
`test/CachingHttpClient/PersistedToRedis.test.ts` (×5)

**`no-comments/disallowComments` → `no-comments/disallowComments`** (prefix only changed)  
`src/WebApp/WriteCommentFlow/CompetingInterestsPage/CompetingInterestsPage.ts`,
`src/WebApp/WriteCommentFlow/CodeOfConductPage/CodeOfConductPage.ts`

### `@typescript-eslint/no-unused-vars` → `no-unused-vars`

**File:** `src/Preprints/PreprintId.ts`

Oxlint exposes unused-variable checking as the base `no-unused-vars` rule rather than under
the `typescript` plugin namespace. The suppress comment was updated accordingly.

### Removed `@typescript-eslint/no-unnecessary-condition` suppress comment

**File:** `src/WebApp/Router/NonEffectRouter/DataRouter.ts`

`no-unnecessary-condition` is a Nursery (experimental) rule in oxlint and is not enabled in
the config. The ESLint suppression comment became an unused directive with no oxlint equivalent
to replace it with, so it was removed.

### Added `oxlint-disable-next-line typescript/no-invalid-void-type`

**File:** `test/EffectTest.ts`

Oxlint false positive: the rule lacks `allowInGenericTypeArguments` support. See Step 1 above.

---

## Remaining ESLint rules

ESLint still runs for these three rules. They are enforced in the minimal `eslint.config.mjs`
alongside oxlint.

### `import/no-extraneous-dependencies`

**Why it can't be migrated:** Not yet implemented in oxlint.

**Purpose:** Ensures every import comes from a package declared as a dependency (or
devDependency for test/asset files) in `package.json`, preventing accidental reliance on
transitive dependencies that could disappear without warning.

**How to replace:**

- Wait for oxlint to implement the rule <https://github.com/oxc-project/oxc/issues/1117>
- Use `knip` or `depcheck` as a separate CI step to detect undeclared dependencies. Neither
  is a line-by-line linter, but both catch the same class of problem at the package level.

---

### `import/no-internal-modules`

**Why it can't be migrated:** The oxlint team has marked this as "won't implement", on the
grounds that `no-restricted-imports` (which oxlint does support) can cover the same use-cases.

**Purpose:** Controls which internal subpaths of packages may be imported directly. In this
repo the rule maintains a precise allowlist of `fp-ts` and `io-ts` internals that are
permitted, enforcing a migration boundary as the codebase moves towards Effect.

**How to replace:** Convert the allowlist to `no-restricted-imports` deny patterns in
`.oxlintrc.json`. The logic is inverted — instead of listing what is allowed, you list what
is forbidden — which makes the patterns more verbose but achieves the same effect. The
conversion is non-trivial given the negated glob in the current allow pattern
(`fp-ts/lib/!(Array|boolean|…).js`).

---

### `no-restricted-syntax` (empty imports)

**Why it can't be migrated:** Not yet implemented in oxlint.

**Purpose:** Forbids `import {}` statements — imports with an empty specifier list that do
nothing and are dead code.

**How to replace:**

- Wait for oxlint to implement `no-restricted-syntax`.
- Prettier or a custom pre-commit script could strip empty imports at format time.
- Most editors and TypeScript's own `--noUnusedLocals` organise-imports tooling will remove
  these automatically, so the practical risk of them accumulating is low.
