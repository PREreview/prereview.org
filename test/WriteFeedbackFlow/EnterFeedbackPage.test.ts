import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { LoggedInUser } from '../../src/Context.js'
import * as Feedback from '../../src/Feedback/index.js'
import * as _ from '../../src/WriteFeedbackFlow/EnterFeedbackPage/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('EnterFeedbackPage', () => {
  describe('when there is a user', () => {
    test.prop([fc.uuid(), fc.oneof(fc.feedbackInProgress(), fc.feedbackReadyForPublishing()), fc.user()])(
      'when the feedback is in progress',
      (feedbackId, feedback, user) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackPage({ feedbackId })

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
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([fc.uuid(), fc.feedbackPublished(), fc.user()])(
      'when the feedback has been published',
      (feedbackId, feedback, user) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackPage({ feedbackId })

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
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([fc.uuid(), fc.feedbackNotStarted(), fc.user()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackPage({ feedbackId })

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
        const actual = yield* _.EnterFeedbackPage({ feedbackId })

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
      const actual = yield* _.EnterFeedbackPage({ feedbackId })

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
