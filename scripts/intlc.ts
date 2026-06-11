import { Command, FileSystem } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { pascalCase } from 'case-anything'
import { Array, Boolean, Console, Effect, Exit, Layer, Record, String, Tuple } from 'effect'
import Handlebars from 'handlebars'

const defaultLocale = 'en-US'
const crowdinInContextLocale = 'lol-US'
const languages = { en: 'en-US', es: 'es-419', pt: 'pt-BR' }
const assetsModules = ['html-editor', 'single-use-form']

const DiscoverLocales = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem

  const locales = yield* fileSystem.readDirectory('locales')

  yield* Effect.logDebug('Discovered locales', { locales })

  return locales
})

const DiscoverSrcModules = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem

  const modules = yield* fileSystem
    .readDirectory(`locales/${defaultLocale}`)
    .pipe(
      Effect.andThen(Array.map(String.replace('.json', ''))),
      Effect.andThen(Array.filter(module => !assetsModules.includes(module))),
    )

  yield* Effect.logDebug('Discovered modules', { locales: modules })

  return modules
})

class Locales extends Effect.Service<Locales>()('Locales', {
  effect: DiscoverLocales,
}) {}

class SrcModules extends Effect.Service<SrcModules>()('SrcModules', {
  effect: DiscoverSrcModules,
}) {}

const RunIntlc = ({ locale, module }: { locale: string; module: string }) =>
  Command.make('intlc', 'compile', `locales/${locale}/${module}.json`, '-l', locale).pipe(Command.string())

const BuildAssetsTarget = Effect.fnUntraced(function* ({
  locale,
  module,
  target,
}: {
  locale: string
  module: string
  target: string
}) {
  const fileSystem = yield* FileSystem.FileSystem

  yield* Effect.logDebug(`Compiling ${target}`)

  const rendered = yield* fileSystem.exists(`locales/${locale}/${module}.json`).pipe(
    Effect.andThen(
      Boolean.match({
        onTrue: () => RunIntlc({ locale, module }),
        onFalse: () => Effect.succeed('export {}'),
      }),
    ),
  )

  yield* fileSystem.writeFileString(target, rendered)
})

const BuildSrcTarget = Effect.fnUntraced(function* ({
  locale,
  module,
  target,
}: {
  locale: string
  module: string
  target: string
}) {
  const fileSystem = yield* FileSystem.FileSystem

  yield* Effect.logDebug(`Compiling ${target}`)

  const rendered = yield* fileSystem.exists(`locales/${locale}/${module}.json`).pipe(
    Effect.andThen(
      Boolean.match({
        onTrue: () => RunIntlc({ locale, module }),
        onFalse: () => Effect.succeed('export {}'),
      }),
    ),
  )

  yield* fileSystem.writeFileString(target, rendered)
})

const BuildAssetsModule = Effect.fnUntraced(function* ({ module, target }: { module: string; target: string }) {
  const fileSystem = yield* FileSystem.FileSystem
  const locales = yield* Locales

  yield* Effect.logDebug(`Compiling ${target}`)

  const template = yield* fileSystem
    .readFileString('.dev/locale-module.ts.hbs')
    .pipe(Effect.andThen(template => Handlebars.compile(template, { noEscape: true, strict: true })))

  const rendered = template({
    defaultLocale,
    locales,
    realLocales: Array.filter(locales, locale => locale !== crowdinInContextLocale),
    moduleName: pascalCase(module),
  })

  yield* fileSystem.writeFileString(target, rendered)
})

const BuildSrcModule = Effect.fnUntraced(function* ({ module, target }: { module: string; target: string }) {
  const fileSystem = yield* FileSystem.FileSystem
  const locales = yield* Locales

  yield* Effect.logDebug(`Compiling ${target}`)

  const template = yield* fileSystem
    .readFileString('.dev/locale-module.ts.hbs')
    .pipe(Effect.andThen(template => Handlebars.compile(template, { noEscape: true, strict: true })))

  const rendered = template({
    defaultLocale,
    locales,
    html: true,
    realLocales: Array.filter(locales, locale => locale !== crowdinInContextLocale),
    moduleName: pascalCase(module),
  })

  yield* fileSystem.writeFileString(target, rendered)
})

const BuildAssets = Effect.fnUntraced(function* (target: string) {
  const fileSystem = yield* FileSystem.FileSystem
  const locales = yield* Locales

  yield* Effect.logDebug(`Compiling ${target}`)

  const template = yield* fileSystem
    .readFileString('.dev/locale-index.ts.hbs')
    .pipe(Effect.andThen(template => Handlebars.compile(template, { noEscape: true, strict: true })))

  const rendered = template({
    crowdinInContextLocale,
    defaultLocale,
    languages,
    locales,
    moduleNames: Record.fromEntries(Array.map(assetsModules, module => Tuple.make(pascalCase(module), module))),
  })

  yield* fileSystem.writeFileString(target, rendered)
})

