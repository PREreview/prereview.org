import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/MyDetails/RequestedReviewNotificationsPage/index.ts'
import * as fc from '../../fc.ts'

it.effect.prop('RequestedReviewNotificationsPage', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
  Effect.gen(function* () {
    const actual = yield* _.RequestedReviewNotificationsPage

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: Routes.ChangeRequestedReviewNotifications,
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)))),
)

describe('RequestedReviewNotificationsSubmission', () => {
  it.effect.prop(
    'when the form is valid',
    [
      fc.supportedLocale(),
      fc.user(),
      fc.urlParams(fc.record({ requestedReviewNotifications: fc.constantFrom('yes', 'no') })),
    ],
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

  it.effect.prop(
    'when the form is invalid',
    [
      fc.supportedLocale(),
      fc.user(),
      fc.oneof(
        fc
          .urlParams()
          .filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'requestedReviewNotifications'))),
        fc.urlParams(
          fc.record({ requestedReviewNotifications: fc.string().filter(string => !['yes', 'no'].includes(string)) }),
        ),
      ),
    ],
    ([locale, user, body]) =>
      Effect.gen(function* () {
        const actual = yield* _.RequestedReviewNotificationsSubmission(body)

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.ChangeRequestedReviewNotifications,
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)))),
  )
})
