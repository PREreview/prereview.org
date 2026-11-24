import { Effect, pipe } from 'effect'
import type { UnableToHandleCommand } from '../../Commands.ts'
import type { Uuid } from '../../types/index.ts'
import { MarkDoiAsAssigned } from './Commands.ts'
import { CreateRecordOnZenodoForComment, HandleCommentCommand, type InputForCommentZenodoRecord } from './Context.ts'
import type { CommentError, UnableToAssignADoi } from './Errors.ts'

export const AssignCommentADoiWhenPublicationWasRequested: (input: {
  commentId: Uuid.Uuid
  inputForCommentZenodoRecord: InputForCommentZenodoRecord
}) => Effect.Effect<
  void,
  UnableToHandleCommand | CommentError | UnableToAssignADoi,
  HandleCommentCommand | CreateRecordOnZenodoForComment
> = Effect.fn('Comments.assignCommentADoiWhenPublicationWasRequested')(function* ({
  commentId,
  inputForCommentZenodoRecord,
}) {
  const handleCommand = yield* HandleCommentCommand
  const createRecordOnZenodoForComment = yield* CreateRecordOnZenodoForComment

  yield* pipe(
    inputForCommentZenodoRecord,
    createRecordOnZenodoForComment,
    Effect.andThen(([doi, id]) => handleCommand(new MarkDoiAsAssigned({ commentId, doi, id }))),
  )
})
