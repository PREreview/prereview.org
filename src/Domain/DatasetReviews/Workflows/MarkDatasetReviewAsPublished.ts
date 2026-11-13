import { Effect } from 'effect'
import { Temporal, type Uuid } from '../../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'

export const MarkDatasetReviewAsPublished = Effect.fn('DatasetReviews.markDatasetReviewAsPublished')(
  function* (datasetReviewId: Uuid.Uuid) {
    const publicationDate = yield* Temporal.currentInstant

    yield* Commands.markDatasetReviewAsPublished({ datasetReviewId, publicationDate })
  },
  Effect.catch(error => new Errors.FailedToMarkDatasetReviewAsPublished({ cause: error })),
)
