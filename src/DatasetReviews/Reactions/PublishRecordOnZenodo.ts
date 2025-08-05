import { Effect } from 'effect'
import type { Uuid } from '../../types/index.js'
import * as Zenodo from '../../Zenodo/index.js'
import * as Commands from '../Commands/index.js'
import * as Errors from '../Errors.js'
import * as Queries from '../Queries/index.js'

export const PublishRecordOnZenodo = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    const recordId = yield* Queries.getZenodoRecordId(datasetReviewId)

    yield* Zenodo.publishRecord(recordId)

    yield* Effect.all(
      [Commands.markRecordAsPublishedOnZenodo({ datasetReviewId }), Commands.markDoiAsActivated({ datasetReviewId })],
      { concurrency: 'inherit' },
    )
  },
  Effect.catchAll(error => new Errors.FailedToPublishRecordOnZenodo({ cause: error })),
)
