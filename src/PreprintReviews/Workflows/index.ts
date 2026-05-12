import { Activity, Workflow } from '@effect/workflow'
import { flow, Layer, Schema, Struct } from 'effect'
import * as Errors from '../Errors.ts'
import { NotifyCommunitySlack as executeNotifyCommunitySlackOfPreprintReview } from './NotifyCommunitySlack.ts'
import { NotifyPreprintServer as executeNotifyPreprintServerOfReview } from './NotifyPreprintServer.ts'
import { NotifyReviewRequestersOfReview as executeNotifyReviewRequestersOfReview } from './NotifyReviewRequestersOfReview.ts'

export const NotifyCommunitySlackOfPreprintReview = Workflow.make({
  name: 'NotifyCommunitySlackOfPreprintReview',
  error: Errors.FailedToNotifyCommunitySlack,
  payload: {
    reviewId: Schema.NonNegativeInt,
  },
  idempotencyKey: flow(Struct.get('reviewId'), String),
})

export const NotifyPreprintServerOfReview = Workflow.make({
  name: 'NotifyPreprintServerOfReview',
  error: Errors.FailedToNotifyPreprintServer,
  payload: {
    reviewId: Schema.NonNegativeInt,
  },
  idempotencyKey: flow(Struct.get('reviewId'), String),
})

export const NotifyReviewRequestersOfReview = Workflow.make({
  name: 'NotifyReviewRequestersOfReview',
  error: Errors.FailedToNotifyReviewRequesters,
  payload: {
    reviewId: Schema.NonNegativeInt,
  },
  idempotencyKey: flow(Struct.get('reviewId'), String),
})

export const workflowsLayer = Layer.mergeAll(
  NotifyCommunitySlackOfPreprintReview.toLayer(({ reviewId }) =>
    Activity.make({
      name: NotifyCommunitySlackOfPreprintReview.name,
      error: NotifyCommunitySlackOfPreprintReview.errorSchema,
      execute: executeNotifyCommunitySlackOfPreprintReview(reviewId),
    }),
  ),
  NotifyPreprintServerOfReview.toLayer(({ reviewId }) =>
    Activity.make({
      name: NotifyPreprintServerOfReview.name,
      error: NotifyPreprintServerOfReview.errorSchema,
      execute: executeNotifyPreprintServerOfReview(reviewId),
    }),
  ),
  NotifyReviewRequestersOfReview.toLayer(({ reviewId }) =>
    Activity.make({
      name: NotifyReviewRequestersOfReview.name,
      error: NotifyReviewRequestersOfReview.errorSchema,
      execute: executeNotifyReviewRequestersOfReview(reviewId),
    }),
  ),
)
