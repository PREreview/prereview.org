import * as EventSubscription from '../../EventSubscription.ts'
import * as Workflows from './Workflows/index.ts'

export const reactionsWorker = EventSubscription.make('AuthorInvites/Reactions', {
  DatasetReviewWasPublished: event =>
    Workflows.SendAuthorInviteEmails.execute({ reviewId: event.datasetReviewId }, { discard: true }),
})
