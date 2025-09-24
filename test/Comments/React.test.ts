import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either, pipe } from 'effect'
import * as Comments from '../../src/Comments/index.ts'
import * as _ from '../../src/Comments/React.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

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

        expect(handleCommentCommand).toHaveBeenCalledWith(
          new Comments.ConfirmExistenceOfVerifiedEmailAddress({ commentId }),
        )
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(Comments.DoesUserHaveAVerifiedEmailAddress, () => Effect.succeed(true)),
        EffectTest.run,
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
        Effect.provideService(Comments.HandleCommentCommand, () => error),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToHandleCommand({ cause: error })))
    }).pipe(
      Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
      Effect.provideService(Comments.DoesUserHaveAVerifiedEmailAddress, () => Effect.succeed(true)),
      EffectTest.run,
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
        EffectTest.run,
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

        expect(actual).toStrictEqual(Either.left(new Comments.UnableToQuery({})))
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        EffectTest.run,
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
    }).pipe(EffectTest.run),
  )
})

describe('AssignCommentADoiWhenPublicationWasRequested', () => {
  test.prop([fc.uuid(), fc.inputForCommentZenodoRecord(), fc.integer(), fc.doi()])(
    'assigns a DOI',
    (commentId, inputForCommentZenodoRecord, id, doi) =>
      Effect.gen(function* () {
        const handleCommentCommand = jest.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

        yield* Effect.provideService(
          _.AssignCommentADoiWhenPublicationWasRequested({
            commentId,
            inputForCommentZenodoRecord,
          }),
          Comments.HandleCommentCommand,
          handleCommentCommand,
        )

        expect(handleCommentCommand).toHaveBeenCalledWith(new Comments.MarkDoiAsAssigned({ commentId, doi, id }))
      }).pipe(
        Effect.provideService(Comments.CreateRecordOnZenodoForComment, () => Effect.succeed([doi, id])),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.inputForCommentZenodoRecord(), fc.integer(), fc.doi(), fc.commentError()])(
    "when the command can't be handled",
    (commentId, inputForCommentZenodoRecord, id, doi, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.AssignCommentADoiWhenPublicationWasRequested({ commentId, inputForCommentZenodoRecord }),
          Effect.provideService(Comments.HandleCommentCommand, () => error),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(error))
      }).pipe(
        Effect.provideService(Comments.CreateRecordOnZenodoForComment, () => Effect.succeed([doi, id])),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.inputForCommentZenodoRecord()])(
    "when a DOI can't be assigned",
    (commentId, inputForCommentZenodoRecord) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.AssignCommentADoiWhenPublicationWasRequested({ commentId, inputForCommentZenodoRecord }),
          Effect.provideService(Comments.CreateRecordOnZenodoForComment, () =>
            Effect.fail(new Comments.UnableToAssignADoi({})),
          ),
          Effect.provideService(Comments.PublishCommentOnZenodo, shouldNotBeCalled),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Comments.UnableToAssignADoi({})))
      }).pipe(EffectTest.run),
  )
})

describe('PublishCommentWhenCommentWasAssignedADoi', () => {
  test.prop([
    fc
      .uuid()
      .chain(commentId =>
        fc.tuple(fc.constant(commentId), fc.commentWasAssignedADoi({ commentId: fc.constant(commentId) })),
      ),
  ])('published comment', ([commentId, event]) =>
    Effect.gen(function* () {
      const handleCommentCommand = jest.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

      yield* Effect.provideService(
        _.PublishCommentWhenCommentWasAssignedADoi(event),
        Comments.HandleCommentCommand,
        handleCommentCommand,
      )

      expect(handleCommentCommand).toHaveBeenCalledWith(new Comments.MarkCommentAsPublished({ commentId }))
    }).pipe(
      Effect.provideService(Comments.PublishCommentOnZenodo, () => Effect.void),
      EffectTest.run,
    ),
  )

  test.prop([fc.commentWasAssignedADoi(), fc.commentError()])("when the comment can't be updated", (event, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.PublishCommentWhenCommentWasAssignedADoi(event),
        Effect.provideService(Comments.HandleCommentCommand, () => error),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToHandleCommand({ cause: error })))
    }).pipe(
      Effect.provideService(Comments.PublishCommentOnZenodo, () => Effect.void),
      EffectTest.run,
    ),
  )

  test.prop([fc.commentWasAssignedADoi()])("when the comment can't be published", event =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.PublishCommentWhenCommentWasAssignedADoi(event),
        Effect.provideService(Comments.PublishCommentOnZenodo, () =>
          Effect.fail(new Comments.UnableToPublishComment({})),
        ),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Comments.UnableToPublishComment({})))
    }).pipe(EffectTest.run),
  )
})
