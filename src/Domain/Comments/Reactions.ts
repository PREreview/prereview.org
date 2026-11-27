import { EventSubscription } from '../Events/index.ts'
import * as Workflows from './Workflows/index.ts'

export const reactionsWorker = EventSubscription.make('Comments/Reactions', {
  CommentWasStarted: ({ commentId }) =>
    Workflows.CheckIfUserHasAVerifiedEmailAddress.execute({ commentId }, { discard: true }),
  PublicationOfCommentWasRequested: ({ commentId }) =>
    // oxlint-disable-next-line import/namespace
    Workflows.PublishCommentRecord.execute({ commentId }, { discard: true }),
  CommentWasWithdrawn: ({ commentId }) => Workflows.WithdrawCommentOnZenodo.execute({ commentId }, { discard: true }),
})
