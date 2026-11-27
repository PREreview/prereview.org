import { Effect } from 'effect'
import { ZenodoRecords } from '../../../ExternalInteractions/index.ts'
import type { Uuid } from '../../../types/index.ts'
import { GetComment } from '../Context.ts'
import * as Errors from '../Errors.ts'

export const WithdrawOnZenodo = Effect.fn('Comments.withdrawOnZenodo')(
  function* (commentId: Uuid.Uuid) {
    const getComment = yield* GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag !== 'CommentPublished') {
      return yield* new Errors.CommentHasNotBeenPublished()
    }

    yield* ZenodoRecords.withdrawRecordForComment(comment.id)
  },
  Effect.catchTag(
    ['UnableToQuery', 'CommentHasNotBeenPublished', 'FailedToWithdrawRecordForComment'],
    error => new Errors.UnableToWithdrawCommentOnZenodo({ cause: error }),
  ),
)
