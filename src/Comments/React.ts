import { Effect, pipe } from 'effect'
import { ContactEmailAddresses } from '../ContactEmailAddresses/index.ts'
import type { Uuid } from '../types/index.ts'
import { ConfirmExistenceOfVerifiedEmailAddress, MarkCommentAsPublished, MarkDoiAsAssigned } from './Commands.ts'
import {
  CreateRecordOnZenodoForComment,
  GetComment,
  HandleCommentCommand,
  type InputForCommentZenodoRecord,
  PublishCommentOnZenodo,
  type UnableToAssignADoi,
  UnableToHandleCommand,
} from './Context.ts'
import type { CommentError } from './Errors.ts'
import type { CommentWasAssignedADoi } from './Events.ts'

type ToDo = unknown

export const CheckIfUserHasAVerifiedEmailAddress = (
  commentId: Uuid.Uuid,
): Effect.Effect<void, ToDo, GetComment | ContactEmailAddresses | HandleCommentCommand> =>
  Effect.gen(function* () {
    const getComment = yield* GetComment
    const handleCommand = yield* HandleCommentCommand
    const contactEmailAddresses = yield* ContactEmailAddresses

    const comment = yield* getComment(commentId)

    if (comment._tag !== 'CommentInProgress' || comment.verifiedEmailAddressExists) {
      return
    }

    const userHasAVerifiedEmailAddress = yield* pipe(
      contactEmailAddresses.getContactEmailAddress(comment.authorId),
      Effect.andThen(emailAddress => emailAddress._tag === 'VerifiedContactEmailAddress'),
      Effect.catchTag('ContactEmailAddressIsNotFound', () => Effect.succeed(false)),
    )

    if (!userHasAVerifiedEmailAddress) {
      return
    }

    yield* Effect.mapError(handleCommand(new ConfirmExistenceOfVerifiedEmailAddress({ commentId })), error =>
      error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error,
    )
  })

export const AssignCommentADoiWhenPublicationWasRequested = ({
  commentId,
  inputForCommentZenodoRecord,
}: {
  commentId: Uuid.Uuid
  inputForCommentZenodoRecord: InputForCommentZenodoRecord
}): Effect.Effect<
  void,
  UnableToHandleCommand | CommentError | UnableToAssignADoi,
  HandleCommentCommand | CreateRecordOnZenodoForComment
> =>
  Effect.gen(function* () {
    const handleCommand = yield* HandleCommentCommand
    const createRecordOnZenodoForComment = yield* CreateRecordOnZenodoForComment

    yield* pipe(
      inputForCommentZenodoRecord,
      createRecordOnZenodoForComment,
      Effect.andThen(([doi, id]) => handleCommand(new MarkDoiAsAssigned({ commentId, doi, id }))),
    )
  })

export const PublishCommentWhenCommentWasAssignedADoi = (
  event: CommentWasAssignedADoi,
): Effect.Effect<void, ToDo, HandleCommentCommand | PublishCommentOnZenodo> =>
  Effect.gen(function* () {
    const handleCommand = yield* HandleCommentCommand
    const publishCommentOnZenodo = yield* PublishCommentOnZenodo

    yield* publishCommentOnZenodo(event.id)

    yield* Effect.mapError(handleCommand(new MarkCommentAsPublished({ commentId: event.commentId })), error =>
      error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error,
    )
  })
