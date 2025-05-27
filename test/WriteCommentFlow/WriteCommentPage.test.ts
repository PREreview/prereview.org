import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, identity } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Comments from '../../src/Comments/index.js'
import { Locale } from '../../src/Context.js'
import * as Prereview from '../../src/Prereview.js'
import * as Routes from '../../src/routes.js'
import { LoggedInUser } from '../../src/user.js'
import * as _ from '../../src/WriteCommentFlow/WriteCommentPage/index.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('WriteCommentPage', () => {
  describe('when the data can be loaded', () => {
    describe('when the user is logged in', () => {
      test.prop([fc.integer(), fc.supportedLocale(), fc.user(), fc.prereview(), fc.expectedToStartAComment()])(
        "when they haven't started a comment",
        (id, locale, user, prereview, expectedCommand) =>
          Effect.gen(function* () {
            const actual = yield* _.WriteCommentPage({ id })

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              canonical: Routes.WriteComment.href({ id: prereview.id }),
              status: StatusCodes.OK,
              title: expect.anything(),
              nav: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(Comments.GetNextExpectedCommandForUser, () => Effect.succeed(expectedCommand)),
            Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
            Effect.provideService(LoggedInUser, user),
            EffectTest.run,
          ),
      )

      test.prop([
        fc.integer(),
        fc.supportedLocale(),
        fc.user(),
        fc.prereview(),
        fc.expectedCommandForUser().filter(expectedCommand => expectedCommand._tag !== 'ExpectedToStartAComment'),
      ])('when they have started a comment', (id, locale, user, prereview, expectedCommand) =>
        Effect.gen(function* () {
          const actual = yield* _.WriteCommentPage({ id })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SEE_OTHER,
            location: Routes.WriteCommentStartNow.href({ id: prereview.id }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, () => Effect.succeed(expectedCommand)),
          Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )
    })

    test.prop([fc.integer(), fc.supportedLocale(), fc.prereview()])(
      "when the user isn't logged in",
      (id, locale, prereview) =>
        Effect.gen(function* () {
          const actual = yield* _.WriteCommentPage({ id })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: Routes.WriteComment.href({ id: prereview.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
          Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
          EffectTest.run,
        ),
    )
  })

  test.prop([fc.integer(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })])(
    'when the PREreview was removed',
    (id, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.WriteCommentPage({ id })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NOT_FOUND,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
        Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewWasRemoved())),
        user ? Effect.provideService(LoggedInUser, user) : identity,
        EffectTest.run,
      ),
  )

  test.prop([fc.integer(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })])(
    "when the PREreview isn't found",
    (id, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.WriteCommentPage({ id })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NOT_FOUND,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
        Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewIsNotFound())),
        user ? Effect.provideService(LoggedInUser, user) : identity,
        EffectTest.run,
      ),
  )

  test.prop([fc.integer(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })])(
    "when the PREreview can't be loaded",
    (id, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.WriteCommentPage({ id })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.SERVICE_UNAVAILABLE,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
        Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewIsUnavailable())),
        user ? Effect.provideService(LoggedInUser, user) : identity,
        EffectTest.run,
      ),
  )
})
