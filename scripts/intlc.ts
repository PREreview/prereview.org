import { ChildProcess } from 'effect/process'
import {
  Array,
  Boolean,
  Console,
  Context,
  Effect,
  FileSystem,
  flow,
  Layer,
  Record,
  Stream,
  String,
  Tuple,
} from 'effect'
import { NodeServices, NodeRuntime } from '@effect/platform-node'
import Handlebars from 'handlebars'

const defaultLocale = 'en-US'
const defaultLocaleDir = new Intl.Locale(defaultLocale).getTextInfo().direction
const crowdinInContextLocale = 'lol'
const assetsModules = ['html-editor', 'single-use-form', 'spotlight-banner']

const DiscoverLocales = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem

  const locales = yield* fileSystem.readDirectory('locales')

  yield* Effect.logDebug('Discovered locales', { locales })

  return locales
})

const DetermineLocaleForLanguages = Effect.gen(function* () {
  const locales = yield* Locales

  const languages = Array.reduce(locales, Record.empty<string, string>(), (languages, locale) => {
    if (locale === crowdinInContextLocale) {
      return languages
    }

    const language = new Intl.Locale(locale).language

    return { ...languages, [language]: locale }
  })

  yield* Effect.logDebug('Determined locale for languages', { languages })

  return languages
})

const DiscoverSrcModules = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem

  const modules = yield* fileSystem
    .readDirectory(`locales/${defaultLocale}`)
    .pipe(
      Effect.map(Array.map(String.replace('.json', ''))),
      Effect.map(Array.filter(module => !assetsModules.includes(module))),
    )

  yield* Effect.logDebug('Discovered modules', { locales: modules })

  return modules
})

class Locales extends Context.Service<Locales, ReadonlyArray<string>>()('Locales') {
  static readonly layer = Layer.effect(this, DiscoverLocales)
}

class Languages extends Context.Service<Languages, Record.ReadonlyRecord<string, string>>()('Languages') {
  static readonly layer = Layer.effect(this, DetermineLocaleForLanguages)
}

class SrcModules extends Context.Service<SrcModules, ReadonlyArray<string>>()('SrcModules') {
  static readonly layer = Layer.effect(this, DiscoverSrcModules)
}

const validateAll = <const Effects extends ReadonlyArray<Effect.Effect<unknown, unknown, unknown>>>(
  effects: Effects,
): Effect.Effect<void, ReadonlyArray<Effect.Error<Effects[number]>>, Effect.Services<Effects[number]>> =>
  Effect.flatMap(Effect.forEach(effects, Effect.result, { concurrency: 'unbounded' }), results => {
    const failures = Array.getFailures(results)

    return Array.isReadonlyArrayNonEmpty(failures) ? Effect.fail(failures) : Effect.void
  }) as never

const RunIntlc = Effect.fnUntraced(function* ({ locale, module }: { locale: string; module: string }) {
  const process = yield* ChildProcess.make('intlc', ['compile', `locales/${locale}/${module}.json`, '-l', locale])

  const { output, stderr, exitCode } = yield* Effect.all(
    {
      output: process.stdout.pipe(Stream.decodeText(), Stream.mkString),
      stderr: process.stderr.pipe(Stream.decodeText(), Stream.mkString),
      exitCode: process.exitCode,
    },
    { concurrency: 'unbounded' },
  )

  if (exitCode !== 0) {
    yield* Console.error(stderr)
    return yield* Effect.fail(`intlc compile failed with exit code ${exitCode}`)
  }

  return output
}, Effect.scoped)

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
        onTrue: () =>
          RunIntlc({ locale, module }).pipe(
            Effect.map(
              flow(
                String.concat(
                  'import { html, type Html, type PlainText } from "../../html.ts"\nimport type { NonEmptyString } from "../../types/NonEmptyString.ts"\n\n',
                ),
                String.replaceAll('=> string', '=> Html'),
                String.replaceAll('=> `', '=> html`'),
                String.replaceAll('(`', '(html`'),
                String.replaceAll('(x: string)', '(x: Html)'),
                String.replaceAll('return `', 'return html`'),
                String.replaceAll(': string;', ': Html | NonEmptyString | PlainText | string;'),
                String.replaceAll(': string ', ': Html | NonEmptyString | PlainText | string '),
              ),
            ),
          ),
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
    .pipe(Effect.map(template => Handlebars.compile(template, { noEscape: true, strict: true })))

  const rendered = template({
    defaultLocale,
    defaultLocaleDir,
    locales,
    realLocales: Array.filter(locales, locale => locale !== crowdinInContextLocale),
    moduleName: kebabToPascal(module),
  })

  yield* fileSystem.writeFileString(target, rendered)
})

const BuildSrcModule = Effect.fnUntraced(function* ({ module, target }: { module: string; target: string }) {
  const fileSystem = yield* FileSystem.FileSystem
  const locales = yield* Locales

  yield* Effect.logDebug(`Compiling ${target}`)

  const template = yield* fileSystem
    .readFileString('.dev/locale-module.ts.hbs')
    .pipe(Effect.map(template => Handlebars.compile(template, { noEscape: true, strict: true })))

  const rendered = template({
    defaultLocale,
    defaultLocaleDir,
    locales,
    html: true,
    realLocales: Array.filter(locales, locale => locale !== crowdinInContextLocale),
    moduleName: kebabToPascal(module),
  })

  yield* fileSystem.writeFileString(target, rendered)
})

