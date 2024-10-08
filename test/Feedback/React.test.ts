import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either, TestContext } from 'effect'
import * as Feedback from '../../src/Feedback/index.js'
import * as _ from '../../src/Feedback/React.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('OnFeedbackPublicationWasRequested', () => {
  test.prop([fc.uuid(), fc.feedbackPublicationWasRequested(), fc.feedbackBeingPublished(), fc.integer(), fc.doi()])(
    'published feedback',
    (feedbackId, event, feedback, id, doi) =>
      Effect.gen(function* () {
        const handleFeedbackCommand = jest.fn<typeof Feedback.HandleFeedbackCommand.Service>(_ => Effect.void)

        yield* Effect.provideService(
          _.OnFeedbackPublicationWasRequested({ feedbackId, event }),
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

  test.prop([
    fc.uuid(),
    fc.feedbackPublicationWasRequested(),
    fc.feedbackBeingPublished(),
    fc.integer(),
    fc.doi(),
    fc.feedbackError(),
  ])("when the feedback can't be updated", (feedbackId, event, feedback, id, doi, error) =>
    Effect.gen(function* () {
      const actual = yield* Effect.either(_.OnFeedbackPublicationWasRequested({ feedbackId, event }))

      expect(actual).toStrictEqual(Either.left(new Feedback.UnableToHandleCommand({ cause: error })))
    }).pipe(
      Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
      Effect.provideService(Feedback.PublishFeedbackWithADoi, () => Effect.succeed([doi, id])),
      Effect.provideService(Feedback.HandleFeedbackCommand, () => Effect.fail(error)),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid(), fc.feedbackPublicationWasRequested(), fc.feedbackBeingPublished()])(
    "when the feedback can't be published",
    (feedbackId, event, feedback) =>
      Effect.gen(function* () {
        const actual = yield* Effect.either(_.OnFeedbackPublicationWasRequested({ feedbackId, event }))

        expect(actual).toStrictEqual(Either.left(new Feedback.UnableToPublishFeedback({})))
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(Feedback.PublishFeedbackWithADoi, () =>
          Effect.fail(new Feedback.UnableToPublishFeedback({})),
        ),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid(), fc.feedbackPublicationWasRequested()])("when the feedback can't be read", (feedbackId, event) =>
    Effect.gen(function* () {
      const actual = yield* Effect.either(_.OnFeedbackPublicationWasRequested({ feedbackId, event }))

      expect(actual).toStrictEqual(Either.left(new Feedback.UnableToQuery({})))
    }).pipe(
      Effect.provideService(Feedback.GetFeedback, () => Effect.fail(new Feedback.UnableToQuery({}))),
      Effect.provideService(Feedback.PublishFeedbackWithADoi, shouldNotBeCalled),
      Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
