import { Activity, Workflow } from 'effect/workflow'
import { Layer, Schema, Struct } from 'effect'
import { Uuid } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'
import { CreateRecordOnZenodo as executeCreateRecordForDatasetReviewOnZenodo } from './CreateRecordOnZenodo.ts'
import { MarkDatasetReviewAsPublished as executeMarkDatasetReviewAsPublished } from './MarkDatasetReviewAsPublished.ts'
import { NotifyCommunitySlack as executeNotifyCommunitySlackOfDatasetReview } from './NotifyCommunitySlack.ts'
import { PublishRecordOnZenodo as executePublishDatasetReviewRecordOnZenodo } from './PublishRecordOnZenodo.ts'
import { UseZenodoRecordDoi as executeUseZenodoRecordDoiForDatasetReview } from './UseZenodoRecordDoi.ts'

export const CreateRecordForDatasetReviewOnZenodo = Workflow.make('CreateRecordForDatasetReviewOnZenodo', {
  error: Errors.FailedToCreateRecordOnZenodo,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

export const MarkDatasetReviewAsPublished = Workflow.make('MarkDatasetReviewAsPublished', {
  error: Errors.FailedToMarkDatasetReviewAsPublished,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

export const NotifyCommunitySlackOfDatasetReview = Workflow.make('NotifyCommunitySlackOfDatasetReview', {
  error: Errors.FailedToNotifyCommunitySlack,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

export const PublishDatasetReviewRecordOnZenodo = Workflow.make('PublishDatasetReviewRecordOnZenodo', {
  error: Errors.FailedToPublishRecordOnZenodo,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

export const UseZenodoRecordDoiForDatasetReview = Workflow.make('UseZenodoRecordDoiForDatasetReview', {
  error: Errors.FailedToUseZenodoDoi,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
    recordId: Schema.Number,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

export const workflowsLayer = Layer.mergeAll(
  CreateRecordForDatasetReviewOnZenodo.toLayer(({ datasetReviewId }) =>
    Activity.make({
      name: CreateRecordForDatasetReviewOnZenodo._tag,
      error: CreateRecordForDatasetReviewOnZenodo.errorSchema,
      execute: executeCreateRecordForDatasetReviewOnZenodo(datasetReviewId),
    }),
  ),
  MarkDatasetReviewAsPublished.toLayer(({ datasetReviewId }) =>
    Activity.make({
      name: MarkDatasetReviewAsPublished._tag,
      error: MarkDatasetReviewAsPublished.errorSchema,
      execute: executeMarkDatasetReviewAsPublished(datasetReviewId),
    }),
  ),
  NotifyCommunitySlackOfDatasetReview.toLayer(({ datasetReviewId }) =>
    Activity.make({
      name: NotifyCommunitySlackOfDatasetReview._tag,
      error: NotifyCommunitySlackOfDatasetReview.errorSchema,
      execute: executeNotifyCommunitySlackOfDatasetReview(datasetReviewId),
    }),
  ),
  PublishDatasetReviewRecordOnZenodo.toLayer(({ datasetReviewId }) =>
    Activity.make({
      name: PublishDatasetReviewRecordOnZenodo._tag,
      error: PublishDatasetReviewRecordOnZenodo.errorSchema,
      execute: executePublishDatasetReviewRecordOnZenodo(datasetReviewId),
    }),
  ),
  UseZenodoRecordDoiForDatasetReview.toLayer(({ datasetReviewId, recordId }) =>
    Activity.make({
      name: UseZenodoRecordDoiForDatasetReview._tag,
      error: UseZenodoRecordDoiForDatasetReview.errorSchema,
      execute: executeUseZenodoRecordDoiForDatasetReview(datasetReviewId, recordId),
    }),
  ),
)
