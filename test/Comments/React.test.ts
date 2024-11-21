import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either, pipe, TestContext } from 'effect'
import * as Comments from '../../src/Comments/index.js'
import * as _ from '../../src/Comments/React.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('CheckIfUserHasAVerifiedEmailAddress', () => {
  test.prop([fc.uuid(), fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })])(
    'marks the email addess as verified',
    (commentId, comment) =>
      Effect.gen(function* () {
        const handleCommentCommand = jest.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

        yield* Effect.provideService(
          _.CheckIfUserHasAVerifiedEmailAddress(commentId),
          Comments.HandleCommentCommand,
          handleCommentCommand,
        )

        expect(handleCommentCommand).toHaveBeenCalledWith({
          commentId,
          command: new Comments.ConfirmExistenceOfVerifiedEmailAddress(),
        })
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(Comments.DoesUserHaveAVerifiedEmailAddress, () => Effect.succeed(true)),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([
    fc.uuid(),
    fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) }),
    fc.commentError(),
  ])("when the comment can't be updated", (commentId, comment, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.CheckIfUserHasAVerifiedEmailAddress(commentId),
        Effect.provideService(Comments.HandleCommentCommand, () => Effect.fail(error)),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToHandleCommand({ cause: error })))
    }).pipe(
      Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
      Effect.provideService(Comments.DoesUserHaveAVerifiedEmailAddress, () => Effect.succeed(true)),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid(), fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })])(
    "when there isn't a verified contact email address",
    (commentId, comment) =>
      Effect.gen(function* () {
        yield* pipe(
          _.CheckIfUserHasAVerifiedEmailAddress(commentId),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        )
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(Comments.DoesUserHaveAVerifiedEmailAddress, () => Effect.succeed(false)),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid(), fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })])(
    "when a contact email address can't be read",
    (commentId, comment) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.CheckIfUserHasAVerifiedEmailAddress(commentId),
          Effect.provideService(Comments.DoesUserHaveAVerifiedEmailAddress, () =>
            Effect.fail(new Comments.UnableToQuery({})),
          ),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Comments.UnableToPublishComment({})))
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid()])("when the comment can't be read", commentId =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.CheckIfUserHasAVerifiedEmailAddress(commentId),
        Effect.provideService(Comments.GetComment, () => Effect.fail(new Comments.UnableToQuery({}))),
        Effect.provideService(Comments.DoesUserHaveAVerifiedEmailAddress, shouldNotBeCalled),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToQuery({})))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})

describe('AssignCommentADoiWhenPublicationWasRequested', () => {
  test.prop([fc.uuid(), fc.commentBeingPublished(), fc.integer(), fc.doi()])(
    'assigns a DOI',
    (commentId, comment, id, doi) =>
      Effect.gen(function* () {
        const handleCommentCommand = jest.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

        yield* Effect.provideService(
          _.AssignCommentADoiWhenPublicationWasRequested(commentId),
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

  test.prop([fc.uuid(), fc.commentBeingPublished(), fc.integer(), fc.doi(), fc.commentError()])(
    "when the comment can't be updated",
    (commentId, comment, id, doi, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.AssignCommentADoiWhenPublicationWasRequested(commentId),
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

  test.prop([fc.uuid(), fc.commentBeingPublished()])("when a DOI can't be assigned", (commentId, comment) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.AssignCommentADoiWhenPublicationWasRequested(commentId),
        Effect.provideService(Comments.AssignCommentADoi, () => Effect.fail(new Comments.UnableToAssignADoi({}))),
        Effect.provideService(Comments.PublishCommentWithADoi, shouldNotBeCalled),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToPublishComment({})))
    }).pipe(
      Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid()])("when the comment can't be read", commentId =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.AssignCommentADoiWhenPublicationWasRequested(commentId),
        Effect.provideService(Comments.GetComment, () => Effect.fail(new Comments.UnableToQuery({}))),
        Effect.provideService(Comments.AssignCommentADoi, shouldNotBeCalled),
        Effect.provideService(Comments.PublishCommentWithADoi, shouldNotBeCalled),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToQuery({})))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})

describe('PublishCommentWhenDoiWasAssigned', () => {
  test.prop([fc.uuid(), fc.doiWasAssigned()])('published comment', (commentId, event) =>
    Effect.gen(function* () {
      const handleCommentCommand = jest.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

      yield* Effect.provideService(
        _.PublishCommentWhenDoiWasAssigned({ commentId, event }),
        Comments.HandleCommentCommand,
        handleCommentCommand,
      )

      expect(handleCommentCommand).toHaveBeenCalledWith({
        commentId,
        command: new Comments.MarkCommentAsPublished(),
      })
    }).pipe(
      Effect.provideService(Comments.PublishCommentWithADoi, () => Effect.void),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.uuid(), fc.doiWasAssigned(), fc.commentError()])(
    "when the comment can't be updated",
    (commentId, event, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.PublishCommentWhenDoiWasAssigned({ commentId, event }),
          Effect.provideService(Comments.HandleCommentCommand, () => Effect.fail(error)),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Comments.UnableToHandleCommand({ cause: error })))
      }).pipe(
        Effect.provideService(Comments.PublishCommentWithADoi, () => Effect.void),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.uuid(), fc.doiWasAssigned()])("when the comment can't be published", (commentId, event) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.PublishCommentWhenDoiWasAssigned({ commentId, event }),
        Effect.provideService(Comments.PublishCommentWithADoi, () =>
          Effect.fail(new Comments.UnableToPublishComment({})),
        ),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToPublishComment({})))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})
