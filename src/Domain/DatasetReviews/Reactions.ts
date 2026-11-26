import { EventSubscription } from '../Events/index.ts'
import * as Workflows from './Workflows/index.ts'

export const reactionsWorker = EventSubscription.make('DatasetReviews/Reactions', {
  // oxlint-disable-next-line import/namespace
  PublicationOfDatasetReviewWasRequested: event => Workflows.PublishDatasetReview.execute(event, { discard: true }),
  DatasetReviewWasPublished: event => Workflows.NotifyCommunitySlackOfDatasetReview.execute(event, { discard: true }),
})
