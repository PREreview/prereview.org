import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Equal, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { LoggedInUser } from '../../src/Context.js'
import * as Feedback from '../../src/Feedback/index.js'
import * as Routes from '../../src/routes.js'
import * as _ from '../../src/WriteFeedbackFlow/PublishingPage/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('PublishingPage', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .feedbackBeingPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
    ])('when the feedback is being published', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.WriteFeedbackPublishing.href({ feedbackId }),
          status: StatusCodes.OK,
          title: expect.stringContaining('publishing'),
          head: expect.stringContaining('refresh'),
          main: expect.stringContaining('publishing'),
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
        .feedbackPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
    ])('when the feedback is published', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ feedbackId })

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
        .oneof(fc.feedbackInProgress(), fc.feedbackReadyForPublishing())
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
    ])("when the feedback publication hasn't been requested", (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ feedbackId })

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
          const actual = yield* _.PublishingPage({ feedbackId })

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
        .tuple(fc.feedbackBeingPublished(), fc.user())
        .filter(([state, user]) => !Equal.equals(state.authorId, user.orcid)),
    ])('when the feedback is by a different author', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ feedbackId })

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
        const actual = yield* _.PublishingPage({ feedbackId })

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
      const actual = yield* _.PublishingPage({ feedbackId })

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
