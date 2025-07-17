import { Effect, pipe } from 'effect'
import type { Uuid } from '../types/index.js'
import { ConfirmExistenceOfVerifiedEmailAddress, MarkCommentAsPublished, MarkDoiAsAssigned } from './Commands.js'
import {
  CreateRecordOnZenodoForComment,
  DoesUserHaveAVerifiedEmailAddress,
  GetComment,
  HandleCommentCommand,
  type InputForCommentZenodoRecord,
  PublishCommentOnZenodo,
  type UnableToAssignADoi,
  UnableToHandleCommand,
} from './Context.js'
import type { CommentError } from './Errors.js'
import type { CommentWasAssignedADoi } from './Events.js'

type ToDo = unknown

export const CheckIfUserHasAVerifiedEmailAddress = (
  commentId: Uuid.Uuid,
): Effect.Effect<void, ToDo, GetComment | DoesUserHaveAVerifiedEmailAddress | HandleCommentCommand> =>
  Effect.gen(function* () {
    const getComment = yield* GetComment
    const handleCommand = yield* HandleCommentCommand
    const doesUserHaveAVerifiedEmailAddress = yield* DoesUserHaveAVerifiedEmailAddress

    const comment = yield* getComment(commentId)

    if (comment._tag !== 'CommentInProgress' || comment.verifiedEmailAddressExists) {
      return
    }

    const userHasAVerifiedEmailAddress = yield* doesUserHaveAVerifiedEmailAddress(comment.authorId)

    if (!userHasAVerifiedEmailAddress) {
      return
    }

    yield* Effect.mapError(
      handleCommand({
        commentId,
        command: new ConfirmExistenceOfVerifiedEmailAddress(),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
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
      Effect.andThen(([doi, id]) =>
        handleCommand({
          commentId,
          command: new MarkDoiAsAssigned({ doi, id }),
        }),
      ),
    )
  })

export const PublishCommentWhenCommentWasAssignedADoi = ({
  commentId,
  event,
}: {
  commentId: Uuid.Uuid
  event: CommentWasAssignedADoi
}): Effect.Effect<void, ToDo, HandleCommentCommand | PublishCommentOnZenodo> =>
  Effect.gen(function* () {
    const handleCommand = yield* HandleCommentCommand
    const publishCommentOnZenodo = yield* PublishCommentOnZenodo

    yield* publishCommentOnZenodo(event.id)

    yield* Effect.mapError(
      handleCommand({
        commentId,
        command: new MarkCommentAsPublished(),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })
