import { Effect, Schema, Struct } from 'effect'
import { Activity, Workflow } from 'effect/workflow'
import { ZenodoRecords } from '../../../../ExternalInteractions/index.ts'
import { DoiSchema } from '../../../../types/Doi.ts'
import { UuidSchema } from '../../../../types/Uuid.ts'
import { Temporal } from '../../../../types/index.ts'
import * as Commands from '../../Commands/index.ts'
import * as Errors from '../../Errors.ts'
import { CreateRecordOnZenodo } from '../CreateRecordOnZenodo.ts'

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

      const { recordId, doi } = yield* Activity.make({
        name: 'CreateRecordOnZenodo',
        error: Errors.FailedToCreateRecordOnZenodo,
        success: Schema.Struct({ recordId: Schema.Int, doi: DoiSchema }),
        execute: CreateRecordOnZenodo(datasetReviewId),
      })

      yield* Commands.markDoiAsAssigned({ doi, datasetReviewId })

      const publicationDate = yield* Temporal.currentInstant
      yield* Commands.markDatasetReviewAsPublished({ datasetReviewId, publicationDate })

      yield* Activity.make({
        name: 'PublishRecordOnZenodo',
        error: Schema.ErrorInstance(),
        execute: ZenodoRecords.publishRecord(recordId),
      })

      yield* Commands.markRecordAsPublishedOnZenodo({ datasetReviewId })

      yield* Commands.markDoiAsActivated({ datasetReviewId })
    },
    Effect.tapError(error => Effect.logError('Failed to publish dataset review').pipe(Effect.annotateLogs({ error }))),
    Effect.mapError(error => new Errors.FailedToPublishDatasetReview({ cause: error })),
  ),
)