const BuildSrc = Effect.fnUntraced(function* (target: string) {
  const fileSystem = yield* FileSystem.FileSystem
  const locales = yield* Locales
  const modules = yield* SrcModules.pipe(Effect.andThen(Array.filter(module => !assetsModules.includes(module))))

  yield* Effect.logDebug('Compile src')

  const template = yield* fileSystem
    .readFileString('.dev/locale-index.ts.hbs')
    .pipe(Effect.andThen(template => Handlebars.compile(template, { noEscape: true, strict: true })))

  const rendered = template({
    crowdinInContextLocale,
    defaultLocale,
    languages,
    locales,
    moduleNames: Record.fromEntries(Array.map(modules, module => Tuple.make(pascalCase(module), module))),
  })

  yield* fileSystem.writeFileString(target, rendered)
})

const BuildAssetsLocales = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem
  const locales = yield* Locales

  const tempDir = yield* fileSystem.makeTempDirectoryScoped()
  const tempDirBackup = yield* fileSystem.makeTempDirectoryScoped()
  const targetDir = 'assets/locales'

  yield* Effect.forEach(assetsModules, module => fileSystem.makeDirectory(`${tempDir}/${module}`))

  const foo = Array.flatMap(locales, locale =>
    Array.map(assetsModules, module => ({ locale, module, target: `${tempDir}/${module}/${locale}.ts` })),
  )

  yield* Effect.all(
    [
      Effect.forEach(foo, BuildAssetsTarget, { concurrency: 'inherit' }),
      Effect.forEach(assetsModules, module => BuildAssetsModule({ module, target: `${tempDir}/${module}/index.ts` }), {
        concurrency: 'inherit',
      }),
      BuildAssets(`${tempDir}/index.ts`),
    ],
    { concurrency: 'inherit' },
  )

  yield* fileSystem.makeDirectory(targetDir, { recursive: true })

  yield* Effect.acquireRelease(
    fileSystem.copy(targetDir, tempDirBackup).pipe(Effect.andThen(fileSystem.remove(targetDir, { recursive: true }))),
    (_, exit) =>
      Exit.matchEffect(exit, {
        onFailure: () =>
          fileSystem
            .remove(targetDir, { recursive: true })
            .pipe(Effect.andThen(fileSystem.copy(tempDirBackup, targetDir)), Effect.ignoreLogged),
        onSuccess: () => Effect.void,
      }),
  )

  yield* fileSystem.copy(tempDir, targetDir)
}).pipe(Effect.scoped)

const BuildSrcLocales = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem
  const locales = yield* Locales
  const modules = yield* SrcModules.pipe(Effect.andThen(Array.filter(module => !assetsModules.includes(module))))

  const tempDir = yield* fileSystem.makeTempDirectoryScoped()
  const tempDirBackup = yield* fileSystem.makeTempDirectoryScoped()
  const targetDir = 'src/locales'

  yield* Effect.forEach(modules, module => fileSystem.makeDirectory(`${tempDir}/${module}`))

  const foo = Array.flatMap(locales, locale =>
    Array.map(modules, module => ({ locale, module, target: `${tempDir}/${module}/${locale}.ts` })),
  )

  yield* Effect.all(
    [
      Effect.forEach(foo, BuildSrcTarget, { concurrency: 'inherit' }),
      Effect.forEach(modules, module => BuildSrcModule({ module, target: `${tempDir}/${module}/index.ts` }), {
        concurrency: 'inherit',
      }),
      BuildSrc(`${tempDir}/index.ts`),
    ],
    { concurrency: 'inherit' },
  )

  yield* fileSystem.makeDirectory(targetDir, { recursive: true })

  yield* Effect.acquireRelease(
    fileSystem.copy(targetDir, tempDirBackup).pipe(Effect.andThen(fileSystem.remove(targetDir, { recursive: true }))),
    (_, exit) =>
      Exit.matchEffect(exit, {
        onFailure: () =>
          fileSystem
            .remove(targetDir, { recursive: true })
            .pipe(Effect.andThen(fileSystem.copy(tempDirBackup, targetDir)), Effect.ignoreLogged),
        onSuccess: () => Effect.void,
      }),
  )

  yield* fileSystem.copy(tempDir, targetDir)
}).pipe(Effect.scoped)

const program = Effect.all([BuildAssetsLocales, BuildSrcLocales], { concurrency: 'inherit' }).pipe(
  Effect.andThen(Console.log('Done')),
)

program.pipe(
  Effect.provide(Layer.mergeAll(Locales.Default, SrcModules.Default).pipe(Layer.provideMerge(NodeContext.layer))),
  NodeRuntime.runMain,
)