const BuildAssets = Effect.fnUntraced(function* (target: string) {
  const fileSystem = yield* FileSystem.FileSystem
  const locales = yield* Locales
  const languages = yield* Languages

  yield* Effect.logDebug(`Compiling ${target}`)

  const template = yield* fileSystem
    .readFileString('.dev/locale-index.ts.hbs')
    .pipe(Effect.map(template => Handlebars.compile(template, { noEscape: true, strict: true })))

  const rendered = template({
    crowdinInContextLocale,
    defaultLocale,
    languages,
    locales,
    moduleNames: Record.fromEntries(Array.map(assetsModules, module => Tuple.make(kebabToPascal(module), module))),
  })

  yield* fileSystem.writeFileString(target, rendered)
})

const BuildSrc = Effect.fnUntraced(function* (target: string) {
  const fileSystem = yield* FileSystem.FileSystem
  const locales = yield* Locales
  const languages = yield* Languages
  const modules = yield* SrcModules.pipe(Effect.map(Array.filter(module => !assetsModules.includes(module))))

  yield* Effect.logDebug('Compile src')

  const template = yield* fileSystem
    .readFileString('.dev/locale-index.ts.hbs')
    .pipe(Effect.map(template => Handlebars.compile(template, { noEscape: true, strict: true })))

  const rendered = template({
    crowdinInContextLocale,
    defaultLocale,
    languages,
    locales,
    moduleNames: Record.fromEntries(Array.map(modules, module => Tuple.make(kebabToPascal(module), module))),
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

  yield* validateAll([
    validateAll(Array.map(foo, BuildAssetsTarget)),
    validateAll(
      Array.map(assetsModules, module => BuildAssetsModule({ module, target: `${tempDir}/${module}/index.ts` })),
    ),
    BuildAssets(`${tempDir}/index.ts`),
  ])

  yield* fileSystem.makeDirectory(targetDir, { recursive: true })

  yield* Effect.acquireRelease(
    fileSystem.copy(targetDir, tempDirBackup).pipe(Effect.andThen(fileSystem.remove(targetDir, { recursive: true }))),
    (_, exit) =>
      Effect.matchCauseEffectEager(exit, {
        onFailure: () =>
          fileSystem
            .remove(targetDir, { recursive: true })
            .pipe(Effect.andThen(fileSystem.copy(tempDirBackup, targetDir)), Effect.ignore({ log: true })),
        onSuccess: () => Effect.void,
      }),
  )

  yield* fileSystem.copy(tempDir, targetDir)
}).pipe(Effect.scoped)

const BuildSrcLocales = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem
  const locales = yield* Locales
  const modules = yield* SrcModules.pipe(Effect.map(Array.filter(module => !assetsModules.includes(module))))

  const tempDir = yield* fileSystem.makeTempDirectoryScoped()
  const tempDirBackup = yield* fileSystem.makeTempDirectoryScoped()
  const targetDir = 'src/locales'

  yield* Effect.forEach(modules, module => fileSystem.makeDirectory(`${tempDir}/${module}`))

  const foo = Array.flatMap(locales, locale =>
    Array.map(modules, module => ({ locale, module, target: `${tempDir}/${module}/${locale}.ts` })),
  )

  yield* validateAll([
    validateAll(Array.map(foo, BuildSrcTarget)),
    validateAll(Array.map(modules, module => BuildSrcModule({ module, target: `${tempDir}/${module}/index.ts` }))),
    BuildSrc(`${tempDir}/index.ts`),
  ])

  yield* fileSystem.makeDirectory(targetDir, { recursive: true })

  yield* Effect.acquireRelease(
    fileSystem.copy(targetDir, tempDirBackup).pipe(Effect.andThen(fileSystem.remove(targetDir, { recursive: true }))),
    (_, exit) =>
      Effect.matchCauseEffectEager(exit, {
        onFailure: () =>
          fileSystem
            .remove(targetDir, { recursive: true })
            .pipe(Effect.andThen(fileSystem.copy(tempDirBackup, targetDir)), Effect.ignore({ log: true })),
        onSuccess: () => Effect.void,
      }),
  )

  yield* fileSystem.copy(tempDir, targetDir)
}).pipe(Effect.scoped)

const program = validateAll([BuildAssetsLocales, BuildSrcLocales]).pipe(
  Effect.andThen(Console.log('Done')),
  Effect.tapError(() => Console.error('Failed')),
)

program.pipe(
  Effect.provide(
    Languages.layer.pipe(
      Layer.provideMerge(Layer.mergeAll(Locales.layer, SrcModules.layer)),
      Layer.provideMerge(NodeServices.layer),
    ),
  ),
  NodeRuntime.runMain({ disableErrorReporting: true }),
)

const kebabToPascal = flow(String.kebabToSnake, String.snakeToPascal)
