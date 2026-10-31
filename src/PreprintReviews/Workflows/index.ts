import { Activity, Workflow } from 'effect/workflow'
import { flow, Layer, Schema, Struct } from 'effect'
import * as Errors from '../Errors.ts'
import { NotifyCommunitySlack as executeNotifyCommunitySlackOfPreprintReview } from './NotifyCommunitySlack.ts'
import { NotifyPreprintServer as executeNotifyPreprintServerOfReview } from './NotifyPreprintServer.ts'
import { NotifyReviewRequestersOfReview as executeNotifyReviewRequestersOfReview } from './NotifyReviewRequestersOfReview.ts'

export const NotifyCommunitySlackOfPreprintReview = Workflow.make('NotifyCommunitySlackOfPreprintReview', {
  error: Errors.FailedToNotifyCommunitySlack,
  payload: {
    reviewId: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  },
  idempotencyKey: flow(Struct.get('reviewId'), String),
})

export const NotifyPreprintServerOfReview = Workflow.make('NotifyPreprintServerOfReview', {
  error: Errors.FailedToNotifyPreprintServer,
  payload: {
    reviewId: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  },
  idempotencyKey: flow(Struct.get('reviewId'), String),
})

export const NotifyReviewRequestersOfReview = Workflow.make('NotifyReviewRequestersOfReview', {
  error: Errors.FailedToNotifyReviewRequesters,
  payload: {
    reviewId: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  },
  idempotencyKey: flow(Struct.get('reviewId'), String),
})

export const workflowsLayer = Layer.mergeAll(
  NotifyCommunitySlackOfPreprintReview.toLayer(({ reviewId }) =>
    Activity.make({
      name: NotifyCommunitySlackOfPreprintReview._tag,
      error: NotifyCommunitySlackOfPreprintReview.errorSchema,
      execute: executeNotifyCommunitySlackOfPreprintReview(reviewId),
    }),
  ),
  NotifyPreprintServerOfReview.toLayer(({ reviewId }) =>
    Activity.make({
      name: NotifyPreprintServerOfReview._tag,
      error: NotifyPreprintServerOfReview.errorSchema,
      execute: executeNotifyPreprintServerOfReview(reviewId),
    }),
  ),
  NotifyReviewRequestersOfReview.toLayer(({ reviewId }) =>
    Activity.make({
      name: NotifyReviewRequestersOfReview._tag,
      error: NotifyReviewRequestersOfReview.errorSchema,
      execute: executeNotifyReviewRequestersOfReview(reviewId),
    }),
  ),
)
