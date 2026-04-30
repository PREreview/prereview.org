import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Either, Layer } from 'effect'
import * as Comments from '../../../src/Comments/index.ts'
import { Locale } from '../../../src/Context.ts'
import * as Prereviews from '../../../src/Prereviews/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { Uuid } from '../../../src/types/index.ts'
import { LoggedInUser } from '../../../src/user.ts'
import { RouteForCommand } from '../../../src/WebApp/WriteCommentFlow/Routes.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/StartNow/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('StartNow', () => {
  describe('when there is a user', () => {
    describe("when they haven't started a comment", () => {
      it.effect.prop(
        'when the comment can be created',
        [
          fc.integer(),
          fc.supportedLocale(),
          fc.user(),
          fc.prereview(),
          fc.uuid(),
          fc.expectedCommandForUser().filter(nextCommand => nextCommand._tag !== 'ExpectedToStartAComment'),
        ],
        ([id, locale, user, prereview, commentId, nextCommand]) =>
          Effect.gen(function* () {
            const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)
            const getNextExpectedCommandForUserOnAComment = vi.fn<
              typeof Comments.GetNextExpectedCommandForUserOnAComment.Service
            >(_ => Effect.succeed(Either.right(nextCommand)))

            const actual = yield* _.StartNow({ id }).pipe(
              Effect.provideService(Comments.HandleCommentCommand, handleCommentCommand),
              Effect.provideService(
                Comments.GetNextExpectedCommandForUserOnAComment,
                getNextExpectedCommandForUserOnAComment,
              ),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: RouteForCommand(nextCommand).href({ commentId }),
            })

            expect(handleCommentCommand).toHaveBeenCalledWith(
              new Comments.StartComment({ commentId, prereviewId: prereview.id, authorId: user.orcid }),
            )
            expect(getNextExpectedCommandForUserOnAComment).toHaveBeenCalledWith(commentId)
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provide(Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(commentId) })),
            Effect.provideService(Comments.GetNextExpectedCommandForUser, () =>
              Effect.succeed(new Comments.ExpectedToStartAComment()),
            ),
            Effect.provide(Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(prereview) })),
            Effect.provideService(LoggedInUser, user),
          ),
      )

      it.effect.prop(
        "when the comment can't be created",
        [
          fc.integer(),
          fc.supportedLocale(),
          fc.user(),
          fc.prereview(),
          fc.uuid(),
          fc.oneof(fc.constant(new Comments.UnableToHandleCommand({})), fc.commentError()),
        ],
        ([id, locale, user, prereview, commentId, error]) =>
          Effect.gen(function* () {
            const actual = yield* _.StartNow({ id })

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
            Effect.provide(Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(commentId) })),
            Effect.provideService(Comments.HandleCommentCommand, () => error),
            Effect.provideService(Comments.GetNextExpectedCommandForUser, () =>
              Effect.succeed(new Comments.ExpectedToStartAComment()),
            ),
            Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
            Effect.provide(Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(prereview) })),
            Effect.provideService(LoggedInUser, user),
          ),
      )
    })

    it.effect.prop(
      'when they have started a comment',
      [fc.integer(), fc.supportedLocale(), fc.user(), fc.prereview(), fc.uuid()],
      ([id, locale, user, prereview, commentId]) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ id })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: Routes.WriteCommentStartNow.href({ id: prereview.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provide(Layer.mock(Uuid.GenerateUuid, {})),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, () =>
            Effect.succeed(new Comments.ExpectedToEnterAComment({ commentId })),
          ),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provide(Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(prereview) })),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the PREreview was removed',
      [fc.integer(), fc.supportedLocale(), fc.user()],
      ([id, locale, user]) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ id })

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
          Effect.provide(Layer.mock(Uuid.GenerateUuid, {})),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provide(
            Layer.mock(Prereviews.Prereviews, { getPrereview: () => new Prereviews.PrereviewWasRemoved() }),
          ),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the comment can't be loaded",
      [fc.integer(), fc.supportedLocale(), fc.user(), fc.prereview()],
      ([id, locale, user, prereview]) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ id })

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
          Effect.provide(Layer.mock(Uuid.GenerateUuid, {})),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, () => new Queries.UnableToQuery({})),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provide(Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(prereview) })),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the PREreview isn't found",
      [fc.integer(), fc.supportedLocale(), fc.user()],
      ([id, locale, user]) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ id })

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
          Effect.provide(Layer.mock(Uuid.GenerateUuid, {})),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provide(
            Layer.mock(Prereviews.Prereviews, { getPrereview: () => new Prereviews.PrereviewIsNotFound() }),
          ),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the PREreview can't be loaded",
      [fc.integer(), fc.supportedLocale(), fc.user()],
      ([id, locale, user]) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ id })

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
          Effect.provide(Layer.mock(Uuid.GenerateUuid, {})),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provide(
            Layer.mock(Prereviews.Prereviews, { getPrereview: () => new Prereviews.PrereviewIsUnavailable() }),
          ),
          Effect.provideService(LoggedInUser, user),
        ),
    )
  })

  it.effect.prop("when there isn't a user", [fc.integer(), fc.supportedLocale()], ([id, locale]) =>
    Effect.gen(function* () {
      const actual = yield* _.StartNow({ id })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentStartNow.href({ id }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provide(Layer.mock(Uuid.GenerateUuid, {})),
      Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
      Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
      Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
      Effect.provide(Layer.mock(Prereviews.Prereviews, {})),
    ),
  )
})
