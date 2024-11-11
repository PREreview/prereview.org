import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either, pipe, TestContext } from 'effect'
import * as Comments from '../../src/Comments/index.js'
import * as _ from '../../src/Comments/React.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('OnCommentPublicationWasRequested', () => {
  test.prop([fc.uuid(), fc.commentPublicationWasRequested(), fc.commentBeingPublished(), fc.integer(), fc.doi()])(
    'assigns a DOI',
    (feedbackId, event, feedback, id, doi) =>
      Effect.gen(function* () {
        const handleFeedbackCommand = jest.fn<typeof Comments.HandleFeedbackCommand.Service>(_ => Effect.void)

        yield* Effect.provideService(
          _.OnCommentPublicationWasRequested({ feedbackId, event }),
          Comments.HandleFeedbackCommand,
          handleFeedbackCommand,
        )

        expect(handleFeedbackCommand).toHaveBeenCalledWith({
          feedbackId,
          command: new Comments.MarkDoiAsAssigned({ doi, id }),
        })
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
        Effect.provideService(Comments.AssignFeedbackADoi, () => Effect.succeed([doi, id])),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([
    fc.uuid(),
    fc.commentPublicationWasRequested(),
    fc.commentBeingPublished(),
    fc.integer(),
    fc.doi(),
    fc.commentError(),
  ])("when the feedback can't be updated", (feedbackId, event, feedback, id, doi, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnCommentPublicationWasRequested({ feedbackId, event }),
        Effect.provideService(Comments.HandleFeedbackCommand, () => Effect.fail(error)),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToHandleCommand({ cause: error })))
    }).pipe(
      Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
      Effect.provideService(Comments.AssignFeedbackADoi, () => Effect.succeed([doi, id])),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid(), fc.commentPublicationWasRequested(), fc.commentBeingPublished()])(
    "when a DOI can't be assigned",
    (feedbackId, event, feedback) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.OnCommentPublicationWasRequested({ feedbackId, event }),
          Effect.provideService(Comments.AssignFeedbackADoi, () => Effect.fail(new Comments.UnableToAssignADoi({}))),
          Effect.provideService(Comments.PublishFeedbackWithADoi, shouldNotBeCalled),
          Effect.provideService(Comments.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Comments.UnableToPublishFeedback({})))
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid(), fc.commentPublicationWasRequested()])("when the feedback can't be read", (feedbackId, event) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnCommentPublicationWasRequested({ feedbackId, event }),
        Effect.provideService(Comments.GetComment, () => Effect.fail(new Comments.UnableToQuery({}))),
        Effect.provideService(Comments.AssignFeedbackADoi, shouldNotBeCalled),
        Effect.provideService(Comments.PublishFeedbackWithADoi, shouldNotBeCalled),
        Effect.provideService(Comments.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToQuery({})))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})

describe('OnDoiWasAssigned', () => {
  test.prop([fc.uuid(), fc.doiWasAssigned()])('published feedback', (feedbackId, event) =>
    Effect.gen(function* () {
      const handleFeedbackCommand = jest.fn<typeof Comments.HandleFeedbackCommand.Service>(_ => Effect.void)

      yield* Effect.provideService(
        _.OnDoiWasAssigned({ feedbackId, event }),
        Comments.HandleFeedbackCommand,
        handleFeedbackCommand,
      )

      expect(handleFeedbackCommand).toHaveBeenCalledWith({
        feedbackId,
        command: new Comments.MarkCommentAsPublished(),
      })
    }).pipe(
      Effect.provideService(Comments.PublishFeedbackWithADoi, () => Effect.void),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid(), fc.doiWasAssigned(), fc.commentError()])(
    "when the feedback can't be updated",
    (feedbackId, event, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.OnDoiWasAssigned({ feedbackId, event }),
          Effect.provideService(Comments.HandleFeedbackCommand, () => Effect.fail(error)),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Comments.UnableToHandleCommand({ cause: error })))
      }).pipe(
        Effect.provideService(Comments.PublishFeedbackWithADoi, () => Effect.void),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid(), fc.doiWasAssigned()])("when the feedback can't be published", (feedbackId, event) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnDoiWasAssigned({ feedbackId, event }),
        Effect.provideService(Comments.PublishFeedbackWithADoi, () =>
          Effect.fail(new Comments.UnableToPublishFeedback({})),
        ),
        Effect.provideService(Comments.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToPublishFeedback({})))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})
