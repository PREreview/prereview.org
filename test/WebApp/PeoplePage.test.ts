import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { CmsContent } from '../../src/CmsContent/index.ts'
import { Locale } from '../../src/Context.ts'
import { UnableToQuery } from '../../src/Queries.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/PeoplePage.ts'
import * as fc from '../fc.ts'

describe('PeoplePage', () => {
  it.effect.prop('when the page cannot be loaded', [fc.supportedLocale()], ([locale]) =>
    Effect.gen(function* () {
      const actual = yield* _.PeoplePage.pipe(
        Effect.provide(Layer.mock(CmsContent, { getPage: () => new UnableToQuery({}) })),
      )

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provide(Layer.mock(CmsContent, { getPage: () => new UnableToQuery({}) })),
    ),
  )
})
