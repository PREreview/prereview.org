import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Equal, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { Locale, LoggedInUser } from '../../src/Context.js'
import * as Feedback from '../../src/Feedback/index.js'
import * as Routes from '../../src/routes.js'
import * as DecideNextPage from '../../src/WriteFeedbackFlow/DecideNextPage.js'
import * as _ from '../../src/WriteFeedbackFlow/EnterFeedbackPage/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('EnterFeedbackPage', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .oneof(fc.feedbackInProgress(), fc.feedbackReadyForPublishing())
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback is in progress', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.WriteFeedbackEnterFeedback.href({ feedbackId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['html-editor.js', 'editor-toolbar.js'],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .feedbackPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback has been published', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublished.href({ feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .feedbackBeingPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback is being published', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublishing.href({ feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.feedbackNotStarted(), fc.user(), fc.supportedLocale()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackPage({ feedbackId })

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
          Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.feedbackState(), fc.user())
        .filter(([state, user]) => state._tag !== 'FeedbackNotStarted' && !Equal.equals(state.authorId, user.orcid)),
      fc.supportedLocale(),
    ])('when the feedback is by a different author', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackPage({ feedbackId })

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
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale()])(
      "when the feedback can't be loaded",
      (feedbackId, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackPage({ feedbackId })

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
          Effect.provideService(Feedback.GetFeedback, () => Effect.fail(new Feedback.UnableToQuery({}))),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale()])("when there isn't a user", (feedbackId, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.EnterFeedbackPage({ feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteFeedbackEnterFeedback.href({ feedbackId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Feedback.GetFeedback, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})

describe('EnterFeedbackSubmission', () => {
  describe('when there is a user', () => {
    describe('when the feedback is in progress', () => {
      describe('when there is feedback', () => {
        test.prop([
          fc.uuid(),
          fc
            .oneof(fc.feedbackInProgress(), fc.feedbackReadyForPublishing())
            .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
          fc.supportedLocale(),
          fc.record({ feedback: fc.html() }),
        ])('when the feedback can be entered', (feedbackId, [feedback, user], locale, body) =>
          Effect.gen(function* () {
            const handleFeedbackCommand = jest.fn<typeof Feedback.HandleFeedbackCommand.Service>(_ => Effect.void)

            const actual = yield* Effect.provideService(
              _.EnterFeedbackSubmission({ body: { feedback: body.feedback.toString() }, feedbackId }),
              Feedback.HandleFeedbackCommand,
              handleFeedbackCommand,
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SEE_OTHER,
              location: DecideNextPage.NextPageAfterCommand({ command: 'EnterFeedback', feedback }).href({
                feedbackId,
              }),
            })

            expect(handleFeedbackCommand).toHaveBeenCalledWith({
              feedbackId,
              command: new Feedback.EnterFeedback({ feedback: body.feedback }),
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
        )

        test.prop([
          fc.uuid(),
          fc
            .oneof(fc.feedbackInProgress(), fc.feedbackReadyForPublishing())
            .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
          fc.supportedLocale(),
          fc.record({ feedback: fc.nonEmptyString() }),
          fc.oneof(fc.constant(new Feedback.UnableToHandleCommand({})), fc.feedbackError()),
        ])("when the feedback can't be entered", (feedbackId, [feedback, user], locale, body, error) =>
          Effect.gen(function* () {
            const actual = yield* _.EnterFeedbackSubmission({ body, feedbackId })

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
            Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
            Effect.provideService(Feedback.HandleFeedbackCommand, () => Effect.fail(error)),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
        )
      })

      test.prop([
        fc.uuid(),
        fc
          .oneof(fc.feedbackInProgress(), fc.feedbackReadyForPublishing())
          .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
        fc.supportedLocale(),
        fc.oneof(
          fc.record({ feedback: fc.constant('') }, { withDeletedKeys: true }),
          fc.anything().filter(body => typeof body === 'object' && (body === null || !Object.hasOwn(body, 'feedback'))),
        ),
      ])("when there isn't feedback", (feedbackId, [feedback, user], locale, body) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackSubmission({ body, feedbackId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.WriteFeedbackEnterFeedback.href({ feedbackId }),
            status: StatusCodes.BAD_REQUEST,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['html-editor.js', 'editor-toolbar.js', 'error-summary.js'],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
          Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
      )
    })

    test.prop([
      fc.uuid(),
      fc
        .feedbackPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
      fc.anything(),
    ])('when the feedback has been published', (feedbackId, [feedback, user], locale, body) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackSubmission({ body, feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublished.href({ feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .feedbackBeingPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
      fc.anything(),
    ])('when the feedback is beingpublished', (feedbackId, [feedback, user], locale, body) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackSubmission({ body, feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublishing.href({ feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.feedbackNotStarted(), fc.user(), fc.supportedLocale(), fc.anything()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user, locale, body) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackSubmission({ body, feedbackId })

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
          Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
          Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.feedbackState(), fc.user())
        .filter(([state, user]) => state._tag !== 'FeedbackNotStarted' && !Equal.equals(state.authorId, user.orcid)),
      fc.supportedLocale(),
      fc.anything(),
    ])('when the feedback is by a different author', (feedbackId, [feedback, user], locale, body) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackSubmission({ body, feedbackId })

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
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.anything()])(
      "when the feedback can't be loaded",
      (feedbackId, user, locale, body) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackSubmission({ body, feedbackId })

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
          Effect.provideService(Feedback.GetFeedback, () => Effect.fail(new Feedback.UnableToQuery({}))),
          Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale(), fc.anything()])("when there isn't a user", (feedbackId, locale, body) =>
    Effect.gen(function* () {
      const actual = yield* _.EnterFeedbackSubmission({ body, feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteFeedbackEnterFeedback.href({ feedbackId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Feedback.GetFeedback, shouldNotBeCalled),
      Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
