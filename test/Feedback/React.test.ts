import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either, pipe, TestContext } from 'effect'
import * as Feedback from '../../src/Feedback/index.js'
import * as _ from '../../src/Feedback/React.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('OnFeedbackPublicationWasRequested', () => {
  test.prop([fc.uuid(), fc.feedbackBeingPublished(), fc.integer(), fc.doi()])(
    'published feedback',
    (feedbackId, feedback, id, doi) =>
      Effect.gen(function* () {
        const handleFeedbackCommand = jest.fn<typeof Feedback.HandleFeedbackCommand.Service>(_ => Effect.void)

        yield* Effect.provideService(
          _.OnFeedbackPublicationWasRequested(feedbackId),
          Feedback.HandleFeedbackCommand,
          handleFeedbackCommand,
        )

        expect(handleFeedbackCommand).toHaveBeenCalledWith({
          feedbackId,
          command: new Feedback.MarkFeedbackAsPublished({ doi, id }),
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(Feedback.PublishFeedbackWithADoi, () => Effect.succeed([doi, id])),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid(), fc.feedbackBeingPublished(), fc.integer(), fc.doi(), fc.feedbackError()])(
    "when the feedback can't be updated",
    (feedbackId, feedback, id, doi, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.OnFeedbackPublicationWasRequested(feedbackId),
          Effect.provideService(Feedback.HandleFeedbackCommand, () => Effect.fail(error)),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Feedback.UnableToHandleCommand({ cause: error })))
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(Feedback.PublishFeedbackWithADoi, () => Effect.succeed([doi, id])),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid(), fc.feedbackBeingPublished()])("when the feedback can't be published", (feedbackId, feedback) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnFeedbackPublicationWasRequested(feedbackId),
        Effect.provideService(Feedback.PublishFeedbackWithADoi, () =>
          Effect.fail(new Feedback.UnableToPublishFeedback({})),
        ),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Feedback.UnableToPublishFeedback({})))
    }).pipe(
      Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid()])("when the feedback can't be read", feedbackId =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnFeedbackPublicationWasRequested(feedbackId),
        Effect.provideService(Feedback.GetFeedback, () => Effect.fail(new Feedback.UnableToQuery({}))),
        Effect.provideService(Feedback.PublishFeedbackWithADoi, shouldNotBeCalled),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Feedback.UnableToQuery({})))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})
