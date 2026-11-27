import { EventSubscription } from '../Events/index.ts'
import * as Workflows from './Workflows/index.ts'

export const reactionsWorker = EventSubscription.make('Comments/Reactions', {
  CommentWasStarted: ({ commentId }) =>
    Workflows.CheckIfUserHasAVerifiedEmailAddress.execute({ commentId }, { discard: true }),
  PublicationOfCommentWasRequested: ({ commentId }) =>
    Workflows.AssignCommentADoi.execute({ commentId }, { discard: true }),
  CommentWasAssignedADoi: ({ commentId, id }) => Workflows.PublishComment.execute({ commentId, id }, { discard: true }),
  CommentWasWithdrawn: ({ commentId }) => Workflows.WithdrawCommentOnZenodo.execute({ commentId }, { discard: true }),
})
