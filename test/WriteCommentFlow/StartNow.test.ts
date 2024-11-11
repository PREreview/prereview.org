import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Record, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Comments from '../../src/Comments/index.js'
import { Locale, LoggedInUser } from '../../src/Context.js'
import { CanWriteComments } from '../../src/feature-flags.js'
import * as Prereview from '../../src/Prereview.js'
import * as Routes from '../../src/routes.js'
import { Uuid } from '../../src/types/index.js'
import * as DecideNextPage from '../../src/WriteCommentFlow/DecideNextPage.js'
import * as _ from '../../src/WriteCommentFlow/StartNow/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('StartNow', () => {
  describe('when there is a user', () => {
    describe('when the user can write comments', () => {
      describe("when they haven't started a comment", () => {
        test.prop([fc.integer(), fc.supportedLocale(), fc.user(), fc.prereview(), fc.uuid()])(
          'when the comment can be created',
          (id, locale, user, prereview, commentId) =>
            Effect.gen(function* () {
              const handleCommentCommand = jest.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

              const actual = yield* Effect.provideService(
                _.StartNow({ id }),
                Comments.HandleCommentCommand,
                handleCommentCommand,
              )

              expect(actual).toStrictEqual({
                _tag: 'RedirectResponse',
                status: StatusCodes.SEE_OTHER,
                location: DecideNextPage.NextPageAfterCommand({
                  command: 'StartComment',
                  comment: new Comments.CommentNotStarted(),
                }).href({ commentId }),
              })

              expect(handleCommentCommand).toHaveBeenCalledWith({
                commentId: expect.anything(),
                command: new Comments.StartComment({ prereviewId: prereview.id, authorId: user.orcid }),
              })
            }).pipe(
              Effect.provideService(Locale, locale),
              Effect.provideService(Uuid.GenerateUuid, Effect.succeed(commentId)),
              Effect.provideService(Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview, () =>
                Effect.sync(Record.empty),
              ),
              Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
              Effect.provideService(CanWriteComments, () => true),
              Effect.provideService(LoggedInUser, user),
              Effect.provide(TestContext.TestContext),
              Effect.runPromise,
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
            Effect.provideService(Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview, () =>
              Effect.sync(Record.empty),
            ),
            Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
            Effect.provideService(CanWriteComments, () => true),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
        )
      })

      test.prop([
        fc.integer(),
        fc.supportedLocale(),
        fc.user(),
        fc.prereview(),
        fc.dictionary(
          fc.uuid(),
          fc.oneof(fc.commentInProgress(), fc.commentReadyForPublishing(), fc.commentBeingPublished()),
          { minKeys: 1 },
        ),
      ])('when they have started a comment', (id, locale, user, prereview, comment) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ id })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
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
          Effect.provideService(Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview, () =>
            Effect.succeed(comment),
          ),
          Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
          Effect.provideService(CanWriteComments, () => true),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
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
          Effect.provideService(Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview, shouldNotBeCalled),
          Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewWasRemoved())),
          Effect.provideService(CanWriteComments, () => true),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
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
            Effect.provideService(Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview, () =>
              Effect.fail(new Comments.UnableToQuery({})),
            ),
            Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
            Effect.provideService(CanWriteComments, () => true),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
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
          Effect.provideService(Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview, shouldNotBeCalled),
          Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewIsNotFound())),
          Effect.provideService(CanWriteComments, () => true),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
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
            Effect.provideService(Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview, shouldNotBeCalled),
            Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewIsUnavailable())),
            Effect.provideService(CanWriteComments, () => true),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
      )
    })

    test.prop([fc.integer(), fc.supportedLocale(), fc.user()])(
      'when the user cannot write a comment',
      (id, locale, user) =>
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
          Effect.provideService(Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview, shouldNotBeCalled),
          Effect.provideService(Prereview.GetPrereview, shouldNotBeCalled),
          Effect.provideService(CanWriteComments, () => false),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
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
      Effect.provideService(Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview, shouldNotBeCalled),
      Effect.provideService(Prereview.GetPrereview, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})