import { Effect } from 'effect'
import { ZenodoRecords } from '../../../../ExternalInteractions/index.ts'
import { Temporal } from '../../../../types/index.ts'
import * as Errors from '../../Errors.ts'

export const PublishRecordOnZenodo = Effect.fn('Comments.publishCommentRecord.publishRecordOnZenodo')(
  function* (recordId: number) {
    yield* ZenodoRecords.publishRecordForComment(recordId)

    return yield* Temporal.currentInstant
  },
  Effect.catchTag('FailedToPublishRecordForComment', error => new Errors.UnableToPublishComment({ cause: error })),
)
