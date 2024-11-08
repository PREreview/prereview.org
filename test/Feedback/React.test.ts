import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either, pipe, TestContext } from 'effect'
import * as Feedback from '../../src/Feedback/index.js'
import * as _ from '../../src/Feedback/React.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('OnFeedbackPublicationWasRequested', () => {
  test.prop([fc.uuid(), fc.commentPublicationWasRequested(), fc.feedbackBeingPublished(), fc.integer(), fc.doi()])(
    'assigns a DOI',
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
          command: new Feedback.MarkDoiAsAssigned({ doi, id }),
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(Feedback.AssignFeedbackADoi, () => Effect.succeed([doi, id])),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([
    fc.uuid(),
    fc.commentPublicationWasRequested(),
    fc.feedbackBeingPublished(),
    fc.integer(),
    fc.doi(),
    fc.feedbackError(),
  ])("when the feedback can't be updated", (feedbackId, event, feedback, id, doi, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnFeedbackPublicationWasRequested({ feedbackId, event }),
        Effect.provideService(Feedback.HandleFeedbackCommand, () => Effect.fail(error)),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Feedback.UnableToHandleCommand({ cause: error })))
    }).pipe(
      Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
      Effect.provideService(Feedback.AssignFeedbackADoi, () => Effect.succeed([doi, id])),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid(), fc.commentPublicationWasRequested(), fc.feedbackBeingPublished()])(
    "when a DOI can't be assigned",
    (feedbackId, event, feedback) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.OnFeedbackPublicationWasRequested({ feedbackId, event }),
          Effect.provideService(Feedback.AssignFeedbackADoi, () => Effect.fail(new Feedback.UnableToAssignADoi({}))),
          Effect.provideService(Feedback.PublishFeedbackWithADoi, shouldNotBeCalled),
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

  test.prop([fc.uuid(), fc.commentPublicationWasRequested()])("when the feedback can't be read", (feedbackId, event) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnFeedbackPublicationWasRequested({ feedbackId, event }),
        Effect.provideService(Feedback.GetFeedback, () => Effect.fail(new Feedback.UnableToQuery({}))),
        Effect.provideService(Feedback.AssignFeedbackADoi, shouldNotBeCalled),
        Effect.provideService(Feedback.PublishFeedbackWithADoi, shouldNotBeCalled),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Feedback.UnableToQuery({})))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})

describe('OnDoiWasAssigned', () => {
  test.prop([fc.uuid(), fc.doiWasAssigned()])('published feedback', (feedbackId, event) =>
    Effect.gen(function* () {
      const handleFeedbackCommand = jest.fn<typeof Feedback.HandleFeedbackCommand.Service>(_ => Effect.void)

      yield* Effect.provideService(
        _.OnDoiWasAssigned({ feedbackId, event }),
        Feedback.HandleFeedbackCommand,
        handleFeedbackCommand,
      )

      expect(handleFeedbackCommand).toHaveBeenCalledWith({
        feedbackId,
        command: new Feedback.MarkFeedbackAsPublished(),
      })
    }).pipe(
      Effect.provideService(Feedback.PublishFeedbackWithADoi, () => Effect.void),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid(), fc.doiWasAssigned(), fc.feedbackError()])(
    "when the feedback can't be updated",
    (feedbackId, event, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.OnDoiWasAssigned({ feedbackId, event }),
          Effect.provideService(Feedback.HandleFeedbackCommand, () => Effect.fail(error)),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Feedback.UnableToHandleCommand({ cause: error })))
      }).pipe(
        Effect.provideService(Feedback.PublishFeedbackWithADoi, () => Effect.void),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid(), fc.doiWasAssigned()])("when the feedback can't be published", (feedbackId, event) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnDoiWasAssigned({ feedbackId, event }),
        Effect.provideService(Feedback.PublishFeedbackWithADoi, () =>
          Effect.fail(new Feedback.UnableToPublishFeedback({})),
        ),
        Effect.provideService(Feedback.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Feedback.UnableToPublishFeedback({})))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})
