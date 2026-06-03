import { Effect } from 'effect'
import { ZenodoRecords } from '../../ExternalInteractions/index.ts'
import type { Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const PublishRecordOnZenodo = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    const recordId = yield* Queries.getZenodoRecordId(datasetReviewId)

    yield* ZenodoRecords.publishRecord(recordId)

    yield* Commands.markRecordAsPublishedOnZenodo({ datasetReviewId })
    yield* Commands.markDoiAsActivated({ datasetReviewId })
  },
  Effect.catchAll(error => new Errors.FailedToPublishRecordOnZenodo({ cause: error })),
)
