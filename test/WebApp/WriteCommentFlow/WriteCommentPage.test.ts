import { describe, expect, it } from '@effect/vitest'
import { Effect, identity, Layer } from 'effect'
import * as Comments from '../../../src/Comments/index.ts'
import { Locale } from '../../../src/Context.ts'
import * as Prereviews from '../../../src/Prereviews/index.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/WriteCommentPage/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('WriteCommentPage', () => {
  describe('when the data can be loaded', () => {
    describe('when the user is logged in', () => {
      it.effect.prop(
        "when they haven't started a comment",
        [fc.integer(), fc.supportedLocale(), fc.user(), fc.prereview(), fc.expectedToStartAComment()],
        ([id, locale, user, prereview, expectedCommand]) =>
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
            Effect.provide(Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(prereview) })),
            Effect.provideService(LoggedInUser, user),
          ),
      )

      it.effect.prop(
        'when they have started a comment',
        [
          fc.integer(),
          fc.supportedLocale(),
          fc.user(),
          fc.prereview(),
          fc.expectedCommandForUser().filter(expectedCommand => expectedCommand._tag !== 'ExpectedToStartAComment'),
        ],
        ([id, locale, user, prereview, expectedCommand]) =>
          Effect.gen(function* () {
            const actual = yield* _.WriteCommentPage({ id })

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: Routes.WriteCommentStartNow.href({ id: prereview.id }),
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(Comments.GetNextExpectedCommandForUser, () => Effect.succeed(expectedCommand)),
            Effect.provide(Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(prereview) })),
            Effect.provideService(LoggedInUser, user),
          ),
      )
    })

    it.effect.prop(
      "when the user isn't logged in",
      [fc.integer(), fc.supportedLocale(), fc.prereview()],
      ([id, locale, prereview]) =>
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
          Effect.provide(Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(prereview) })),
        ),
    )
  })

  it.effect.prop(
    'when the PREreview was removed',
    [fc.integer(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })],
    ([id, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.WriteCommentPage({ id })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
        Effect.provide(Layer.mock(Prereviews.Prereviews, { getPrereview: () => new Prereviews.PrereviewWasRemoved() })),
        user ? Effect.provideService(LoggedInUser, user) : identity,
      ),
  )

  it.effect.prop(
    "when the PREreview isn't found",
    [fc.integer(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })],
    ([id, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.WriteCommentPage({ id })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
        Effect.provide(Layer.mock(Prereviews.Prereviews, { getPrereview: () => new Prereviews.PrereviewIsNotFound() })),
        user ? Effect.provideService(LoggedInUser, user) : identity,
      ),
  )

  it.effect.prop(
    "when the PREreview can't be loaded",
    [fc.integer(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })],
    ([id, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.WriteCommentPage({ id })

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
        Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
        Effect.provide(
          Layer.mock(Prereviews.Prereviews, { getPrereview: () => new Prereviews.PrereviewIsUnavailable() }),
        ),
        user ? Effect.provideService(LoggedInUser, user) : identity,
      ),
  )
})
