import { describe, expect, it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { EnabledLocales } from '../../src/Context.ts'
import * as _ from '../../src/HttpMiddleware/DetectLocale.ts'
import { UserSelectableLocales } from '../../src/locales/index.ts'

describe('detectLocale', () => {
  it.effect.each<[string, string]>([
    ['en-US,es;q=0.6,en;q=0.8,*;q=0.1', 'en-US'],
    ['en-US', 'en-US'],
    ['en-US-posix', 'en-US'],
    ['en', 'en-US'],
    ['en-GB', 'en-US'],
    ['en-GB,pt-BR', 'en-US'],
    ['es-AR', 'es-419'],
    ['es-AR,*', 'es-419'],
    ['*', 'en-US'],
    ['is,*', 'en-US'],
  ])('finds a match for %s', ([input, expected]) =>
    Effect.gen(function* () {
      const actual = yield* _.detectLocale(input)

      expect(actual).toStrictEqual(Option.some(expected))
    }).pipe(Effect.provideService(EnabledLocales, UserSelectableLocales)),
  )

  it.effect.each<[string]>([[''], [' '], ['foo'], ['is'], ['lol-US']])('finds no match for "%s"', ([input]) =>
    Effect.gen(function* () {
      const actual = yield* _.detectLocale(input)

      expect(actual).toStrictEqual(Option.none())
    }).pipe(Effect.provideService(EnabledLocales, UserSelectableLocales)),
  )
})
