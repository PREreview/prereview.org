import { Effect, Schema, Struct } from 'effect'
import { Activity, Workflow } from 'effect/workflow'
import { UuidSchema } from '../../../../types/Uuid.ts'
import * as Errors from '../../Errors.ts'
import { CreateRecordOnZenodo } from '../CreateRecordOnZenodo.ts'
import { UseZenodoRecordDoi } from '../UseZenodoRecordDoi.ts'

export const PublishDatasetReview = Workflow.make('PublishDatasetReview', {
  error: Errors.FailedToPublishDatasetReview,
  payload: {
    datasetReviewId: UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
}).annotate(Workflow.SuspendOnFailure, true)

export const layer = PublishDatasetReview.toLayer(
  Effect.fn('PublishDatasetReview')(
    function* ({ datasetReviewId }) {
      yield* Effect.annotateLogsScoped({ datasetReviewId })

      const recordId = yield* Activity.make({
        name: 'CreateRecordOnZenodo',
        error: Errors.FailedToCreateRecordOnZenodo,
        success: Schema.Int,
        execute: CreateRecordOnZenodo(datasetReviewId),
      })

      yield* Activity.make({
        name: 'UseZenodoRecordDoi',
        error: Errors.FailedToUseZenodoDoi,
        execute: UseZenodoRecordDoi(datasetReviewId, recordId),
      })

      return yield* new Errors.FailedToPublishDatasetReview({ cause: 'incomplete' })
    },
    Effect.tapError(error => Effect.logError('Failed to publish dataset review').pipe(Effect.annotateLogs({ error }))),
    Effect.mapError(error => new Errors.FailedToPublishDatasetReview({ cause: error })),
  ),
)
