import { Effect } from 'effect'
import { EventSubscription } from '../Events/index.ts'
import * as Workflows from './Workflows/index.ts'

export const reactionsWorker = EventSubscription.make('ReviewRequests/Reactions', {
  ReviewRequestForAPreprintWasPublished: event =>
    Effect.all(
      [
        Workflows.CategorizeReviewRequest.execute(event, { discard: true }),
        Workflows.NotifyCommunitySlackOfReviewRequest.execute(event, { discard: true }),
      ],
      { concurrency: 'unbounded' },
    ),
  ReviewRequestForAPreprintWasAccepted: event =>
    Effect.all(
      [
        Workflows.AcknowledgeReviewRequest.execute(event, { discard: true }),
        Workflows.CategorizeReviewRequest.execute(event, { discard: true }),
        Workflows.NotifyCommunitySlackOfReviewRequest.execute(event, { discard: true }),
      ],
      { concurrency: 'unbounded' },
    ),
  ReviewRequestByAPrereviewerWasImported: event => Workflows.CategorizeReviewRequest.execute(event, { discard: true }),
  ReviewRequestFromAPreprintServerWasImported: event =>
    Workflows.CategorizeReviewRequest.execute(event, { discard: true }),
  ReviewRequestForAPreprintWasReceived: event =>
    Workflows.ProcessReceivedReviewRequest.execute(event, { discard: true }),
})
