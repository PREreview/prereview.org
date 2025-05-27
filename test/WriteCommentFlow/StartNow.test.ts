import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Comments from '../../src/Comments/index.js'
import { Locale } from '../../src/Context.js'
import * as Prereview from '../../src/Prereview.js'
import * as Prereviews from '../../src/Prereviews/index.js'
import * as Routes from '../../src/routes.js'
import { Uuid } from '../../src/types/index.js'
import { LoggedInUser } from '../../src/user.js'
import { RouteForCommand } from '../../src/WriteCommentFlow/Routes.js'
import * as _ from '../../src/WriteCommentFlow/StartNow/index.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

const constructPrereviewsService = (
  getPrereview: typeof Prereviews.Prereviews.Service.getPrereview,
): typeof Prereviews.Prereviews.Service => ({
  getFiveMostRecent: Effect.sync(shouldNotBeCalled),
  getForPreprint: () => Effect.sync(shouldNotBeCalled),
  getForUser: () => Effect.sync(shouldNotBeCalled),
  getRapidPrereviewsForPreprint: () => Effect.sync(shouldNotBeCalled),
  getPrereview,
  search: () => Effect.sync(shouldNotBeCalled),
})

describe('StartNow', () => {
  describe('when there is a user', () => {
    describe("when they haven't started a comment", () => {
      test.prop([
        fc.integer(),
        fc.supportedLocale(),
        fc.user(),
        fc.prereview(),
        fc.uuid(),
        fc.expectedCommandForUser().filter(nextCommand => nextCommand._tag !== 'ExpectedToStartAComment'),
      ])('when the comment can be created', (id, locale, user, prereview, commentId, nextCommand) =>
        Effect.gen(function* () {
          const handleCommentCommand = jest.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)
          const getNextExpectedCommandForUserOnAComment = jest.fn<
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
            status: StatusCodes.SEE_OTHER,
            location: RouteForCommand(nextCommand).href({ commentId }),
          })

          expect(handleCommentCommand).toHaveBeenCalledWith({
            commentId,
            command: new Comments.StartComment({ prereviewId: prereview.id, authorId: user.orcid }),
          })
          expect(getNextExpectedCommandForUserOnAComment).toHaveBeenCalledWith(commentId)
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Uuid.GenerateUuid, Effect.succeed(commentId)),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, () =>
            Effect.succeed(new Comments.ExpectedToStartAComment()),
          ),
          Effect.provideService(
            Prereviews.Prereviews,
            constructPrereviewsService(() => Effect.succeed(prereview)),
          ),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.integer(),
        fc.supportedLocale(),
        fc.user(),
        fc.prereview(),
        fc.uuid(),
        fc.oneof(fc.constant(new Comments.UnableToHandleCommand({})), fc.commentError()),
      ])("when the comment can't be created", (id, locale, user, prereview, commentId, error) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ id })

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
          Effect.provideService(Uuid.GenerateUuid, Effect.succeed(commentId)),
          Effect.provideService(Comments.HandleCommentCommand, () => Effect.fail(error)),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, () =>
            Effect.succeed(new Comments.ExpectedToStartAComment()),
          ),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(
            Prereviews.Prereviews,
            constructPrereviewsService(() => Effect.succeed(prereview)),
          ),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )
    })

    test.prop([fc.integer(), fc.supportedLocale(), fc.user(), fc.prereview(), fc.uuid()])(
      'when they have started a comment',
      (id, locale, user, prereview, commentId) =>
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
          Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, () =>
            Effect.succeed(new Comments.ExpectedToEnterAComment({ commentId })),
          ),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(
            Prereviews.Prereviews,
            constructPrereviewsService(() => Effect.succeed(prereview)),
          ),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.integer(), fc.supportedLocale(), fc.user()])('when the PREreview was removed', (id, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow({ id })

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
        Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
        Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
        Effect.provideService(
          Prereviews.Prereviews,
          constructPrereviewsService(() => Effect.fail(new Prereview.PrereviewWasRemoved())),
        ),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )

    test.prop([fc.integer(), fc.supportedLocale(), fc.user(), fc.prereview()])(
      "when the comment can't be loaded",
      (id, locale, user, prereview) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ id })

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
          Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, () =>
            Effect.fail(new Comments.UnableToQuery({})),
          ),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(
            Prereviews.Prereviews,
            constructPrereviewsService(() => Effect.succeed(prereview)),
          ),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.integer(), fc.supportedLocale(), fc.user()])("when the PREreview isn't found", (id, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow({ id })

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
        Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
        Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
        Effect.provideService(
          Prereviews.Prereviews,
          constructPrereviewsService(() => Effect.fail(new Prereview.PrereviewIsNotFound())),
        ),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )

    test.prop([fc.integer(), fc.supportedLocale(), fc.user()])(
      "when the PREreview can't be loaded",
      (id, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ id })

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
          Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(
            Prereviews.Prereviews,
            constructPrereviewsService(() => Effect.fail(new Prereview.PrereviewIsUnavailable())),
          ),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )
  })

  test.prop([fc.integer(), fc.supportedLocale()])("when there isn't a user", (id, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.StartNow({ id })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentStartNow.href({ id }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
      Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
      Effect.provideService(Comments.GetNextExpectedCommandForUser, shouldNotBeCalled),
      Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
      Effect.provideService(Prereviews.Prereviews, constructPrereviewsService(shouldNotBeCalled)),
      EffectTest.run,
    ),
  )
})
