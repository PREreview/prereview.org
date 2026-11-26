import { Layer, Struct } from 'effect'
import { Activity, Workflow } from 'effect/workflow'
import { Uuid } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'
import { NotifyCommunitySlack as executeNotifyCommunitySlackOfDatasetReview } from './NotifyCommunitySlack.ts'
import * as PublishDatasetReview from './PublishDatasetReview/index.ts'

export { PublishDatasetReview } from './PublishDatasetReview/index.ts'

export const NotifyCommunitySlackOfDatasetReview = Workflow.make('NotifyCommunitySlackOfDatasetReview', {
  error: Errors.FailedToNotifyCommunitySlack,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

export const workflowsLayer = Layer.mergeAll(
  PublishDatasetReview.layer,
  NotifyCommunitySlackOfDatasetReview.toLayer(({ datasetReviewId }) =>
    Activity.make({
      name: NotifyCommunitySlackOfDatasetReview._tag,
      error: NotifyCommunitySlackOfDatasetReview.errorSchema,
      execute: executeNotifyCommunitySlackOfDatasetReview(datasetReviewId),
    }),
  ),
)
