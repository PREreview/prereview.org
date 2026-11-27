import { Effect } from 'effect'
import { ZenodoRecords } from '../../../../ExternalInteractions/index.ts'
import type { Uuid } from '../../../../types/index.ts'
import { Comments } from '../../Comments.ts'
import * as Errors from '../../Errors.ts'

export const CreateRecordOnZenodo = Effect.fn('Comments.publishCommentRecord.createRecordOnZenodo')(
  function* (commentId: Uuid.Uuid) {
    const data = yield* Comments.getDataForZenodoRecord(commentId)

    return yield* ZenodoRecords.createRecordForComment(data)
  },
  Effect.catchTag(
    [
      'CommentHasNotBeenStarted',
      'CommentIsIncomplete',
      'CommentWasAlreadyPublished',
      'CommentHasBeenWithdrawn',
      'DataForZenodoRecordIsUnavailable',
      'FailedToCreateRecordForComment',
    ],
    error => new Errors.UnableToPublishComment({ cause: error }),
  ),
)
