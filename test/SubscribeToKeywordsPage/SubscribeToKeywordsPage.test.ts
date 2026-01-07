import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer, Option } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../src/Context.ts'
import * as Prereviewers from '../../src/Prereviewers/index.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { LoggedInUser } from '../../src/user.ts'
import * as _ from '../../src/WebApp/SubscribeToKeywordsPage/index.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

test.prop([fc.supportedLocale()])('SubscribeToKeywordsPage', locale =>
  Effect.gen(function* () {
    const actual = yield* _.SubscribeToKeywordsPage

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: Routes.SubscribeToKeywords,
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
)

describe('SubscribeToKeywordsSubmission', () => {
  test.prop([fc.urlParams(fc.record({ search: fc.nonEmptyString() })), fc.supportedLocale(), fc.user()])(
    'with a search',
    (body, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.SubscribeToKeywordsSubmission({ body })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.SubscribeToKeywords,
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }).pipe(
        Effect.provide(Layer.mock(Prereviewers.PrereviewerCommands, {})),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )

  describe('with keywords', () => {
    test.prop([
      fc
        .nonEmptyArray(fc.keywordId())
        .chain(keywords => fc.tuple(fc.constant(keywords), fc.urlParams(fc.constant({ keywords })))),
      fc.supportedLocale(),
      fc.user(),
    ])('when the command can be completed', ([keywords, body], locale, user) =>
      Effect.gen(function* () {
        const subscribeToAKeyword = jest.fn<(typeof Prereviewers.PrereviewerCommands.Service)['subscribeToAKeyword']>(
          _ => Effect.void,
        )

        const actual = yield* _.SubscribeToKeywordsSubmission({ body }).pipe(
          Effect.provide(Layer.mock(Prereviewers.PrereviewerCommands, { subscribeToAKeyword })),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(Routes.myDetailsMatch.formatter, {}),
        })
        expect(subscribeToAKeyword).toHaveBeenCalledTimes(keywords.length)
        keywords.forEach(keywordId => {
          expect(subscribeToAKeyword).toHaveBeenCalledWith({ prereviewerId: user.orcid, keywordId })
        })
      }).pipe(Effect.provideService(Locale, locale), Effect.provideService(LoggedInUser, user), EffectTest.run),
    )

    test.prop([
      fc.urlParams(fc.record({ keywords: fc.nonEmptyArray(fc.keywordId()) })),
      fc.supportedLocale(),
      fc.user(),
      fc.anything().map(cause => new Prereviewers.UnableToHandleCommand({ cause })),
    ])("when the command can't be completed", (body, locale, user, error) =>
      Effect.gen(function* () {
        const actual = yield* _.SubscribeToKeywordsSubmission({ body })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(Layer.mock(Prereviewers.PrereviewerCommands, { subscribeToAKeyword: () => error })),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc
      .urlParams()
      .filter(urlParams =>
        Option.isNone(
          Option.orElse(UrlParams.getFirst(urlParams, 'search'), () => UrlParams.getFirst(urlParams, 'keywords')),
        ),
      ),
    fc.supportedLocale(),
    fc.user(),
  ])('without a search', (body, locale, user) =>
    Effect.gen(function* () {
      const actual = yield* _.SubscribeToKeywordsSubmission({ body })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(Layer.mock(Prereviewers.PrereviewerCommands, {})),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      EffectTest.run,
    ),
  )
})
