import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Record, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { Locale, LoggedInUser } from '../../src/Context.js'
import { CanWriteFeedback } from '../../src/feature-flags.js'
import * as Feedback from '../../src/Feedback/index.js'
import * as Prereview from '../../src/Prereview.js'
import * as Routes from '../../src/routes.js'
import { Uuid } from '../../src/types/index.js'
import * as DecideNextPage from '../../src/WriteFeedbackFlow/DecideNextPage.js'
import * as _ from '../../src/WriteFeedbackFlow/StartNow/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('StartNow', () => {
  describe('when there is a user', () => {
    describe('when the user can write feedback', () => {
      describe("when they haven't started feedback", () => {
        test.prop([fc.integer(), fc.supportedLocale(), fc.user(), fc.prereview(), fc.uuid()])(
          'when the feedback can be created',
          (id, locale, user, prereview, feedbackId) =>
            Effect.gen(function* () {
              const handleFeedbackCommand = jest.fn<typeof Feedback.HandleFeedbackCommand.Service>(_ => Effect.void)

              const actual = yield* Effect.provideService(
                _.StartNow({ id }),
                Feedback.HandleFeedbackCommand,
                handleFeedbackCommand,
              )

              expect(actual).toStrictEqual({
                _tag: 'RedirectResponse',
                status: StatusCodes.SEE_OTHER,
                location: DecideNextPage.NextPageAfterCommand({
                  command: 'StartFeedback',
                  feedback: new Feedback.FeedbackNotStarted(),
                }).href({ feedbackId }),
              })

              expect(handleFeedbackCommand).toHaveBeenCalledWith({
                feedbackId: expect.anything(),
                command: new Feedback.StartFeedback({ prereviewId: prereview.id, authorId: user.orcid }),
              })
            }).pipe(
              Effect.provideService(Locale, locale),
              Effect.provideService(Uuid.GenerateUuid, Effect.succeed(feedbackId)),
              Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, () =>
                Effect.sync(Record.empty),
              ),
              Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
              Effect.provideService(CanWriteFeedback, () => true),
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
          fc.oneof(fc.constant(new Feedback.UnableToHandleCommand({})), fc.feedbackError()),
        ])("when the feedback can't be created", (id, locale, user, prereview, feedbackId, error) =>
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
            Effect.provideService(Uuid.GenerateUuid, Effect.succeed(feedbackId)),
            Effect.provideService(Feedback.HandleFeedbackCommand, () => Effect.fail(error)),
            Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, () =>
              Effect.sync(Record.empty),
            ),
            Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
            Effect.provideService(CanWriteFeedback, () => true),
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
          fc.oneof(fc.feedbackInProgress(), fc.feedbackReadyForPublishing(), fc.feedbackBeingPublished()),
          { minKeys: 1 },
        ),
      ])('when they have started feedback', (id, locale, user, prereview, feedback) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ id })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.WriteFeedbackStartNow.href({ id: prereview.id }),
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
          Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, () =>
            Effect.succeed(feedback),
          ),
          Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
          Effect.provideService(CanWriteFeedback, () => true),
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
          Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, shouldNotBeCalled),
          Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewWasRemoved())),
          Effect.provideService(CanWriteFeedback, () => true),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
      )

      test.prop([fc.integer(), fc.supportedLocale(), fc.user(), fc.prereview()])(
        "when the feedback can't be loaded",
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
            Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
            Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, () =>
              Effect.fail(new Feedback.UnableToQuery({})),
            ),
            Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
            Effect.provideService(CanWriteFeedback, () => true),
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
          Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, shouldNotBeCalled),
          Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewIsNotFound())),
          Effect.provideService(CanWriteFeedback, () => true),
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
            Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
            Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, shouldNotBeCalled),
            Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewIsUnavailable())),
            Effect.provideService(CanWriteFeedback, () => true),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
      )
    })

    test.prop([fc.integer(), fc.supportedLocale(), fc.user()])(
      'when the user cannot write feedback',
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
          Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, shouldNotBeCalled),
          Effect.provideService(Prereview.GetPrereview, shouldNotBeCalled),
          Effect.provideService(CanWriteFeedback, () => false),
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
        location: Routes.WriteFeedbackStartNow.href({ id }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
      Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
      Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, shouldNotBeCalled),
      Effect.provideService(Prereview.GetPrereview, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
