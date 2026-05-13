import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { format } from 'fp-ts-routing'
import { UnableToHandleCommand } from '../../../src/Commands.ts'
import { Locale } from '../../../src/Context.ts'
import {
  HasNotOptedIn,
  HasOptedIn,
  HasOptedOut,
} from '../../../src/Prereviewers/HasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests.ts'
import { Prereviewers } from '../../../src/Prereviewers/index.ts'
import { UnknownPrereviewer } from '../../../src/Prereviewers/OptInToNotificationsForReviewsPublishedInResponseToRequests.ts'
import { UnableToQuery } from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/MyDetails/RequestedReviewNotificationsPage/index.ts'
import * as fc from '../../fc.ts'

describe('RequestedReviewNotificationsPage', () => {
  it.effect.prop(
    'when an existing preference can be loaded',
    [fc.supportedLocale(), fc.user(), fc.constantFrom(new HasOptedIn(), new HasOptedOut(), new HasNotOptedIn())],
    ([locale, user, preference]) =>
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
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(Prereviewers, {
            hasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests: () =>
              Effect.succeed(preference),
          }),
        ]),
      ),
  )

  it.effect.prop(
    "when an existing preference can't be loaded",
    [
      fc.supportedLocale(),
      fc.user(),
      fc.anything().chain(cause => fc.constantFrom(new UnableToQuery({ cause }), new UnknownPrereviewer())),
    ],
    ([locale, user, error]) =>
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
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(Prereviewers, {
            hasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests: () => error,
          }),
        ]),
      ),
  )
})

describe('RequestedReviewNotificationsSubmission', () => {
  describe('when the form is valid', () => {
    describe('with a yes answer', () => {
      it.effect.prop(
        'when the command can be handled',
        [fc.supportedLocale(), fc.user(), fc.urlParams(fc.constant({ requestedReviewNotifications: 'yes' }))],
        ([locale, user, body]) =>
          Effect.gen(function* () {
            const actual = yield* _.RequestedReviewNotificationsSubmission(body)

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(Routes.myDetailsMatch.formatter, {}),
            })
          }).pipe(
            Effect.provide([
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(Prereviewers, {
                optInToNotificationsForReviewsPublishedInResponseToRequests: () => Effect.void,
              }),
            ]),
          ),
      )

      it.effect.prop(
        "when the command can't be handled",
        [
          fc.supportedLocale(),
          fc.user(),
          fc.urlParams(fc.constant({ requestedReviewNotifications: 'yes' })),
          fc.anything().chain(cause => fc.constantFrom(new UnableToHandleCommand({ cause }), new UnknownPrereviewer())),
        ],
        ([locale, user, body, error]) =>
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
          }).pipe(
            Effect.provide([
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(Prereviewers, {
                optInToNotificationsForReviewsPublishedInResponseToRequests: () => error,
              }),
            ]),
          ),
      )
    })

    describe('with a no answer', () => {
      it.effect.prop(
        'when the command can be handled',
        [fc.supportedLocale(), fc.user(), fc.urlParams(fc.constant({ requestedReviewNotifications: 'no' }))],
        ([locale, user, body]) =>
          Effect.gen(function* () {
            const actual = yield* _.RequestedReviewNotificationsSubmission(body)

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(Routes.myDetailsMatch.formatter, {}),
            })
          }).pipe(
            Effect.provide([
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(Prereviewers, {
                optOutOfNotificationsForReviewsPublishedInResponseToRequests: () => Effect.void,
              }),
            ]),
          ),
      )

      it.effect.prop(
        "when the command can't be handled",
        [
          fc.supportedLocale(),
          fc.user(),
          fc.urlParams(fc.constant({ requestedReviewNotifications: 'no' })),
          fc.anything().chain(cause => fc.constantFrom(new UnableToHandleCommand({ cause }), new UnknownPrereviewer())),
        ],
        ([locale, user, body, error]) =>
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
          }).pipe(
            Effect.provide([
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(Prereviewers, {
                optOutOfNotificationsForReviewsPublishedInResponseToRequests: () => error,
              }),
            ]),
          ),
      )
    })
  })

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
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(Prereviewers, {}),
        ]),
      ),
  )
})
