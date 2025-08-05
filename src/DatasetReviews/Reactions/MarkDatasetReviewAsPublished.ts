import { Effect } from 'effect'
import type { Uuid } from '../../types/index.js'
import * as Commands from '../Commands/index.js'
import * as Errors from '../Errors.js'

export const MarkDatasetReviewAsPublished = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    yield* Commands.markDatasetReviewAsPublished({ datasetReviewId })
  },
  Effect.catchAll(error => new Errors.FailedToMarkDatasetReviewAsPublished({ cause: error })),
)
