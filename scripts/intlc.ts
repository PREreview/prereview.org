import { Command, FileSystem } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { pascalCase } from 'case-anything'
import { Array, Boolean, Console, Effect, Exit, flow, Layer, Record, Stream, String, Tuple } from 'effect'
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
      Effect.andThen(Array.map(String.replace('.json', ''))),
      Effect.andThen(Array.filter(module => !assetsModules.includes(module))),
    )

  yield* Effect.logDebug('Discovered modules', { locales: modules })

  return modules
})

class Locales extends Effect.Service<Locales>()('Locales', {
  effect: DiscoverLocales,
}) {}

class Languages extends Effect.Service<Languages>()('Languages', {
  effect: DetermineLocaleForLanguages,
}) {}

class SrcModules extends Effect.Service<SrcModules>()('SrcModules', {
  effect: DiscoverSrcModules,
}) {}

const RunIntlc = Effect.fnUntraced(function* ({ locale, module }: { locale: string; module: string }) {
  const command = Command.make('intlc', 'compile', `locales/${locale}/${module}.json`, '-l', locale)

  const process = yield* Command.start(command)

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
})

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
            Effect.andThen(
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
    .pipe(Effect.andThen(template => Handlebars.compile(template, { noEscape: true, strict: true })))

  const rendered = template({
    defaultLocale,
    defaultLocaleDir,
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
    defaultLocaleDir,
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
  const languages = yield* Languages

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
  const languages = yield* Languages
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
      Effect.all(Array.map(foo, BuildAssetsTarget), { concurrency: 'inherit', mode: 'validate' }),
      Effect.all(
        Array.map(assetsModules, module => BuildAssetsModule({ module, target: `${tempDir}/${module}/index.ts` })),
        { concurrency: 'inherit', mode: 'validate' },
      ),
      BuildAssets(`${tempDir}/index.ts`),
    ],
    { concurrency: 'inherit', mode: 'validate' },
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
      Effect.all(Array.map(foo, BuildSrcTarget), { concurrency: 'inherit', mode: 'validate' }),
      Effect.all(
        Array.map(modules, module => BuildSrcModule({ module, target: `${tempDir}/${module}/index.ts` })),
        { concurrency: 'inherit', mode: 'validate' },
      ),
      BuildSrc(`${tempDir}/index.ts`),
    ],
    { concurrency: 'inherit', mode: 'validate' },
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

const program = Effect.all([BuildAssetsLocales, BuildSrcLocales], { concurrency: 'inherit', mode: 'validate' }).pipe(
  Effect.andThen(Console.log('Done')),
  Effect.tapError(() => Console.error('Failed')),
)

program.pipe(
  Effect.provide(
    Languages.Default.pipe(
      Layer.provideMerge(Layer.mergeAll(Locales.Default, SrcModules.Default)),
      Layer.provideMerge(NodeContext.layer),
    ),
  ),
  NodeRuntime.runMain({ disableErrorReporting: true }),
)
