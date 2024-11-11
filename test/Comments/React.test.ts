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
    (commentId, event, comment, id, doi) =>
      Effect.gen(function* () {
        const handleCommentCommand = jest.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

        yield* Effect.provideService(
          _.OnCommentPublicationWasRequested({ commentId, event }),
          Comments.HandleCommentCommand,
          handleCommentCommand,
        )

        expect(handleCommentCommand).toHaveBeenCalledWith({
          commentId,
          command: new Comments.MarkDoiAsAssigned({ doi, id }),
        })
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(Comments.AssignCommentADoi, () => Effect.succeed([doi, id])),
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
  ])("when the comment can't be updated", (commentId, event, comment, id, doi, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnCommentPublicationWasRequested({ commentId, event }),
        Effect.provideService(Comments.HandleCommentCommand, () => Effect.fail(error)),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToHandleCommand({ cause: error })))
    }).pipe(
      Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
      Effect.provideService(Comments.AssignCommentADoi, () => Effect.succeed([doi, id])),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid(), fc.commentPublicationWasRequested(), fc.commentBeingPublished()])(
    "when a DOI can't be assigned",
    (commentId, event, comment) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.OnCommentPublicationWasRequested({ commentId, event }),
          Effect.provideService(Comments.AssignCommentADoi, () => Effect.fail(new Comments.UnableToAssignADoi({}))),
          Effect.provideService(Comments.PublishFeedbackWithADoi, shouldNotBeCalled),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Comments.UnableToPublishFeedback({})))
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid(), fc.commentPublicationWasRequested()])("when the comment can't be read", (commentId, event) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnCommentPublicationWasRequested({ commentId, event }),
        Effect.provideService(Comments.GetComment, () => Effect.fail(new Comments.UnableToQuery({}))),
        Effect.provideService(Comments.AssignCommentADoi, shouldNotBeCalled),
        Effect.provideService(Comments.PublishFeedbackWithADoi, shouldNotBeCalled),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToQuery({})))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})

describe('OnDoiWasAssigned', () => {
  test.prop([fc.uuid(), fc.doiWasAssigned()])('published comment', (commentId, event) =>
    Effect.gen(function* () {
      const handleCommentCommand = jest.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

      yield* Effect.provideService(
        _.OnDoiWasAssigned({ commentId, event }),
        Comments.HandleCommentCommand,
        handleCommentCommand,
      )

      expect(handleCommentCommand).toHaveBeenCalledWith({
        commentId,
        command: new Comments.MarkCommentAsPublished(),
      })
    }).pipe(
      Effect.provideService(Comments.PublishFeedbackWithADoi, () => Effect.void),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid(), fc.doiWasAssigned(), fc.commentError()])(
    "when the comment can't be updated",
    (commentId, event, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.OnDoiWasAssigned({ commentId, event }),
          Effect.provideService(Comments.HandleCommentCommand, () => Effect.fail(error)),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Comments.UnableToHandleCommand({ cause: error })))
      }).pipe(
        Effect.provideService(Comments.PublishFeedbackWithADoi, () => Effect.void),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid(), fc.doiWasAssigned()])("when the comment can't be published", (commentId, event) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OnDoiWasAssigned({ commentId, event }),
        Effect.provideService(Comments.PublishFeedbackWithADoi, () =>
          Effect.fail(new Comments.UnableToPublishFeedback({})),
        ),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToPublishFeedback({})))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})
