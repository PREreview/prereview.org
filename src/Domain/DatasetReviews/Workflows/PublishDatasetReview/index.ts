import { Effect, Struct } from 'effect'
import { Activity, Workflow } from 'effect/workflow'
import { UuidSchema } from '../../../../types/Uuid.ts'
import * as Errors from '../../Errors.ts'
import { CreateRecordOnZenodo } from '../CreateRecordOnZenodo.ts'

export const PublishDatasetReview = Workflow.make('PublishDatasetReview', {
  error: Errors.FailedToPublishDatasetReview,
  payload: {
    datasetReviewId: UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

export const layer = PublishDatasetReview.toLayer(
  Effect.fn('PublishDatasetReview')(
    function* ({ datasetReviewId }) {
      yield* Activity.make({
        name: 'CreateRecordOnZenodo',
        error: Errors.FailedToCreateRecordOnZenodo,
        execute: CreateRecordOnZenodo(datasetReviewId),
      })

      return yield* new Errors.FailedToPublishDatasetReview({ cause: 'incomplete' })
    },
    Effect.catchTag('FailedToCreateRecordOnZenodo', error => new Errors.FailedToPublishDatasetReview({ cause: error })),
  ),
)
