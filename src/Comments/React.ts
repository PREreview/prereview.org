import { Effect } from 'effect'
import type { Uuid } from '../types/index.js'
import { ConfirmExistenceOfVerifiedEmailAddress, MarkCommentAsPublished, MarkDoiAsAssigned } from './Commands.js'
import {
  CreateRecordOnZenodoForComment,
  DoesUserHaveAVerifiedEmailAddress,
  GetComment,
  HandleCommentCommand,
  type InputForCommentZenodoRecord,
  PublishCommentWithADoi,
  UnableToHandleCommand,
} from './Context.js'
import type { DoiWasAssigned } from './Events.js'

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
}: {
  commentId: Uuid.Uuid
  inputForCommentZenodoRecord: InputForCommentZenodoRecord
}): Effect.Effect<void, ToDo, GetComment | HandleCommentCommand | CreateRecordOnZenodoForComment> =>
  Effect.gen(function* () {
    const getComment = yield* GetComment
    const handleCommand = yield* HandleCommentCommand
    const createRecordOnZenodoForComment = yield* CreateRecordOnZenodoForComment

    const comment = yield* getComment(commentId)

    if (comment._tag !== 'CommentBeingPublished') {
      return
    }

    const [doi, id] = yield* createRecordOnZenodoForComment(comment)

    yield* Effect.mapError(
      handleCommand({
        commentId,
        command: new MarkDoiAsAssigned({ doi, id }),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })

export const PublishCommentWhenDoiWasAssigned = ({
  commentId,
  event,
}: {
  commentId: Uuid.Uuid
  event: DoiWasAssigned
}): Effect.Effect<void, ToDo, HandleCommentCommand | PublishCommentWithADoi> =>
  Effect.gen(function* () {
    const handleCommand = yield* HandleCommentCommand
    const publishComment = yield* PublishCommentWithADoi

    yield* publishComment(event.id)

    yield* Effect.mapError(
      handleCommand({
        commentId,
        command: new MarkCommentAsPublished(),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })
