import { expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/MyDetails/RequestedReviewNotificationsPage/index.ts'
import * as fc from '../../fc.ts'

it.effect.prop('RequestedReviewNotificationsPage', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
  Effect.gen(function* () {
    const actual = yield* _.RequestedReviewNotificationsPage

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)))),
)

it.effect.prop(
  'RequestedReviewNotificationsSubmission',
  [fc.supportedLocale(), fc.user(), fc.urlParams()],
  ([locale, user, body]) =>
    Effect.gen(function* () {
      const actual = yield* _.RequestedReviewNotificationsSubmission(body)

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)))),
)
