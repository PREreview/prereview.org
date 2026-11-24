import { Layer, Schema, Struct } from 'effect'
import { Activity, Workflow } from 'effect/workflow'
import { Uuid } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'
import { AssignADoi as executeAssignCommentADoi } from './AssignADoi.ts'
import { CheckIfUserHasAVerifiedEmailAddress as executeCheckIfUserHasAVerifiedEmailAddress } from './CheckIfUserHasAVerifiedEmailAddress.ts'
import { PublishComment as executePublishComment } from './PublishComment.ts'

export const AssignCommentADoi = Workflow.make('AssignCommentADoi', {
  error: Errors.UnableToAssignADoi,
  payload: {
    commentId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('commentId'),
})

export const CheckIfUserHasAVerifiedEmailAddress = Workflow.make('CheckIfUserHasAVerifiedEmailAddress', {
  error: Errors.UnableToCheckForAVerifiedEmailAddress,
  payload: {
    commentId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('commentId'),
})

export const PublishComment = Workflow.make('PublishComment', {
  error: Errors.UnableToPublishComment,
  payload: {
    commentId: Uuid.UuidSchema,
    id: Schema.Number,
  },
  idempotencyKey: Struct.get('commentId'),
})

export const workflowsLayer = Layer.mergeAll(
  AssignCommentADoi.toLayer(({ commentId }) =>
    Activity.make({
      name: AssignCommentADoi._tag,
      error: AssignCommentADoi.errorSchema,
      execute: executeAssignCommentADoi(commentId),
    }),
  ),
  CheckIfUserHasAVerifiedEmailAddress.toLayer(({ commentId }) =>
    Activity.make({
      name: CheckIfUserHasAVerifiedEmailAddress._tag,
      error: CheckIfUserHasAVerifiedEmailAddress.errorSchema,
      execute: executeCheckIfUserHasAVerifiedEmailAddress(commentId),
    }),
  ),
  PublishComment.toLayer(({ commentId, id }) =>
    Activity.make({
      name: PublishComment._tag,
      error: PublishComment.errorSchema,
      execute: executePublishComment(commentId, id),
    }),
  ),
)
