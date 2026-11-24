import { Effect } from 'effect'
import * as EventSubscription from '../../EventSubscription.ts'
import * as Workflows from './Workflows/index.ts'

export const reactionsWorker = EventSubscription.make('DatasetReviews/Reactions', {
  PublicationOfDatasetReviewWasRequested: event =>
    Workflows.CreateRecordForDatasetReviewOnZenodo.execute(event, { discard: true }),
  ZenodoRecordForDatasetReviewWasCreated: event =>
    Workflows.UseZenodoRecordDoiForDatasetReview.execute(event, { discard: true }),
  DatasetReviewWasAssignedADoi: event => Workflows.MarkDatasetReviewAsPublished.execute(event, { discard: true }),
  DatasetReviewWasPublished: event =>
    Effect.all([
      Workflows.PublishDatasetReviewRecordOnZenodo.execute(event, { discard: true }),
      Workflows.NotifyCommunitySlackOfDatasetReview.execute(event, { discard: true }),
    ]),
})
