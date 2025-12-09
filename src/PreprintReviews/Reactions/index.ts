import { Activity, Workflow } from '@effect/workflow'
import { flow, Layer, Schema, Struct } from 'effect'
import * as Errors from '../Errors.ts'
import { NotifyPreprintServer as executeNotifyPreprintServerOfReview } from './NotifyPreprintServer.ts'

export const NotifyPreprintServerOfReview = Workflow.make({
  name: 'NotifyPreprintServerOfReview',
  error: Errors.FailedToNotifyPreprintServer,
  payload: {
    reviewId: Schema.NonNegativeInt,
  },
  idempotencyKey: flow(Struct.get('reviewId'), String),
})

export const workflowsLayer = Layer.mergeAll(
  NotifyPreprintServerOfReview.toLayer(({ reviewId }) =>
    Activity.make({
      name: NotifyPreprintServerOfReview.name,
      error: NotifyPreprintServerOfReview.errorSchema,
      execute: executeNotifyPreprintServerOfReview(reviewId),
    }),
  ),
)
