import { Effect } from 'effect'
import type { Doi } from '../../../../types/Doi.ts'
import type { Uuid } from '../../../../types/index.ts'
import { MarkDoiAsAssigned } from '../../Commands.ts'
import { HandleCommentCommand } from '../../Context.ts'
import * as Errors from '../../Errors.ts'

export const RecordAssignedDoi = Effect.fn('Comments.publishCommentRecord.recordAssignedDoi')(
  function* (commentId: Uuid.Uuid, doi: Doi, id: number) {
    const handleCommand = yield* HandleCommentCommand

    yield* handleCommand(new MarkDoiAsAssigned({ commentId, doi, id }))
  },
  Effect.catchTag(
    [
      'UnableToHandleCommand',
      'CommentWasAlreadyStarted',
      'CommentHasNotBeenStarted',
      'CommentIsIncomplete',
      'CommentIsBeingPublished',
      'DoiIsNotAssigned',
      'DoiIsAlreadyAssigned',
      'CommentWasAlreadyPublished',
    ],
    error => new Errors.UnableToPublishComment({ cause: error }),
  ),
)
