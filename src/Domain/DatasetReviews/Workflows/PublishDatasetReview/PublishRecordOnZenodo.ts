import { Effect } from 'effect'
import { ZenodoRecords } from '../../../../ExternalInteractions/index.ts'
import type { Uuid } from '../../../../types/index.ts'
import * as Commands from '../../Commands/index.ts'
import * as Errors from '../../Errors.ts'

export const PublishRecordOnZenodo = Effect.fn('DatasetReviews.publishRecordOnZenodo')(
  function* (datasetReviewId: Uuid.Uuid, recordId: number) {
    yield* ZenodoRecords.publishRecord(recordId)

    yield* Commands.markRecordAsPublishedOnZenodo({ datasetReviewId })
    yield* Commands.markDoiAsActivated({ datasetReviewId })
  },
  Effect.catch(error => new Errors.FailedToPublishRecordOnZenodo({ cause: error })),
)
