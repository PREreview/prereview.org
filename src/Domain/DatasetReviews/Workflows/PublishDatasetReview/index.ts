import { Effect, Struct } from 'effect'
import { Workflow } from 'effect/workflow'
import { UuidSchema } from '../../../../types/Uuid.ts'
import * as Errors from '../../Errors.ts'

export const PublishDatasetReview = Workflow.make('PublishDatasetReview', {
  error: Errors.FailedToPublishDatasetReview,
  payload: {
    datasetReviewId: UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

export const layer = PublishDatasetReview.toLayer(
  Effect.fn('PublishDatasetReview')(function* () {
    return yield* new Errors.FailedToPublishDatasetReview({ cause: 'not implemented' })
  }),
)
