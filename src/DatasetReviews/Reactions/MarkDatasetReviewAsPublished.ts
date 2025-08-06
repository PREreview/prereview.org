import { Effect } from 'effect'
import { Temporal, type Uuid } from '../../types/index.js'
import * as Commands from '../Commands/index.js'
import * as Errors from '../Errors.js'

export const MarkDatasetReviewAsPublished = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    const publicationDate = yield* Temporal.currentPlainDate

    yield* Commands.markDatasetReviewAsPublished({ datasetReviewId, publicationDate })
  },
  Effect.catchAll(error => new Errors.FailedToMarkDatasetReviewAsPublished({ cause: error })),
)
