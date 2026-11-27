import { Effect } from 'effect'
import type { Temporal, Uuid } from '../../../../types/index.ts'
import { MarkCommentAsPublished } from '../../Commands.ts'
import { HandleCommentCommand } from '../../Context.ts'
import * as Errors from '../../Errors.ts'

export const RecordPublication = Effect.fn('Comments.publishCommentRecord.recordPublication')(
  function* (commentId: Uuid.Uuid, publishedAt: Temporal.Instant) {
    const handleCommand = yield* HandleCommentCommand

    yield* handleCommand(new MarkCommentAsPublished({ commentId, publishedAt }))
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
