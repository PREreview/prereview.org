import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Either, pipe } from 'effect'
import * as Comments from '../../src/Comments/index.ts'
import * as _ from '../../src/Comments/React.ts'
import * as Queries from '../../src/Queries.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('CheckIfUserHasAVerifiedEmailAddress', () => {
  it.effect.prop(
    'marks the email addess as verified',
    [fc.uuid(), fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })],
    ([commentId, comment]) =>
      Effect.gen(function* () {
        const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

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
      ),
  )

  it.effect.prop(
    "when the comment can't be updated",
    [fc.uuid(), fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) }), fc.commentError()],
    ([commentId, comment, error]) =>
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
      ),
  )

  it.effect.prop(
    "when there isn't a verified contact email address",
    [fc.uuid(), fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })],
    ([commentId, comment]) =>
      Effect.gen(function* () {
        yield* pipe(
          _.CheckIfUserHasAVerifiedEmailAddress(commentId),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        )
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(Comments.DoesUserHaveAVerifiedEmailAddress, () => Effect.succeed(false)),
      ),
  )

  it.effect.prop(
    "when a contact email address can't be read",
    [fc.uuid(), fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })],
    ([commentId, comment]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.CheckIfUserHasAVerifiedEmailAddress(commentId),
          Effect.provideService(Comments.DoesUserHaveAVerifiedEmailAddress, () => new Queries.UnableToQuery({})),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Queries.UnableToQuery({})))
      }).pipe(Effect.provideService(Comments.GetComment, () => Effect.succeed(comment))),
  )

  it.effect.prop("when the comment can't be read", [fc.uuid()], ([commentId]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.CheckIfUserHasAVerifiedEmailAddress(commentId),
        Effect.provideService(Comments.GetComment, () => new Queries.UnableToQuery({})),
        Effect.provideService(Comments.DoesUserHaveAVerifiedEmailAddress, shouldNotBeCalled),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.either,
      )

      expect(actual).toStrictEqual(Either.left(new Queries.UnableToQuery({})))
    }),
  )
})

describe('AssignCommentADoiWhenPublicationWasRequested', () => {
  it.effect.prop(
    'assigns a DOI',
    [fc.uuid(), fc.inputForCommentZenodoRecord(), fc.integer(), fc.doi()],
    ([commentId, inputForCommentZenodoRecord, id, doi]) =>
      Effect.gen(function* () {
        const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

        yield* Effect.provideService(
          _.AssignCommentADoiWhenPublicationWasRequested({
            commentId,
            inputForCommentZenodoRecord,
          }),
          Comments.HandleCommentCommand,
          handleCommentCommand,
        )

        expect(handleCommentCommand).toHaveBeenCalledWith(new Comments.MarkDoiAsAssigned({ commentId, doi, id }))
      }).pipe(Effect.provideService(Comments.CreateRecordOnZenodoForComment, () => Effect.succeed([doi, id]))),
  )

  it.effect.prop(
    "when the command can't be handled",
    [fc.uuid(), fc.inputForCommentZenodoRecord(), fc.integer(), fc.doi(), fc.commentError()],
    ([commentId, inputForCommentZenodoRecord, id, doi, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.AssignCommentADoiWhenPublicationWasRequested({ commentId, inputForCommentZenodoRecord }),
          Effect.provideService(Comments.HandleCommentCommand, () => error),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(error))
      }).pipe(Effect.provideService(Comments.CreateRecordOnZenodoForComment, () => Effect.succeed([doi, id]))),
  )

  it.effect.prop(
    "when a DOI can't be assigned",
    [fc.uuid(), fc.inputForCommentZenodoRecord()],
    ([commentId, inputForCommentZenodoRecord]) =>
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
      }),
  )
})

describe('PublishCommentWhenCommentWasAssignedADoi', () => {
  it.effect.prop(
    'published comment',
    [
      fc
        .uuid()
        .chain(commentId =>
          fc.tuple(fc.constant(commentId), fc.commentWasAssignedADoi({ commentId: fc.constant(commentId) })),
        ),
    ],
    ([[commentId, event]]) =>
      Effect.gen(function* () {
        const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)

        yield* Effect.provideService(
          _.PublishCommentWhenCommentWasAssignedADoi(event),
          Comments.HandleCommentCommand,
          handleCommentCommand,
        )

        expect(handleCommentCommand).toHaveBeenCalledWith(new Comments.MarkCommentAsPublished({ commentId }))
      }).pipe(Effect.provideService(Comments.PublishCommentOnZenodo, () => Effect.void)),
  )

  it.effect.prop(
    "when the comment can't be updated",
    [fc.commentWasAssignedADoi(), fc.commentError()],
    ([event, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.PublishCommentWhenCommentWasAssignedADoi(event),
          Effect.provideService(Comments.HandleCommentCommand, () => error),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.left(new Comments.UnableToHandleCommand({ cause: error })))
      }).pipe(Effect.provideService(Comments.PublishCommentOnZenodo, () => Effect.void)),
  )

  it.effect.prop("when the comment can't be published", [fc.commentWasAssignedADoi()], ([event]) =>
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
    }),
  )
})
