import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Equal, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { LoggedInUser } from '../../src/Context.js'
import * as Feedback from '../../src/Feedback/index.js'
import * as Routes from '../../src/routes.js'
import * as _ from '../../src/WriteFeedbackFlow/CheckPage/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('CheckPage', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .feedbackReadyForPublishing()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
    ])('when the feedback is ready for publishing', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.WriteFeedbackCheck.href({ feedbackId }),
          status: StatusCodes.OK,
          title: expect.stringContaining('Check your feedback'),
          main: expect.stringContaining('Check your feedback'),
          skipToLabel: 'form',
          js: ['single-use-form.js'],
        })
      }).pipe(
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
    ])('when the feedback has been published', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublished.href({ feedbackId }),
        })
      }).pipe(
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
    ])('when the feedback is being published', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublishing.href({ feedbackId }),
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .feedbackInProgress()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
    ])("when the feedback isn't complete", (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NOT_FOUND,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.feedbackNotStarted(), fc.user()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckPage({ feedbackId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.stringContaining('not found'),
            main: expect.stringContaining('not found'),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
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
    ])('when the feedback is by a different author', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NOT_FOUND,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user()])("when the feedback can't be loaded", (feedbackId, user) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.SERVICE_UNAVAILABLE,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.fail(new Feedback.UnableToQuery({}))),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )
  })

  test.prop([fc.uuid()])("when there isn't a user", feedbackId =>
    Effect.gen(function* () {
      const actual = yield* _.CheckPage({ feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NOT_FOUND,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Feedback.GetFeedback, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})

describe('CheckPageSubmission', () => {
  describe('when there is a user', () => {
    describe('when the feedback is ready for publishing', () => {
      test.prop([
        fc.uuid(),
        fc
          .feedbackReadyForPublishing()
          .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      ])('when the feedback can be published', (feedbackId, [feedback, user]) =>
        Effect.gen(function* () {
          const handleFeedbackCommand = jest.fn<typeof Feedback.HandleFeedbackCommand.Service>(_ => Effect.void)

          const actual = yield* Effect.provideService(
            _.CheckPageSubmission({ feedbackId }),
            Feedback.HandleFeedbackCommand,
            handleFeedbackCommand,
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SEE_OTHER,
            location: Routes.WriteFeedbackPublishing.href({ feedbackId }),
          })

          expect(handleFeedbackCommand).toHaveBeenCalledWith({
            feedbackId,
            command: new Feedback.PublishFeedback(),
          })
        }).pipe(
          Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
      )

      test.prop([
        fc.uuid(),
        fc
          .feedbackReadyForPublishing()
          .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
        fc.oneof(fc.constant(new Feedback.UnableToHandleCommand({})), fc.feedbackError()),
      ])("when the feedback can't be published", (feedbackId, [feedback, user], error) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckPageSubmission({ feedbackId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.SERVICE_UNAVAILABLE,
            title: expect.stringContaining('problems'),
            main: expect.stringContaining('problems'),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
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
        .feedbackPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
    ])('when the feedback has been published', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckPageSubmission({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublished.href({ feedbackId }),
        })
      }).pipe(
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
    ])('when the feedback is being published', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckPageSubmission({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublishing.href({ feedbackId }),
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.feedbackInProgress(), fc.user()])(
      'when the feedback is incomplete',
      (feedbackId, feedback, user) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckPageSubmission({ feedbackId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.stringContaining('not found'),
            main: expect.stringContaining('not found'),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
          Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([fc.uuid(), fc.feedbackNotStarted(), fc.user()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckPageSubmission({ feedbackId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.stringContaining('not found'),
            main: expect.stringContaining('not found'),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
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
    ])('when the feedback is by a different author', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckPageSubmission({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NOT_FOUND,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user()])("when the feedback can't be loaded", (feedbackId, user) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckPageSubmission({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.SERVICE_UNAVAILABLE,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.fail(new Feedback.UnableToQuery({}))),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )
  })

  test.prop([fc.uuid()])("when there isn't a user", feedbackId =>
    Effect.gen(function* () {
      const actual = yield* _.CheckPageSubmission({ feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NOT_FOUND,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Feedback.GetFeedback, shouldNotBeCalled),
      Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
