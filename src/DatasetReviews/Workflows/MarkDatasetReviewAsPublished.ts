import { Effect } from 'effect'
import { Temporal, type Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'

export const MarkDatasetReviewAsPublished = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    const publicationDate = yield* Temporal.currentPlainDate

    yield* Commands.markDatasetReviewAsPublished({ datasetReviewId, publicationDate })
  },
  Effect.catchAll(error => new Errors.FailedToMarkDatasetReviewAsPublished({ cause: error })),
)
