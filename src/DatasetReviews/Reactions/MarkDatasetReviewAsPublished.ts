import { Effect } from 'effect'
import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const MarkDatasetReviewAsPublished = Effect.fn(function* (datasetReviewId: Uuid.Uuid) {
  return yield* new Errors.FailedToMarkDatasetReviewAsPublished({ cause: 'not implemented' })
})
